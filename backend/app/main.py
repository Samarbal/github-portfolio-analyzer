from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from . import github
from .classifier import classify_repository, portfolio_overview
from .models import Profile, ProfileAnalysis

app = FastAPI(title="GitHub Portfolio Analyzer")

ERRORS = {
    "INVALID_PROFILE_INPUT": (400, "Enter a valid GitHub username or profile URL."),
    "PROFILE_NOT_FOUND": (404, "That GitHub profile was not found."),
    "GITHUB_RATE_LIMITED": (429, "GitHub's request limit was reached. Please try again later."),
    "GITHUB_UNAVAILABLE": (503, "GitHub is unavailable. Please try again later."),
    "GITHUB_TIMEOUT": (504, "GitHub did not respond in time. Please try again."),
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


def error_response(code: str) -> JSONResponse:
    status, message = ERRORS[code]
    return JSONResponse(status_code=status, content={"code": code, "message": message})
