import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import github, insights
from .classifier import classify_repository, portfolio_overview
from .models import InsightResult, Profile, ProfileAnalysis

app = FastAPI(title="GitHub Portfolio Analyzer")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "").strip().rstrip("/")
if frontend_origin:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[frontend_origin],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

ERRORS = {
    "INVALID_PROFILE_INPUT": (400, "Enter a valid GitHub username or profile URL."),
    "PROFILE_NOT_FOUND": (404, "That GitHub profile was not found."),
    "GITHUB_RATE_LIMITED": (429, "GitHub's request limit was reached. Please try again later."),
    "GITHUB_UNAVAILABLE": (503, "GitHub is unavailable. Please try again later."),
    "GITHUB_TIMEOUT": (504, "GitHub did not respond in time. Please try again."),
    "INVALID_SELECTION": (400, "Select one to three distinct repositories from this profile."),
    "INSUFFICIENT_EVIDENCE": (422, "The selected repositories do not contain enough public detail for supported insights."),
    "AI_NOT_CONFIGURED": (503, "AI insights are not configured yet. The factual profile remains available."),
    "AI_CREDENTIALS_REJECTED": (503, "The configured AI credentials were rejected. The factual profile remains available."),
    "AI_UNAVAILABLE": (503, "AI insights are unavailable right now. Please try again later."),
}


@app.get("/api/profile", response_model=ProfileAnalysis)
async def get_profile(request: Request):
    value = request.query_params.get("input", "")
    try:
        username = github.normalize_username(value)
    except ValueError:
        return error_response("INVALID_PROFILE_INPUT")
    try:
        user = await github.get_json(f"/users/{username}")
        raw_repositories = await github.get_json(
            f"/users/{username}/repos",
            {"type": "owner", "sort": "updated", "direction": "desc", "per_page": 100, "page": 1},
        )
    except github.GitHubError as error:
        return error_response(error.code)

    repositories = [github.normalize_repository(raw) for raw in raw_repositories[:100] if not raw.get("private")]
    for repository in repositories:
        repository.estimated_category = classify_repository(repository)
    profile = Profile(username=user["login"], display_name=user.get("name"),
                      avatar_url=user.get("avatar_url"), profile_url=user["html_url"],
                      reported_public_repos=user.get("public_repos") or 0)
    return ProfileAnalysis(
        profile=profile, repositories=repositories, analyzed_count=len(repositories),
        is_subset=profile.reported_public_repos > len(repositories),
        statistics=github.build_statistics(repositories), timeline=github.build_timeline(repositories),
        portfolio_overview=portfolio_overview(repositories),
    )


@app.post("/api/insights", response_model=InsightResult)
async def generate_insights(request: Request):
    try:
        body = await request.json()
    except ValueError:
        return error_response("INVALID_SELECTION")
    if not isinstance(body, dict):
        return error_response("INVALID_SELECTION")
    try:
        username = github.normalize_username(body.get("username", ""))
    except (ValueError, AttributeError, TypeError):
        return error_response("INVALID_PROFILE_INPUT")
    identifiers = body.get("repository_ids")
    if not isinstance(identifiers, list) or not 1 <= len(identifiers) <= 3 or any(
        type(identifier) is not int for identifier in identifiers
    ) or len(set(identifiers)) != len(identifiers):
        return error_response("INVALID_SELECTION")
    try:
        await github.get_json(f"/users/{username}")
        raw_repositories = await github.get_json(
            f"/users/{username}/repos",
            {"type": "owner", "sort": "updated", "direction": "desc", "per_page": 100, "page": 1},
        )
        repositories = [github.normalize_repository(raw) for raw in raw_repositories[:100]
                        if not raw.get("private")]
        selected = github.validate_selection(identifiers, repositories)
        readmes = await github.prepare_selected_readmes(username, identifiers, repositories)
    except github.InvalidSelection:
        return error_response("INVALID_SELECTION")
    except github.GitHubError as error:
        return error_response(error.code)
    if not insights.has_substantive_evidence(selected, readmes):
        return error_response("INSUFFICIENT_EVIDENCE")
    try:
        return await insights.generate(selected, readmes)
    except insights.InsightError as error:
        return error_response(error.code)


def error_response(code: str) -> JSONResponse:
    status, message = ERRORS[code]
    return JSONResponse(status_code=status, content={"code": code, "message": message})
