import re

from .models import PortfolioOverview

CATEGORY_KEYWORDS = {
    "Web app": ("web-app", "website", "frontend", "dashboard"),
    "API or service": ("api", "backend", "server", "microservice"),
    "Data or AI": ("machine-learning", "ai", "data-analysis", "nlp"),
    "Developer tool": ("cli", "developer-tool", "linter", "automation"),
    "Mobile app": ("mobile-app", "android", "ios", "react-native"),
}
CATEGORIES = (*CATEGORY_KEYWORDS, "Unclassified")


def normalized_words(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", value.lower()))


def matching_categories(values: list[str]) -> set[str]:
    matches = set()
    for value in values:
        words = f" {normalized_words(value)} "
        for category, keywords in CATEGORY_KEYWORDS.items():
            if any(f" {normalized_words(keyword)} " in words for keyword in keywords):
                matches.add(category)
    return matches


def field(repository, name):
    return repository.get(name) if isinstance(repository, dict) else getattr(repository, name)


def classify_repository(repository) -> str:
    topics = matching_categories(field(repository, "topics") or [])
    if topics:
        return next(iter(topics)) if len(topics) == 1 else "Unclassified"
    ordinary = matching_categories([field(repository, "name") or "", field(repository, "description") or ""])
    return next(iter(ordinary)) if len(ordinary) == 1 else "Unclassified"


def portfolio_overview(repositories: list) -> PortfolioOverview:
    counts = {category: 0 for category in CATEGORIES}
    for repository in repositories:
        category = field(repository, "estimated_category") if not isinstance(repository, dict) and hasattr(repository, "estimated_category") else classify_repository(repository)
        counts[category] += 1
    analyzed_count = len(repositories)
    if analyzed_count:
        populated = ", ".join(f"{category}: {counts[category]}" for category in CATEGORIES if counts[category])
        summary = f"Among {analyzed_count} analyzed repositories, estimated categories are {populated}."
    else:
        summary = "No public repositories were analyzed."
    return PortfolioOverview(category_counts=counts, analyzed_count=analyzed_count,
                             factual_summary=summary)
