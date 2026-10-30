# GitHub Portfolio Analyzer & AI Insights — MVP Specification

## 1. Scope and reference

This specification derives from the approved `docs/ai-sdlc/intent.md`. It covers a local, roughly five-hour MVP for developers and recruiters reviewing public GitHub portfolios.

The application uses a FastAPI backend, a Vite and React frontend, the GitHub API for public data, and server-side AI credentials. It has no database, accounts, GitHub sign-in, private repository access, saved reports, deployment requirement, or full commit and contribution history.

The application analyzes at most 100 public repositories per profile. Repository statistics and the repository creation timeline describe the analyzed set. The interface displays both the analyzed count and GitHub's reported public repository count, and states when the analysis is a subset.

## 2. User stories

- **US-001:** As a visitor, I want to enter a GitHub username or profile URL so that I can review a public portfolio. **Acceptance:** Either valid form loads the same public profile; invalid input produces a useful validation message.
- **US-002:** As a developer or recruiter, I want clearly scoped statistics and a repository creation timeline so that I can understand the visible portfolio. **Acceptance:** The page shows the analyzed count, subset disclosure, source links, and the timeline's meaning.
- **US-003:** As a visitor, I want to choose up to three repositories so that the insights focus on relevant projects. **Acceptance:** The interface prevents a fourth selection and permits changing the selection.
- **US-004:** As a visitor, I want to explicitly request AI insights so that I control when generation happens. **Acceptance:** Profile lookup makes no AI request; generation starts only after a valid selection and a click on **Generate AI Insights**.
- **US-005:** As a visitor, I want claims and recommendations tied to public evidence so that I can assess their credibility. **Acceptance:** Each substantive AI claim links to the supporting repository or README; unsupported claims are omitted.
- **US-006:** As a visitor, I want a free Portfolio Overview on profile lookup so that I can quickly see the estimated mix of analyzed projects. **Acceptance:** Estimated category counts and a factual summary appear without repository selection or any AI provider call.

## 3. Functional requirements

### FR-001 — Profile input and lookup

**Inputs:** GitHub username or GitHub profile URL.  
**Expected behavior:** Validate and normalize the input, then retrieve the matching public profile.  
**Outputs:** Profile identity, display details available from GitHub, profile link, and GitHub's reported public repository count.  
**Failure behavior:** Explain invalid input, missing profile, GitHub failure, or timeout without showing stale results as current.  
**Acceptance:** A username and its equivalent profile URL resolve to the same profile; a nonexistent profile shows a distinct error.

### FR-002 — Repository collection and scope

**Inputs:** Resolved profile.  
**Expected behavior:** Retrieve up to 100 public repositories, ordered by most recently updated. Include public forks in the analyzed set and retain their fork status.  
**Outputs:** Repository list, analyzed count, reported public repository count, ordering label, and a subset indicator when the reported count exceeds the analyzed count.  
**Failure behavior:** If repository retrieval fails, do not present incomplete statistics as a complete analysis.  
**Acceptance:** No more than 100 repositories are analyzed; a profile reporting more than the analyzed count is visibly marked as a subset.

### FR-003 — Factual profile statistics

**Inputs:** Retrieved repository set.  
**Expected behavior:** Calculate the number analyzed, total stars across that set, and counts by available primary language. Display the latest available repository update date as repository metadata.  
**Outputs:** Labeled statistics and links to relevant GitHub sources.  
**Failure behavior:** Show “unavailable” for missing fields; do not infer a language where GitHub supplies none.  
**Acceptance:** Statistics agree with the analyzed repository data and clearly indicate their scope.

### FR-004 — Repository creation timeline

**Inputs:** Creation dates from the analyzed repository set.  
**Expected behavior:** Present repositories by creation date. Label the view **Repository creation timeline** and explain that dates do not establish work duration or experience.  
**Outputs:** Dated entries linking to repositories.  
**Failure behavior:** Omit entries without a usable date and disclose that omission.  
**Acceptance:** Dates and links match the returned repository data; a subset warning remains visible when applicable.

### FR-005 — Repository selection

