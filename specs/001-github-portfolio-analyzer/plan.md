# Implementation Plan: GitHub Portfolio Analyzer & AI Insights

**Branch**: 001-github-portfolio-analyzer (feature context; no Git branch implied) | **Date**: 2026-10-30 | **Spec**: docs/ai-sdlc/spec.md

**Input**: specs/001-github-portfolio-analyzer/spec.md is a reference entry. The approved docs/ai-sdlc/intent.md and docs/ai-sdlc/spec.md supply all requirements; this plan does not add product scope.

## Summary

Build a local React + Vite interface and a FastAPI service for public GitHub profile analysis. The initial lookup returns factual profile, repository, statistic, creation timeline, and deterministic Portfolio Overview data. A separate explicit Generate AI Insights action validates one to three selected repositories, retrieves bounded README excerpts, and returns evidence-linked structured insights through Gemini → Groq → OpenAI fallback.

## Technical Context

**Language/Version**: Python 3.11+ backend; current supported Node.js LTS with React and Vite frontend.
**Primary Dependencies**: FastAPI, HTTPX, Pydantic; React and Vite. Pytest and FastAPI test client for focused backend tests; Vitest with a DOM test environment for one frontend interaction test. No AI SDK is required.
**Storage**: None; requests are stateless.
**Testing**: Mock GitHub and AI HTTP responses in focused Pytest cases; test classifier matches, ambiguity, language-only metadata, zero repositories, subset counts, and that classification adds no GitHub, README, or AI requests to profile lookup. Use focused frontend interaction tests for selection, stale insight, and explicit generation, plus a local smoke check.
**Target Platform**: Local browser and local FastAPI server on Windows for the MVP.
**Project Type**: Web application with frontend and backend.
**Performance Goals**: Show loading states for both network phases; no fixed latency promise for external APIs.
**Constraints**: At most 100 public repositories, three selected repositories, 4,000 README characters each, 12,000 README characters total, one attempt per configured AI provider with a finite timeout.
**Scale/Scope**: One public profile and its selected projects per visitor request; no persistence or accounts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Approved intent and specification remain authoritative; the feature-local entry is only a pointer. PASS.
- React + Vite, FastAPI, public GitHub API, server-side AI, and no database or account system. PASS.
- Gemini → Groq → OpenAI order, bounded attempts, protected credentials, and untrusted README handling. PASS.
- GitHub facts and AI interpretation remain separate, with allowlisted evidence references. PASS.
- Design permits focused tests and human review between later implementation milestones. PASS.
- No unrelated files, new product requirements, or deployment work. PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-github-portfolio-analyzer/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── api.md
└── quickstart.md
```

The later tasks.md is generated only after story priorities are reviewed.

### Source Code (repository root)

```text
backend/
├── app/
│   ├── main.py
│   ├── github.py
│   ├── classifier.py
│   ├── insights.py
│   └── models.py
└── tests/
frontend/
├── src/
│   ├── App.jsx
│   ├── api.js
│   └── styles.css
└── package.json
```

**Structure Decision**: A small backend module per external responsibility and one frontend screen are sufficient. These are proposed future paths, not files created during planning.

## Design Decisions

1. **Profile lookup**: GET the public GitHub user, then GET the first 100 owned public repositories sorted by updated time descending. Include forks. Use the returned set for stars, primary-language counts, latest repository update date, the creation timeline, and Portfolio Overview. Display analyzed count, GitHub's reported public count, and subset status. Never infer coding activity or experience from dates.
2. **Portfolio Overview**: A small pure classifier assigns one estimated category per fetched repository. Match normalized whole words or phrases, never substrings. The fixed map is: Web app (`web-app`, `website`, `frontend`, `dashboard`); API or service (`api`, `backend`, `server`, `microservice`); Data or AI (`machine-learning`, `ai`, `data-analysis`, `nlp`); Developer tool (`cli`, `developer-tool`, `linter`, `automation`); Mobile app (`mobile-app`, `android`, `ios`, `react-native`). Check topics first, then name and description; a match at the higher level takes precedence. Multiple categories at the strongest matching level, or no match, yield Unclassified. Primary language may corroborate but never determine or break a tie. Count only fetched repositories and render a deterministic sentence about their estimated categories, without claims about the owner. Classification adds no GitHub, README, or AI request. Test category matches, precedence, ambiguity, whole-word boundaries, language-only evidence, zero repositories, subset counts, and outbound request counts.
3. **Selection and README**: Selection lives in React and is capped at three. The backend re-fetches the current top-100 set during generation to validate selected IDs rather than trusting client claims. Retrieve README content only after the explicit Generate AI Insights click. README 404 means `missing`; a successful blank response means `empty`. A content-specific failure for one README, such as malformed content or a single README 5xx, means `unavailable` and is disclosed while sufficiently substantive metadata or other selected-repository evidence may still be used. Profile/repository lookup failure, general GitHub rate limit, or network failure stops generation before AI with a clear GitHub error. Decode text, preserve original order, and send only the first 4,000 characters per README to AI, at most 12,000 total; disclose truncation.
4. **AI request**: Build an evidence allowlist from selected repository metadata and available README excerpts. Before any provider call, require at least one nonempty README excerpt, description, or topic and enough substantive evidence for the claims requested; name or URL alone cannot justify claims about the owner, and primary language alone does not satisfy this preflight. If the minimum is absent, return `INSUFFICIENT_EVIDENCE`. Pass data as untrusted context. Request one summary composed of individually cited short claims, zero to three potential strengths, and exactly three single-proposition actionable recommendations with evidence IDs. Provider model IDs and keys are server configuration. Use direct HTTP with finite per-provider timeouts and no automatic retries. Skip missing keys; try each configured provider at most once in Gemini → Groq → OpenAI order after invalid credentials, timeout, service or rate-limit error, or invalid output. Never fall back for invalid selection or GitHub evidence retrieval errors.
5. **Validation**: Normalize provider output to one internal schema. Validate shape, counts, nonempty text, claim-level citations, and all evidence IDs against the server-generated allowlist and selected-repository membership before returning it. Each recommendation is one actionable proposition with its own citations; reject uncited extra factual assertions. Resolve evidence URLs server-side. Do not accept client-supplied URLs or README content as evidence. Prompt for conservative, evidence-backed wording; deterministic validation checks IDs and membership but cannot prove semantic support, so linked source text remains visible for human review.
6. **UI**: One page with input, factual profile summary, clearly labeled statistics, creation timeline, and estimated Portfolio Overview, selectable repositories, and a distinct AI insights panel. Show loading, empty, subset, truncation, and error states. Clear or mark insights stale when selection changes. The initial profile lookup never calls an AI provider.

## Constitution Check After Design

PASS: The design uses the approved stack and limits, keeps keys server-side, preserves provider order, separates facts from interpretation, and leaves implementation gated by later approved tasks and milestone reviews. No justified violations or unresolved requirement clarifications.
