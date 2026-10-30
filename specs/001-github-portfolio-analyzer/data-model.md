# Transient Data Model

All data is request-scoped; nothing is stored. `docs/ai-sdlc/spec.md` remains authoritative for behavior.

| Object | Fields and validation | Source |
| --- | --- | --- |
| Profile | `username`, optional `display_name` and `avatar_url`, `profile_url`, `reported_public_repos` | GitHub public user |
| Repository | Stable `id`, `name`, `url`, optional `description`, `topics`, optional `primary_language`, `stars`, `fork`, optional `created_at` and `updated_at`, one `estimated_category` | GitHub owned public repository list; category from deterministic rules |
| ProfileAnalysis | Profile, up to 100 repositories, `analyzed_count`, `is_subset`, `repository_order`, statistics, timeline, Portfolio Overview | Backend calculation from GitHub facts |
| Statistics | Analyzed repository count, sum of stars, counts of non-null primary languages, latest available repository `updated_at` | Analyzed set only |
| TimelineEntry | Repository ID, name, URL, `created_at`; omit and disclose missing dates | Analyzed set only |
| PortfolioOverview | `category_counts` across Web app, API or service, Data or AI, Developer tool, Mobile app, and Unclassified; `factual_summary`; `analyzed_count`; `estimated` label. Counts sum to analyzed count. Summary describes repositories and estimated categories only. | Fetched repository metadata only; no extra requests or AI |
| Selection | One to three distinct IDs from the current analyzed profile | Visitor choice, revalidated by server |
| ReadmeEvidence | Repository ID, status `present`/`empty`/`missing`/`unavailable`, optional URL, first 4,000 characters, `readme_truncated`; `unavailable` is limited to content-specific failure for one README, not general rate limits or network failures | GitHub README response |
| EvidenceReference | Server-generated ID, selected repository ID, kind `repository` or `readme`, public URL | Allowlist used for AI validation |
| InsightClaim | Nonempty `text` and nonempty `evidence_ids` belonging to selected repositories; each ID resolves through the server allowlist | Validated AI interpretation |
| InsightResult | One `professional_summary` with a nonempty `claims` array of InsightClaim objects rendered together; zero to three single-proposition potential strengths and exactly three single-proposition actionable recommendations, each with its own evidence IDs; `evidence_references`, `provider_used`, README statuses | Validated AI interpretation |

## State transitions

Profile lookup: idle → loading → factual result or error. No AI call occurs.

Selection: zero to three repositories; changing it clears or marks an earlier insight stale.

Insight generation: ready → evidence preparation → `INSUFFICIENT_EVIDENCE` if no substantive selected-repository evidence remains, otherwise loading → validated result or AI/GitHub error. A nonempty README excerpt, description, or topic meets the minimum preflight; name, URL, or primary language alone does not. This check does not prove semantic support for every generated claim, so linked evidence remains available for human review. General GitHub rate limits or network failures stop before AI. Factual profile analysis remains available after insight failure. Provider attempts are ordered Gemini → Groq → OpenAI, with each configured provider attempted at most once.
