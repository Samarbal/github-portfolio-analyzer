from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


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
    model_config = ConfigDict(extra="forbid")
    text: str
    evidence_ids: list[str] = Field(min_length=1)

    @field_validator("text")
    @classmethod
    def text_is_substantive(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Empty claim")
        return value.strip()


class InsightRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str
    evidence_ids: list[str] = Field(min_length=1)

    @field_validator("action")
    @classmethod
    def action_is_substantive(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Empty recommendation")
        return value.strip()


class ProfessionalSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")
    claims: list[InsightClaim] = Field(min_length=1)


class ProviderOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    professional_summary: ProfessionalSummary
    potential_strengths: list[InsightClaim] = Field(max_length=3)
    portfolio_recommendations: list[InsightRecommendation] = Field(min_length=3, max_length=3)


class EvidenceReference(BaseModel):
    id: str
    repository_id: int
    kind: Literal["repository", "readme"]
    url: str


class ReadmeStatus(BaseModel):
    repository_id: int
    status: Literal["present", "empty", "missing", "unavailable"]
    url: str | None
    readme_truncated: bool


class InsightResult(BaseModel):
    professional_summary: ProfessionalSummary
    potential_strengths: list[InsightClaim]
    portfolio_recommendations: list[InsightRecommendation]
    evidence_references: list[EvidenceReference]
    provider_used: Literal["gemini", "groq", "openai"]
    readme_status: list[ReadmeStatus]
