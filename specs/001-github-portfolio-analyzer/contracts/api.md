# MVP Application API Contract

This is a technical design derived from `docs/ai-sdlc/spec.md`, not a replacement for its logical contract. Paths and field names can be reviewed before implementation.

## GET /api/profile?input={username-or-profile-url}

Accept a GitHub username or canonical `github.com/{username}` profile URL. Normalize on the backend; reject other hosts or paths. Fetch public GitHub user data and the first 100 owned public repositories ordered by `updated` descending. Classify that fetched set from its metadata during this request. This endpoint makes no README or AI provider request for classification.

**Success (200):**

| Field | Meaning |
| --- | --- |
| `profile` | `username`, nullable `display_name`, nullable `avatar_url`, `profile_url`, `reported_public_repos` |
| `repositories` | Array of at most 100 items: `id`, `name`, `url`, nullable `description`, `topics`, nullable `primary_language`, `stars`, `fork`, nullable `created_at`, nullable `updated_at`, one `estimated_category` |
| `analyzed_count`, `is_subset` | Count of returned repositories; true when reported count is greater than analyzed count |
| `repository_order` | `updated_desc` |
| `statistics` | `stars_total`, `primary_language_counts`, nullable `latest_repository_update_at` for the analyzed set |
| `timeline` | Entries with repository ID, name, URL, creation date; `omitted_missing_date_count` |
| `portfolio_overview` | `category_counts` for Web app, API or service, Data or AI, Developer tool, Mobile app, and Unclassified; `analyzed_count`; deterministic `factual_summary` about analyzed repositories and estimated categories; `estimated: true`. Counts sum to `analyzed_count` and existing subset disclosure applies. |

**Errors:** `INVALID_PROFILE_INPUT` (400), `PROFILE_NOT_FOUND` (404), `GITHUB_RATE_LIMITED` (429), `GITHUB_UNAVAILABLE` (503), `GITHUB_TIMEOUT` (504). Error body: `{ "code": "...", "message": "..." }`. No partial repository result is presented as complete.

Each repository receives one estimated category. The fixed whole-word/phrase keyword map and precedence in `plan.md` check topics first, then name and description; primary language may corroborate but cannot determine or resolve a category alone. Ambiguous or insufficient strongest evidence yields Unclassified. The overview makes no claim about the owner's expertise, achievements, or contributions. Zero repositories produce zero counts and an empty factual summary.

## POST /api/insights

The frontend sends this only when the visitor clicks **Generate AI Insights**. Request body: `{ "username": "...", "repository_ids": [123] }`. The array must contain one to three distinct IDs. The server re-fetches the current analyzed repository set and rejects IDs outside it. It retrieves README content for selected repositories. README 404 is `missing`; successful blank content is `empty`; a content-specific failure for one README (malformed content or a single README 5xx) is `unavailable` and is disclosed. These statuses permit metadata-only insights only when selected-repository evidence supports the specific claims. A profile/repository lookup failure, general GitHub rate limit, or network failure stops generation before any AI call and is never treated as a per-README `unavailable` status. If no substantive evidence remains, return `INSUFFICIENT_EVIDENCE` before any AI call. Repository name or URL alone cannot justify claims about owner skills, expertise, or contributions.

**Success (200):**

| Field | Meaning |
| --- | --- |
| `professional_summary` | `{ "claims": [{ "text": "...", "evidence_ids": ["..."] }] }`; nonempty short claim list rendered as one summary, each claim with at least one valid ID |
| `potential_strengths` | Zero to three `{ "text", "evidence_ids" }` items; each has at least one valid ID |
| `portfolio_recommendations` | Exactly three `{ "action", "evidence_ids" }` items; each action is one actionable proposition with its own valid IDs and no uncited extra factual claim |
| `evidence_references` | Server-resolved entries `{ "id", "repository_id", "kind", "url" }` for selected evidence only |
| `provider_used` | `gemini`, `groq`, or `openai` |
| `readme_status` | One entry per selection: repository ID, `status`, nullable `url`, `readme_truncated` |

**Errors:** `INVALID_SELECTION` (400), `INSUFFICIENT_EVIDENCE` (422), `GITHUB_RATE_LIMITED` (429), `GITHUB_UNAVAILABLE` (503), `GITHUB_TIMEOUT` (504), `AI_NOT_CONFIGURED` (503), `AI_CREDENTIALS_REJECTED` (503), `AI_UNAVAILABLE` (503). Error body uses the same `{ "code", "message" }` shape and excludes secrets or raw provider responses. Factual profile analysis remains available after an insight error.

## Validation and trust boundary

The server creates evidence IDs from selected repository metadata and at most the first 4,000 characters of each README (12,000 total). The preflight requires at least one nonempty selected-repository README excerpt, description, or topic; name, URL, and primary language alone do not pass. AI provider output is parsed into the success structure. Reject wrong counts, empty substantive text, missing claim-level citations, IDs outside the server allowlist or selected-repository membership, fabricated URLs, and malformed output. Each strength and recommendation is one cited proposition. Resolve public evidence URLs from server-side GitHub data. Deterministic validation cannot establish semantic support; visitors can review linked sources. Treat README instructions as untrusted content. GitHub facts and AI interpretation remain visibly separate in the UI. Invalid selection, insufficient evidence, or general GitHub evidence retrieval errors never trigger AI provider fallback.
