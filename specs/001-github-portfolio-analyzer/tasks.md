# Tasks: GitHub Portfolio Analyzer & AI Insights

**Source of truth:** `docs/ai-sdlc/spec.md` (US-001–US-006, FR-001–FR-011) and `docs/ai-sdlc/intent.md`. The feature-local `spec.md` supplies priorities and milestones only. Use `plan.md`, `data-model.md`, and `contracts/api.md` for technical design. No task changes an approved requirement.

**Format:** `[P]` marks work on different files that can proceed in parallel after its stated prerequisites. `[USn]` maps to approved `US-00n`. Tests are included because the user requested focused tests and the constitution requires them. Each milestone ends in a test and human-review gate.

## Phase 1: Setup — M1

**Goal:** Establish the minimal local FastAPI and React/Vite projects.

- [X] T001 Create the FastAPI app and minimal Python dependency/test configuration in `backend/app/main.py` and `backend/requirements.txt`.
- [X] T002 [P] Create the React/Vite app and Vitest configuration in `frontend/package.json`, `frontend/index.html`, and `frontend/src/App.jsx`.

## Phase 2: Foundation — M1

**Goal:** Keep credentials server-side and define shared response shapes before stories.

- [X] T003 Add server-only placeholder environment settings and secret ignores in `backend/.env.example` and `.gitignore`, and shared profile/insight response models in `backend/app/models.py`; include no real credentials.

## Phase 3: US-001 — Public profile lookup (P1, M1)

**Independent test:** Username and equivalent profile URL return the same public profile; invalid input, 404, rate limit, timeout, and repository-fetch failure have distinct outcomes. Profile lookup makes no AI call.

- [X] T004 [US1] Write mocked profile API tests for normalization, public user and top-100 repository retrieval, error mapping, and zero AI calls in `backend/tests/test_profile.py`. Include one integration test asserting that Portfolio Overview classification adds no GitHub, README, or AI requests beyond the existing profile lookup.
- [X] T005 [US1] Implement finite-timeout GitHub requests for `GET /users/{username}` and `GET /users/{username}/repos?type=owner&sort=updated&direction=desc&per_page=100&page=1` in `backend/app/github.py`; retain forks and all fields required by `contracts/api.md`.
- [X] T006 [US1] Implement `GET /api/profile` input validation, profile normalization, and visitor-safe errors in `backend/app/main.py`; never present a partial repository fetch as complete.
- [X] T007 [US1] Add a frontend interaction test for username/URL lookup, loading, error display, and no insight request in `frontend/src/App.test.jsx`.
- [X] T008 [US1] Add profile lookup request handling and loading/error states in `frontend/src/api.js` and `frontend/src/App.jsx`.

## Phase 4: US-002 — Statistics and creation timeline (P1, M1)

**Independent test:** Given repository fixtures, statistics and timeline match only the analyzed set, label subset status, link to GitHub, and do not equate dates with work experience.

- [X] T009 [US2] Write tests for analyzed count, star sum, nullable primary-language counts, latest repository update, creation-date omission, and subset disclosure in `backend/tests/test_analysis.py`.
- [X] T010 [US2] Calculate statistics and dated timeline from the at-most-100 returned repositories in `backend/app/github.py`, exposing the `contracts/api.md` response fields.
- [X] T011 [US2] Render scoped statistics, repository links, subset count, and the clearly labeled Repository creation timeline in `frontend/src/App.jsx` and `frontend/src/styles.css`.

## Phase 5: US-006 — Free Portfolio Overview (P1, M1)

**Independent test:** Fixtures produce one estimated category per fetched repository, including Unclassified for sparse or ambiguous metadata; counts sum to analyzed count. No extra GitHub, README, or AI request occurs.

- [X] T012 [P] [US6] Write table-driven classifier tests for each category, topic precedence over name/description, same-level conflict, whole-word boundaries (for example `ai` inside another word), language-only input, no match, zero repositories, and count totals for a 100-item subset in `backend/tests/test_classifier.py`.
- [X] T013 [US6] Implement the fixed whole-word/phrase keyword map and precedence defined in `plan.md`, plus the deterministic repository-only factual summary, in `backend/app/classifier.py`; ambiguous strongest evidence is Unclassified and primary language cannot classify or break a tie alone.
- [X] T014 [US6] Add `topics`, one `estimated_category` per repository, and `portfolio_overview` to the existing profile response in `backend/app/main.py`, using only fetched metadata.
- [X] T015 [US6] Add a frontend test for estimated labels, category counts, and the factual summary in `frontend/src/App.test.jsx`.
- [X] T016 [US6] Render the free Portfolio Overview beside factual profile analysis in `frontend/src/App.jsx` and `frontend/src/styles.css`, retaining the subset disclosure.

**M1 checkpoint:** Run focused backend and frontend tests and a local profile smoke check. Report results and changed files; wait for explicit human approval before M2.

## Phase 6: US-003 and FR-006 — Selection and README preparation (P2, M2)

**Independent test:** Select, deselect, and replace one to three distinct repositories; a fourth or unknown ID is rejected. Mocked README cases distinguish present, empty, missing, unavailable, and truncated content. AI remains uncalled.

