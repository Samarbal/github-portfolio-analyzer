import os
import re
from collections import Counter
from datetime import datetime
from urllib.parse import urlparse

import httpx

from .models import Repository, Statistics, Timeline, TimelineEntry

GITHUB_API = "https://api.github.com"
USERNAME = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$")


class GitHubError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def normalize_username(value: str) -> str:
    value = value.strip()
    if value.startswith("https://"):
        parsed = urlparse(value)
        if parsed.hostname not in {"github.com", "www.github.com"} or parsed.port or parsed.query or parsed.fragment:
            raise ValueError("Invalid GitHub profile URL")
        parts = parsed.path.strip("/").split("/")
        if len(parts) != 1:
            raise ValueError("Invalid GitHub profile URL")
        value = parts[0]
    if not USERNAME.fullmatch(value):
        raise ValueError("Invalid GitHub username")
    return value


def make_client() -> httpx.AsyncClient:
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "github-portfolio-analyzer"}
    if token := os.getenv("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {token}"
    return httpx.AsyncClient(base_url=GITHUB_API, headers=headers, timeout=10.0)


async def get_json(path: str, params: dict | None = None):
    try:
        async with make_client() as client:
            response = await client.get(path, params=params)
    except httpx.TimeoutException as exc:
        raise GitHubError("GITHUB_TIMEOUT") from exc
    except httpx.RequestError as exc:
        raise GitHubError("GITHUB_UNAVAILABLE") from exc
    if response.status_code == 404:
        raise GitHubError("PROFILE_NOT_FOUND" if not path.endswith("/repos") else "GITHUB_UNAVAILABLE")
    rate_limited_403 = response.status_code == 403 and (
        response.headers.get("X-RateLimit-Remaining") == "0"
        or "Retry-After" in response.headers
        or "rate limit" in response.text.lower()
    )
    if response.status_code == 429 or rate_limited_403:
        raise GitHubError("GITHUB_RATE_LIMITED")
    if response.status_code >= 400:
        raise GitHubError("GITHUB_UNAVAILABLE")
    try:
        return response.json()
    except ValueError as exc:
        raise GitHubError("GITHUB_UNAVAILABLE") from exc


def valid_date(value: str | None) -> str | None:
    if not value:
        return None
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    return value


def normalize_repository(raw: dict) -> Repository:
    return Repository(
        id=raw["id"], name=raw["name"], url=raw["html_url"],
        description=raw.get("description"), topics=raw.get("topics") or [],
        primary_language=raw.get("language"), stars=raw.get("stargazers_count") or 0,
        fork=bool(raw.get("fork")), created_at=valid_date(raw.get("created_at")),
        updated_at=valid_date(raw.get("updated_at")),
    )


def build_statistics(repositories: list[Repository]) -> Statistics:
    languages = Counter(repository.primary_language for repository in repositories if repository.primary_language)
    updates = [repository.updated_at for repository in repositories if repository.updated_at]
    return Statistics(stars_total=sum(repository.stars for repository in repositories),
                      primary_language_counts=dict(sorted(languages.items())),
                      latest_repository_update_at=max(updates) if updates else None)


def build_timeline(repositories: list[Repository]) -> Timeline:
    dated = sorted((repository for repository in repositories if repository.created_at),
                   key=lambda repository: repository.created_at)
    entries = [TimelineEntry(repository_id=repository.id, name=repository.name,
                             url=repository.url, created_at=repository.created_at) for repository in dated]
    return Timeline(entries=entries, omitted_missing_date_count=len(repositories) - len(entries))
