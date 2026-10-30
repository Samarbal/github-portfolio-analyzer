from app.github import build_statistics, build_timeline, normalize_repository


def repo(**changes):
    raw = {"id": 1, "name": "one", "html_url": "https://github.com/a/one",
           "description": None, "topics": [], "language": "Python", "stargazers_count": 2,
           "fork": False, "created_at": "2023-01-02T00:00:00Z",
           "updated_at": "2024-01-02T00:00:00Z", "private": False}
    raw.update(changes)
    return normalize_repository(raw)


def test_statistics_and_timeline_use_analyzed_set():
    repositories = [repo(), repo(id=2, name="two", language=None, stargazers_count=5,
                                created_at=None, updated_at=None)]
    stats = build_statistics(repositories)
    timeline = build_timeline(repositories)
    assert stats.stars_total == 7
    assert stats.primary_language_counts == {"Python": 1}
    assert stats.latest_repository_update_at == "2024-01-02T00:00:00Z"
    assert timeline.omitted_missing_date_count == 1
    assert [(item.name, item.url) for item in timeline.entries] == [("one", "https://github.com/a/one")]


def test_missing_dates_and_languages_are_not_invented():
    repositories = [repo(language=None, created_at="bad", updated_at=None)]
    assert build_statistics(repositories).latest_repository_update_at is None
    assert build_statistics(repositories).primary_language_counts == {}
    assert build_timeline(repositories).entries == []
    assert build_timeline(repositories).omitted_missing_date_count == 1
