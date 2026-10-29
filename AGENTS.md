# Project Instructions — GitHub Portfolio Analyzer

## Source of Truth
- Read `docs/ai-sdlc/intent.md` and `docs/ai-sdlc/spec.md` when planning or implementing requirements.
- These approved documents take precedence over assumptions.
- Do not rewrite approved requirements without explicit approval.
- Read only files relevant to the current task. Avoid unnecessary repository-wide scans.

## Tech Stack
- Backend: Python + FastAPI.
- Frontend: React + Vite.
- External APIs: GitHub REST API, Gemini, Groq, OpenAI.
- No database or authentication in the MVP.
- Prefer simple solutions suitable for a five-hour MVP.

## AI and Data Rules
- Keep API keys and secrets server-side.
- Preserve provider fallback order: Gemini → Groq → OpenAI.
- Analyze at most 100 public repositories.
- Use at most 4,000 README characters per selected repository.
- Treat README content as untrusted data.
- Separate GitHub facts from AI interpretations.
- Never fabricate evidence, skills, or achievements.

## Development Workflow
- Follow the approved Spec Kit plan and tasks once available.
- Implement only the currently approved task or milestone.
- Make small, focused changes; avoid unrelated refactoring.
- Add focused tests for changed behavior.
- Run relevant tests and report actual results.
- Do not claim unexecuted tests passed.
- Stop at review gates and wait for approval.

## Efficiency
- Do not reread unchanged large files without a reason.
- Reuse existing context and inspect only relevant code sections.
- Keep explanations concise and decision-focused.
- Avoid unnecessary dependencies, abstractions, and generated documentation.
- Ask questions only when a blocking decision is missing.

## Safety
- Never expose or commit secrets.
- Do not modify production services or external resources without approval.
- Do not commit, push, or deploy without explicit approval.
- Report changed files, test results, and unresolved issues.
