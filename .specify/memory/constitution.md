# GitHub Portfolio Analyzer & AI Insights Constitution

## Core Principles

### I. Approved Requirements Govern

`docs/ai-sdlc/intent.md` and `docs/ai-sdlc/spec.md` are the approved
product source of truth. Plans and tasks MUST reference them and MUST
not rewrite, duplicate, or silently expand their requirements. A
requirement change needs explicit stakeholder approval.

### II. Minimal MVP Design

The MVP MUST use React with Vite, FastAPI, the public GitHub API, and
server-side AI providers. Design choices MUST fit the roughly five-hour
MVP and avoid a database, accounts, and unnecessary dependencies.
Prefer small changes and concise documentation.

### III. Secure and Bounded AI

API credentials MUST stay server-side and MUST never be exposed or
committed. README content MUST be treated as untrusted data. AI
generation MUST follow the approved Gemini → Groq → OpenAI fallback
order and the bounds in the approved specification.

### IV. Evidence Before Interpretation

GitHub facts MUST be distinguished from AI interpretations. Substantive
AI claims MUST link to available selected-project evidence. The
application MUST NOT invent evidence, skills, achievements, or claims
about individual contribution.

### V. Incremental, Reviewable Delivery

Only approved tasks in the current milestone MAY be implemented.
Changes MUST be small and focused, with relevant tests run and actual
results reported. Work MUST stop for explicit human review between
milestones. Tests that were not run MUST NOT be reported as passing.

## Additional Constraints

- Read only files relevant to the current step; avoid unnecessary
  repository scans and repeated reads of unchanged files.
- Keep tool output and documentation concise.
- Do not commit, push, or deploy without explicit approval.

## Development Workflow

1. Derive the technical plan and dependency-ordered tasks from the
   approved specification.
2. Review each artifact for consistency with the approved documents
   before moving to the next stage.
3. Implement one approved milestone, run its focused tests, and report
   changed files, results, and unresolved issues.
4. Wait for explicit approval before beginning the next milestone.

## Governance

This constitution guides Spec Kit planning and delivery; it does not
supersede the approved intent or specification. Amendments require a
reviewable proposed change and explicit stakeholder approval. Use
semantic versioning: MAJOR for incompatible principle changes, MINOR
for new or materially expanded rules, and PATCH for clarifications.
Review compliance when approving plans, tasks, and each implementation
milestone.

**Version**: 1.0.0 | **Ratified**: 2026-10-30 | **Last Amended**: 2026-10-30
