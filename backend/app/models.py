from typing import Literal

from pydantic import BaseModel


Category = Literal[
    "Web app", "API or service", "Data or AI", "Developer tool", "Mobile app", "Unclassified"
]


class Profile(BaseModel):
    username: str
    display_name: str | None
    avatar_url: str | None
    profile_url: str
    reported_public_repos: int


class Repository(BaseModel):
    id: int
    name: str
    url: str
    description: str | None
    topics: list[str]
    primary_language: str | None
    stars: int
    fork: bool
    created_at: str | None
    updated_at: str | None
    estimated_category: Category = "Unclassified"


class Statistics(BaseModel):
    stars_total: int
    primary_language_counts: dict[str, int]
    latest_repository_update_at: str | None


class TimelineEntry(BaseModel):
    repository_id: int
    name: str
    url: str
    created_at: str


class Timeline(BaseModel):
    entries: list[TimelineEntry]
    omitted_missing_date_count: int


class PortfolioOverview(BaseModel):
    category_counts: dict[str, int]
    analyzed_count: int
    factual_summary: str
    estimated: bool = True


class ProfileAnalysis(BaseModel):
    profile: Profile
    repositories: list[Repository]
    analyzed_count: int
    is_subset: bool
    repository_order: Literal["updated_desc"] = "updated_desc"
    statistics: Statistics
    timeline: Timeline
    portfolio_overview: PortfolioOverview


class ReadmeEvidence(BaseModel):
    repository_id: int
    status: Literal["present", "empty", "missing", "unavailable"]
    url: str | None
    content: str
    readme_truncated: bool


class InsightClaim(BaseModel):
    text: str
    evidence_ids: list[str]


class InsightResult(BaseModel):
    professional_summary: dict[str, list[InsightClaim]]
    potential_strengths: list[InsightClaim]
    portfolio_recommendations: list[dict]
    evidence_references: list[dict]
    provider_used: Literal["gemini", "groq", "openai"]
    readme_status: list[dict]