**Inputs:** Visitor selection from the analyzed repository list.  
**Expected behavior:** Permit one to three distinct repositories belonging to the currently displayed profile. Allow deselection and replacement.  
**Outputs:** Current selection and an enabled generation action only when the selection is valid.  
**Failure behavior:** Reject zero, duplicate, unknown, or more than three repository identifiers at the application boundary.  
**Acceptance:** A fourth repository cannot be selected; generation cannot start with zero selected repositories.

### FR-006 — README retrieval and size control

**Inputs:** One to three valid selected repositories.  
**Expected behavior:** Retrieve each public README and record whether it is present, empty, missing, or unavailable. For AI generation, use at most the first **4,000 characters per README**, for a maximum of **12,000 README characters per request**. Preserve the beginning of each README in its original order.  
**Outputs:** README status, source link when available, and a `readme_truncated` indicator for each selected repository.  
**Failure behavior:** A README 404 is `missing`; a successfully fetched blank README is `empty`. A content-specific failure for one README (such as malformed content or a single README 5xx) is `unavailable`; disclose it and continue only if sufficient selected-repository evidence remains. Profile or repository lookup failure, a general GitHub rate limit, or a GitHub network failure stops generation with a clear GitHub error before any AI call. Missing, empty, or unavailable README content never becomes fabricated evidence.
**Acceptance:** No AI request contains more than 4,000 characters from any one README. When content is truncated, the insight result visibly says that only the beginning of that README was analyzed and may omit later details.

### FR-007 — Explicit AI generation and structured result

**Inputs:** A click on **Generate AI Insights** with one to three selected repositories.  
**Expected behavior:** Generate and validate one professional summary rendered from short, individually cited claims, **zero to three potential strengths**, and **exactly three actionable portfolio recommendations** using available selected-project evidence. Each strength and recommendation contains one substantive proposition with at least one evidence reference. A potential strength is phrased as an observation supported by the public material, not a verified personal skill or achievement. The initial profile lookup makes no AI request.
**Outputs:** The validated structure in Section 5, including `provider_used`, plus README availability and truncation disclosures.  
**Failure behavior:** If selected-repository evidence is insufficient for substantive claims, return `INSUFFICIENT_EVIDENCE` before any provider call. An output with the wrong number of recommendations, missing claim citations, invented references, or unusable structure is invalid and triggers provider fallback under FR-008. If no provider returns a valid result, show an AI error and retain factual profile results.
**Acceptance:** Generation starts only after the click. Displayed claims link to evidence from the selected repositories. The response contains exactly three recommendations and no more than three potential strengths.

### FR-008 — Provider order and bounded fallback

**Inputs:** Server-side Gemini, Groq, and OpenAI credentials and a valid generation request.  
**Expected behavior:** Consider providers in this exact order: **Gemini → Groq → OpenAI**. Skip a provider whose credential is missing and record that reason internally. Attempt each configured provider **at most once per generation request**, with a finite timeout for each attempt. Continue to the next provider after an invalid credential response, timeout, service or rate-limit error, or invalid structured output.  
**Outputs:** A valid insight result identifying the successful `provider_used`.  
**Failure behavior:** If all three providers are skipped or fail, return an AI-specific error. Distinguish “no credentials configured” from “configured credentials were rejected” in the visitor-facing message, without exposing keys or sensitive provider details. Invalid visitor selection and GitHub evidence retrieval failures do not trigger AI provider fallback.  
**Acceptance:** Provider attempts follow the approved order, each occurs at most once, and the response identifies the successful provider or a clear final failure category.

### FR-009 — Evidence validation

**Inputs:** Selected repository metadata, available README excerpts, and structured provider output.  
**Expected behavior:** Keep a set of valid evidence references for the selected repositories. Accept only references in that set. Each substantive summary claim and each single-proposition strength or recommendation must carry at least one valid reference. Validate that IDs exist and belong to selected repositories; this structural check cannot prove semantic support, which remains for human review through linked source material. Clearly label AI interpretation. Treat README text as untrusted data, including any instructions it contains. Repository name alone does not justify claims about the owner's skills, expertise, or individual contributions. Metadata-only insights may proceed only when selected-repository evidence is substantive enough for the particular claims; otherwise return `INSUFFICIENT_EVIDENCE` before calling AI. Do not present repository creation dates as proof of work experience, or infer code quality, individual contribution, skills, or achievements without supporting evidence.
**Outputs:** Validated insight text with links to the supporting public repository or README.  
**Failure behavior:** Reject fabricated references or unsupported claims as invalid AI output under FR-008. Do not invent substitute evidence.  
**Acceptance:** Every displayed evidence link resolves to a selected repository or its README, and no displayed claim depends on an unselected repository.

