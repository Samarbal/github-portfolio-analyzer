import asyncio

import httpx
import pytest

from app import github
from app.main import app


def profile_get(path, params=None):
    async def request():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.get(path, params=params)

    return asyncio.run(request())


USER = {"login": "octocat", "name": "Octo Cat", "avatar_url": None,
        "html_url": "https://github.com/octocat", "public_repos": 101}
REPO = {"id": 1, "name": "sample-api", "html_url": "https://github.com/octocat/sample-api",
        "description": "A small API", "topics": ["api"], "language": "Python",
        "stargazers_count": 3, "fork": True, "created_at": "2024-01-02T00:00:00Z",
        "updated_at": "2025-01-02T00:00:00Z", "private": False}


@pytest.fixture
def calls(monkeypatch):
    seen = []

    async def fake_get(path, params=None):
        seen.append((path, params))
        if path == "/users/octocat":
            return USER
        if path == "/users/octocat/repos":
            return [REPO]
        raise AssertionError(f"Unexpected outbound request: {path}")

    monkeypatch.setattr(github, "get_json", fake_get)
    return seen


@pytest.mark.parametrize("value", ["octocat", "https://github.com/octocat", "https://github.com/octocat/"])
def test_profile_input_forms(value, calls):
    result = profile_get("/api/profile", params={"input": value})
    assert result.status_code == 200
    body = result.json()
    assert body["profile"]["username"] == "octocat"
    assert body["repositories"][0]["fork"] is True
    assert body["analyzed_count"] == 1
    assert body["is_subset"] is True
    assert body["repository_order"] == "updated_desc"
    assert len(calls) == 2
    assert calls[1][1] == {"type": "owner", "sort": "updated", "direction": "desc", "per_page": 100, "page": 1}


@pytest.mark.parametrize("value", ["", "bad user", "https://example.com/octocat", "https://github.com/octocat/repo"])
def test_invalid_input_never_calls_github(value, calls):
    result = profile_get("/api/profile", params={"input": value})
    assert result.status_code == 400
    assert result.json()["code"] == "INVALID_PROFILE_INPUT"
    assert calls == []


@pytest.mark.parametrize("error,status,code", [
    (github.GitHubError("PROFILE_NOT_FOUND"), 404, "PROFILE_NOT_FOUND"),
    (github.GitHubError("GITHUB_RATE_LIMITED"), 429, "GITHUB_RATE_LIMITED"),
    (github.GitHubError("GITHUB_TIMEOUT"), 504, "GITHUB_TIMEOUT"),
    (github.GitHubError("GITHUB_UNAVAILABLE"), 503, "GITHUB_UNAVAILABLE"),
])
def test_github_errors(monkeypatch, error, status, code):
    async def fail(path, params=None):
        raise error

    monkeypatch.setattr(github, "get_json", fail)
    result = profile_get("/api/profile?input=octocat")
    assert result.status_code == status
    assert result.json()["code"] == code
    assert "repositories" not in result.json()


def test_repository_failure_is_not_partial(monkeypatch):
    async def fail_repos(path, params=None):
        if path.endswith("/repos"):
            raise github.GitHubError("GITHUB_UNAVAILABLE")
        return USER

    monkeypatch.setattr(github, "get_json", fail_repos)
    result = profile_get("/api/profile?input=octocat")
    assert result.status_code == 503
    assert "repositories" not in result.json()


def test_overview_uses_only_lookup_requests(calls):
    result = profile_get("/api/profile?input=octocat")
    assert result.status_code == 200
    assert result.json()["portfolio_overview"]["category_counts"]["API or service"] == 1
    assert [path for path, _ in calls] == ["/users/octocat", "/users/octocat/repos"]
    assert all("readme" not in path.lower() for path, _ in calls)


@pytest.mark.parametrize("status,headers,code", [
    (404, {}, "PROFILE_NOT_FOUND"),
    (403, {"X-RateLimit-Remaining": "0"}, "GITHUB_RATE_LIMITED"),
    (429, {}, "GITHUB_RATE_LIMITED"),
    (500, {}, "GITHUB_UNAVAILABLE"),
])
def test_github_http_mapping(monkeypatch, status, headers, code):
    transport = httpx.MockTransport(lambda request: httpx.Response(status, headers=headers))
    monkeypatch.setattr(github, "make_client", lambda: httpx.AsyncClient(transport=transport, base_url="https://api.github.com"))
    with pytest.raises(github.GitHubError) as caught:
        asyncio.run(github.get_json("/users/octocat"))
    assert caught.value.code == code


def test_github_timeout_mapping(monkeypatch):
    def timeout(request):
        raise httpx.ReadTimeout("timeout")

    monkeypatch.setattr(github, "make_client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(timeout), base_url="https://api.github.com"))
    with pytest.raises(github.GitHubError) as caught:
        asyncio.run(github.get_json("/users/octocat"))
    assert caught.value.code == "GITHUB_TIMEOUT"


def test_secondary_rate_limit_mapping(monkeypatch):
    transport = httpx.MockTransport(lambda request: httpx.Response(403, json={"message": "secondary rate limit"}))
    monkeypatch.setattr(github, "make_client", lambda: httpx.AsyncClient(transport=transport, base_url="https://api.github.com"))
    with pytest.raises(github.GitHubError) as caught:
        asyncio.run(github.get_json("/users/octocat"))
    assert caught.value.code == "GITHUB_RATE_LIMITED"
