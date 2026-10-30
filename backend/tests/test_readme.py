import asyncio

import httpx
import pytest

from app import github
from app.models import Repository


def repository(identifier: int, name: str) -> Repository:
    return Repository(
        id=identifier, name=name, url=f"https://github.com/octocat/{name}",
        description=None, topics=[], primary_language=None, stars=0, fork=False,
        created_at=None, updated_at=None,
    )


REPOSITORIES = [repository(number, f"repo-{number}") for number in range(1, 5)]


@pytest.mark.parametrize("selection", [[], [1, 1], [1, 2, 3, 4], [1, 99], [True], ["1"]])
def test_invalid_selection_is_rejected_before_readme_requests(monkeypatch, selection):
    def unexpected_client():
        raise AssertionError("Invalid selection must make no GitHub request")

    monkeypatch.setattr(github, "make_client", unexpected_client)
    with pytest.raises(github.InvalidSelection):
        asyncio.run(github.prepare_selected_readmes("octocat", selection, REPOSITORIES))


def test_valid_selection_preserves_visitor_order():
    assert [repo.id for repo in github.validate_selection([3, 1], REPOSITORIES)] == [3, 1]


def mock_client(monkeypatch, handler):
    requests = []

    def respond(request):
        requests.append(request)
        return handler(request)

    transport = httpx.MockTransport(respond)
    monkeypatch.setattr(github, "make_client", lambda: httpx.AsyncClient(
        transport=transport, base_url="https://api.github.com", timeout=10.0,
    ))
    return requests


def test_present_empty_missing_unavailable_and_no_other_requests(monkeypatch):
    responses = {
        "repo-1": httpx.Response(200, content=b"# Public README\nUseful details"),
        "repo-2": httpx.Response(200, content=b" \n\t"),
        "repo-3": httpx.Response(404),
        "repo-4": httpx.Response(502),
    }
    requests = mock_client(monkeypatch, lambda request: responses[request.url.path.split("/")[-2]])
    first = asyncio.run(github.prepare_selected_readmes("octocat", [1, 2, 3], REPOSITORIES))
    fourth = asyncio.run(github.prepare_selected_readmes("octocat", [4], REPOSITORIES))
    assert [item.status for item in first + fourth] == ["present", "empty", "missing", "unavailable"]
    assert first[0].content == "# Public README\nUseful details"
    assert first[0].url == "https://github.com/octocat/repo-1#readme"
    assert first[1].content == "" and first[1].url is not None
    assert first[2].content == "" and first[2].url is None
    assert fourth[0].content == "" and fourth[0].url is None
    assert all(request.headers["accept"] == "application/vnd.github.raw+json" for request in requests)
    assert [request.url.path for request in requests] == [
        f"/repos/octocat/repo-{number}/readme" for number in range(1, 5)
    ]


def test_malformed_readme_is_unavailable(monkeypatch):
    mock_client(monkeypatch, lambda request: httpx.Response(200, content=b"\xff\xfe"))
    item = asyncio.run(github.prepare_selected_readmes("octocat", [1], REPOSITORIES))[0]
    assert item.status == "unavailable" and item.content == ""


def test_readme_bounds_and_truncation(monkeypatch):
    requests = mock_client(monkeypatch, lambda request: httpx.Response(200, content=("A" * 4001).encode()))
    items = asyncio.run(github.prepare_selected_readmes("octocat", [1, 2, 3], REPOSITORIES))
    assert len(requests) == 3
    assert all(item.status == "present" and item.readme_truncated for item in items)
    assert all(item.content == "A" * 4000 for item in items)
    assert sum(len(item.content) for item in items) == 12000


@pytest.mark.parametrize("status,headers,body,code", [
    (429, {}, b"", "GITHUB_RATE_LIMITED"),
    (403, {"X-RateLimit-Remaining": "0"}, b"", "GITHUB_RATE_LIMITED"),
    (403, {}, b'{"message":"secondary rate limit"}', "GITHUB_RATE_LIMITED"),
    (403, {}, b'{"message":"Forbidden"}', "GITHUB_UNAVAILABLE"),
])
def test_general_github_errors_stop_preparation(monkeypatch, status, headers, body, code):
    requests = mock_client(monkeypatch, lambda request: httpx.Response(status, headers=headers, content=body))
    with pytest.raises(github.GitHubError) as caught:
        asyncio.run(github.prepare_selected_readmes("octocat", [1, 2], REPOSITORIES))
    assert caught.value.code == code
    assert len(requests) == 1


@pytest.mark.parametrize("failure,code", [
    (httpx.ReadTimeout("slow"), "GITHUB_TIMEOUT"),
    (httpx.ConnectError("offline"), "GITHUB_UNAVAILABLE"),
])
def test_network_errors_are_not_per_readme_unavailable(monkeypatch, failure, code):
    def fail(request):
        raise failure

    mock_client(monkeypatch, fail)
    with pytest.raises(github.GitHubError) as caught:
        asyncio.run(github.prepare_selected_readmes("octocat", [1], REPOSITORIES))
    assert caught.value.code == code
