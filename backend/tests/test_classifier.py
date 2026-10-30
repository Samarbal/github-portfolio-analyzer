import pytest

from app.classifier import classify_repository, portfolio_overview


def repo(name="plain", description=None, topics=None, primary_language=None):
    return {"name": name, "description": description, "topics": topics or [],
            "primary_language": primary_language}


@pytest.mark.parametrize("topic,category", [
    ("website", "Web app"), ("api", "API or service"),
    ("machine-learning", "Data or AI"), ("cli", "Developer tool"),
    ("android", "Mobile app"),
])
def test_category_topics(topic, category):
    assert classify_repository(repo(topics=[topic])) == category


def test_precedence_and_ambiguity():
    assert classify_repository(repo(name="api", topics=["website"])) == "Web app"
    assert classify_repository(repo(description="A dashboard and an API")) == "Unclassified"
    assert classify_repository(repo(topics=["api", "cli"])) == "Unclassified"


def test_whole_word_language_only_and_missing():
    assert classify_repository(repo(name="tailwind", primary_language="Python")) == "Unclassified"
    assert classify_repository(repo(name="plain", primary_language="JavaScript")) == "Unclassified"
    assert classify_repository(repo(name="plain")) == "Unclassified"
    assert classify_repository(repo(name="react-native")) == "Mobile app"


def test_overview_counts_and_factual_summary():
    repositories = [repo(topics=["api"]), repo(name="plain")]
    overview = portfolio_overview(repositories)
    assert sum(overview.category_counts.values()) == 2
    assert overview.category_counts["API or service"] == 1
    assert overview.category_counts["Unclassified"] == 1
    assert "owner" not in overview.factual_summary.lower()
    assert portfolio_overview([]).analyzed_count == 0
    assert sum(portfolio_overview([repo()] * 100).category_counts.values()) == 100