- [X] T017 [US3] Write backend tests for selected-ID validation against the current analyzed set; README 404 as missing, blank content as empty, a single content-specific failure as unavailable, and general rate-limit/network failures as request errors; 4,000-character per-README truncation, 12,000-character total bound, and zero AI calls in `backend/tests/test_readme.py`.
- [X] T018 [US3] Add frontend tests for selecting one to three repositories, deselection/replacement, and fourth-selection prevention in `frontend/src/App.test.jsx`.
- [X] T019 [US3] Add selected-repository validation and on-demand README retrieval/preparation helpers in `backend/app/github.py`; return status, source URL, and truncation flag. Mark only content-specific single-README failures unavailable; stop on general GitHub rate limits or network failures.
- [X] T020 [US3] Implement repository selection state and a visible one-to-three limit in `frontend/src/App.jsx`; clear or mark any prior insight stale when selection changes.

**M2 checkpoint:** Run focused selection and README tests. Demonstrate selection and backend README preparation with mocked responses; wait for explicit human approval before M3.

## Phase 7: US-005 — Evidence validation (P3, M3)

**Independent test:** Given selected-project fixtures and a provider-shaped result, accept only one supported summary, zero to three supported strengths, exactly three supported recommendations, and server-allowlisted evidence IDs. Reject fabricated references and malformed or unsupported output.

- [X] T021 [US5] Write tests for claim-level citations in the one rendered summary and each single-proposition recommendation, evidence ID allowlisting and selected-repository membership, server-resolved URLs, summary/strength/recommendation counts, missing citations, invalid structure, and malicious README instructions in `backend/tests/test_insights.py`. Note that semantic support needs human review.
- [X] T022 [US5] Implement selected-project evidence IDs, claim-level structured result validation, and conservative untrusted-README prompt context in `backend/app/insights.py`; validate IDs and membership, return only evidence links created from server-side GitHub data, and leave semantic support review to the visitor.

## Phase 8: US-004 — Explicit AI generation and provider fallback (P3, M3)

**Independent test:** Profile lookup never calls AI; only a valid selection plus Generate AI Insights does. Mocked providers prove Gemini → Groq → OpenAI order, missing-key skip, invalid-key distinction, one bounded attempt each, invalid-output fallback, and factual-profile retention after failure.

- [X] T023 [US4] Write mocked provider and endpoint tests for explicit generation, structured output, provider order, missing/invalid credentials, timeout, rate limit, invalid output, no-credentials/all-fail errors, `INSUFFICIENT_EVIDENCE` with zero provider calls, and no fallback on invalid selection or general GitHub failure in `backend/tests/test_insights.py`.
- [X] T024 [US4] Implement direct-HTTP Gemini, Groq, and OpenAI adapters with server-only model/key configuration, finite timeouts, and no automatic retries in `backend/app/insights.py`; attempt each configured provider at most once in the approved order.
- [X] T025 [US4] Implement `POST /api/insights` in `backend/app/main.py`, revalidating one to three selected IDs, retrieving bounded READMEs, returning `INSUFFICIENT_EVIDENCE` before AI when substantive selected-repository evidence is absent, invoking validated provider fallback otherwise, and returning visitor-safe error codes from `contracts/api.md`.
- [X] T026 [US4] Add frontend interaction tests for a disabled Generate action with zero selected, click-only generation, claim-level evidence-linked display, provider name, README disclosures, failure retention, and stale insight on selection change in `frontend/src/App.test.jsx`.
- [X] T027 [US4] Add the explicit Generate AI Insights action and distinct AI panel in `frontend/src/App.jsx` and `frontend/src/api.js`; render cited summary claims as one summary and display only validated insights, evidence links, `provider_used`, README status/truncation, loading, and errors.

## Phase 9: Final validation — M3

**Goal:** Check the completed local MVP against the approved contract without adding scope.

- [X] T028 Run `backend/tests/test_profile.py`, `backend/tests/test_analysis.py`, `backend/tests/test_classifier.py`, `backend/tests/test_readme.py`, `backend/tests/test_insights.py`, and `frontend/src/App.test.jsx`, then perform `specs/001-github-portfolio-analyzer/quickstart.md` scenarios; report actual results and unresolved gaps before final human review.

**M3 checkpoint:** Review tests, local demo, evidence behavior, and remaining risks. Do not commit, push, or deploy without separate explicit approval.

## Dependencies and execution order

- T001 and T002 can proceed in parallel. T003 follows setup; all story phases depend on this foundation.
- M1: US-001 establishes the fetched repository contract. US-002 and US-006 then transform that set; their pure calculation/classifier tests can proceed in parallel after the contract is stable. Finish T016 and the M1 review before M2.
- M2: US-003 uses the M1 repository list. FR-006 README preparation is included here although it has no separate story. Finish T020 and the M2 review before M3.
- M3: US-005 validation is independently testable with mocked provider output and precedes US-004 provider orchestration and UI display. Finish T028 and the M3 review last.
- Within each story, write focused tests before implementation, then implement the smallest behavior needed to pass them. Parallel markers apply only to tasks with distinct files and no unfinished dependency.

## Implementation strategy

Complete M1 → test and obtain approval → complete M2 → test and obtain approval → complete M3 → test and obtain approval. M1 delivers a useful free factual portfolio view. M2 prepares selected-project evidence. M3 adds the separate, explicit AI flow. Keep each task within the approved specification; no database, visitor authentication, extra classification requests, deployment infrastructure, or unapproved feature work.