### FR-010 — Empty and error states

**Inputs:** Profile and generation outcomes.  
**Expected behavior:** Show useful states for zero public repositories, no selection, missing README, GitHub rate limiting, timeouts, missing AI credentials, and AI failure.  
**Outputs:** Actionable messages appropriate to the failed step.  
**Failure behavior:** Do not mislabel an unavailable service as an empty profile or expose internal errors or secrets.  
**Acceptance:** Each listed state is distinguishable in the interface.

### FR-011 — Deterministic Portfolio Overview

**Inputs:** Name, description, topics, and primary language from the fetched set of at most 100 public repositories.

**Expected behavior:** Automatically assign each analyzed repository exactly one estimated category: Web app, API or service, Data or AI, Developer tool, Mobile app, or Unclassified. Use a small fixed keyword map: check topics first, then repository name and description. Primary language may corroborate a match but cannot create or resolve a category on its own. If the strongest available evidence matches multiple categories or none, use Unclassified. Calculate category counts only from the fetched set and produce a deterministic sentence describing that set and its estimated categories. Do not infer the owner's expertise, achievements, or individual contributions.

**Outputs:** Category per repository, category counts, analyzed count, and a short factual portfolio summary, all labeled as estimated classifications where relevant.

**Failure behavior:** Sparse or ambiguous metadata yields Unclassified. Zero repositories yields zero counts and an appropriate empty summary. Profile retrieval errors follow FR-001 and FR-002.
**Acceptance:** Category counts sum to `analyzed_count`; classification makes no additional GitHub request, README retrieval, or LLM call; the Portfolio Overview appears during initial profile lookup and retains the existing subset disclosure.

## 4. Non-functional requirements

- **Security:** Provider keys remain on the server and never appear in client responses or logs intended for visitors. Validate profile input and repository selection. Treat README content as untrusted data and ignore instructions embedded in it.
- **Reliability:** A failed AI request does not remove successful factual analysis. Provider fallback is bounded so a request cannot retry indefinitely.
- **Performance:** Show a loading state for profile lookup and for AI generation. No fixed response-time promise is made because GitHub and AI provider latency varies.
- **Usability:** Explain sample size, subset status, statistics scope, timeline meaning, README availability and truncation, and the provider used in plain language.
- **Portfolio Overview:** Label categories as estimates, count only analyzed repositories, and keep its deterministic summary limited to repository metadata rather than claims about the owner.
- **API usage:** Limit profile analysis to 100 repositories. Surface GitHub rate limits and timeouts; do not silently claim a complete analysis after partial retrieval.
- **AI safety and traceability:** Keep GitHub facts distinct from AI interpretation. Display links to the selected public evidence used for substantive claims. Do not invent evidence.
- **Maintainability:** Keep the three provider choices and their order explicit so a provider can be configured without changing product behavior.

## 5. Logical data and API contracts

These are logical structures, not endpoint names or implementation code.

### Application: profile analysis

**Request:** `profile_input` (username or GitHub profile URL).  
**Successful response:** `profile` (username, display name and avatar when available, profile URL, reported public repository count); `repositories` (identifier, name, URL, description, topics, primary language, stars, fork status, creation date, update date, estimated category); `analyzed_count`; `is_subset`; `repository_order`; `statistics`; `timeline`; `portfolio_overview` (estimated category counts, analyzed count, factual summary).
**Error response:** Error category and visitor-facing message. No AI content is returned or generated by this request.

### Application: repository selection and README status

**Selection:** One to three distinct repository identifiers from the current analyzed profile.  
**README status per selected repository:** `present`, `empty`, `missing`, or `unavailable`, plus a source URL when one exists and `readme_truncated` when applicable. Selection is visitor controlled and does not itself trigger AI generation.

