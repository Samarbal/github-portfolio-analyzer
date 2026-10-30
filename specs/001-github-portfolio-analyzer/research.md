# Planning Research

The approved requirements are in `docs/ai-sdlc/spec.md`. These are technical decisions for the MVP.

## GitHub public data

**Decision:** Use GitHub REST `GET /users/{username}` and `GET /users/{username}/repos?type=owner&sort=updated&direction=desc&per_page=100&page=1`. Use `public_repos` for the reported count and returned repository fields for analyzed statistics. Include forks and label the sample. Fetch `GET /repos/{owner}/{repo}/readme` only for selected repositories after the generation click.

**Rationale:** The [user](https://docs.github.com/en/rest/users/users), [repository](https://docs.github.com/en/rest/repos/repos), and [README](https://docs.github.com/en/rest/repos/contents) endpoints expose the required public fields without visitor sign-in. One repository page enforces the 100-item maximum. A README 404 is distinct from profile or rate-limit failures.

**Alternatives considered:** GraphQL and commit history add scope without improving the approved MVP. Optional server-side GitHub authentication may raise API capacity without requiring visitor sign-in; it is not required for the local demo.

## GitHub limits and failures

**Decision:** Use finite HTTP timeouts. Distinguish missing profile, missing README, rate limit (403/429), and transient GitHub/network errors. Do not retry aggressively or display partial repository statistics as complete.

**Rationale:** GitHub documents [rate-limit headers and responses](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api). The approved spec requires honest subset and error disclosure.

**Alternatives considered:** Persistent caching or background jobs are unnecessary for this MVP.

## AI providers and structured output

**Decision:** Use server-side direct HTTP adapters for Gemini, Groq, and OpenAI, with model IDs configured on the server. Request structured JSON where supported, then apply the same local schema and evidence-ID validation to every response. Disable implicit retries by using direct requests; allow one finite-timeout attempt per configured provider.

**Rationale:** Official [Gemini structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [Groq structured output](https://console.groq.com/docs/structured-outputs), and [OpenAI structured output](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) support constrained response formats, but provider and model capabilities vary. Local validation remains necessary. Official error references: [Gemini](https://ai.google.dev/gemini-api/docs/api-errors), [Groq](https://console.groq.com/docs/errors), [OpenAI](https://developers.openai.com/api/docs/guides/error-codes).

**Alternatives considered:** Three provider SDKs increase dependencies and may include automatic retries that conflict with the one-attempt rule. Plain text parsing weakens validation.

## Evidence and scope

**Decision:** Assign server-generated IDs to selected repository metadata and README excerpts. Accept only those IDs in AI output; map them to public URLs on the server. Keep factual profile data outside the AI output structure.

**Rationale:** This makes fabricated links and unselected-project references mechanically rejectable. Semantic support of prose cannot be proven by schema checks alone, so generation instructions stay conservative and users can inspect linked evidence.

**Alternatives considered:** Free-form citations are easy to fabricate; automated semantic scoring adds complexity and uncertain accuracy.