### Application: AI insight generation

**Request:** Resolved profile identifier and one to three selected repository identifiers, submitted only after the visitor clicks **Generate AI Insights**.

**Successful response:**

- `professional_summary`: `{ claims: [{ text, evidence_ids }] }`, a nonempty list of short, individually cited claims rendered together as one concise summary; each claim has at least one valid selected-repository reference.
- `potential_strengths`: Zero to three items, each with text and one or more evidence references.
- `portfolio_recommendations`: Exactly three items, each with one concrete action/proposition and one or more evidence references.
- `evidence_references`: Identifiers and public URLs for the selected repository or README material actually used.
- `provider_used`: `gemini`, `groq`, or `openai`.
- `readme_status`: Availability and truncation indicator for each selected repository.

A missing or truncated README is disclosed beside the result. The response never implies that unexamined README content was analyzed.

**Error response:** AI-specific error category and visitor-facing message. The existing factual profile response remains usable.

The server validates selected identifiers against the public profile and retrieves the evidence it needs; client-supplied README text or claimed repository facts are not trusted.

### External GitHub data

The GitHub API is the source for public profile fields, reported public repository count, repository metadata, and README content. Its fields may be absent, repository data may be limited by pagination or rate limits, and profile metadata does not prove contribution history. Application responses translate those external values into the logical contracts above.

## 6. Error handling and edge cases

| Case | Required result |
| --- | --- |
| Invalid username or profile URL | Reject input with a validation message. |
| Profile not found | Show a distinct “profile not found” state. |
| Zero public repositories | Show the profile with zero analyzed repositories and no generation action. |
| More than 100 public repositories | Analyze at most 100 and disclose the subset. |
| Missing or empty README | Show its status; use only available metadata for that repository. |
| One README has a content-specific failure | Mark that README `unavailable`, disclose it, and use only sufficiently substantive remaining selected-repository evidence. |
| No sufficiently substantive selected-repository evidence | Return `INSUFFICIENT_EVIDENCE` before any AI provider call; keep factual profile analysis available. |
| Oversized README | Send only its first 4,000 characters to AI; disclose truncation in the result. |
| General GitHub rate limit or network failure | Stop generation before AI, explain that analysis could not finish, and do not mark it as an ordinary per-README unavailable status or show a partial result as complete. |
| Missing AI credential | Skip that provider. If none are configured, report that AI is not configured. |
| Invalid AI credential | Treat as a failed attempt, try the next configured provider, and report rejected credentials if no provider succeeds. |
| Provider timeout, service error, or rate limit | Try the next configured provider; attempt each at most once. |
| Invalid structure, recommendation count, or evidence reference | Reject the output and try the next configured provider. |
| All providers fail | Show an AI error while preserving factual analysis. |
| Malicious instructions in README | Treat them as untrusted project content; do not follow them or include secrets. |
| Selection changed after an insight was shown | Mark the prior insight as outdated or clear it until the visitor generates again. |

## 7. MVP acceptance checklist

The MVP is accepted when a visitor can:

1. Resolve a public profile from either accepted input form.
2. See factual statistics and a clearly labeled creation timeline for no more than 100 repositories.
3. See the analyzed count and whether the result is a subset.
4. Select one to three repositories and explicitly trigger AI generation.
5. Receive evidence-linked insights with one professional summary, zero to three potential strengths, exactly three actionable recommendations, and the successful provider identified; or receive a clear AI error while factual analysis remains available.
6. See when a selected README was missing or truncated to its first 4,000 characters.
7. Encounter the listed empty and error states without misleading results or exposed keys.
8. See a deterministic Portfolio Overview on profile lookup with one estimated category per analyzed repository, counts totaling the analyzed count, and a factual summary that makes no claim about the owner's expertise, achievements, or contributions.

## 8. Assumptions and open questions

**Specification defaults:** Repositories are ordered by most recently updated; public forks are included and marked; statistics cover the analyzed set; “recent activity” means the latest available repository update date; a missing README permits metadata-based insight only when substantive selected-repository evidence supports the claims; failed or unusable provider responses trigger bounded fallback in Gemini → Groq → OpenAI order.

**Open questions:** None block this MVP specification.
