# MVP Validation Guide

This guide defines scenarios to run after implementation; planning creates no application code. See `docs/ai-sdlc/spec.md` for acceptance criteria and `specs/001-github-portfolio-analyzer/contracts/api.md` for proposed API shapes.

## Local prerequisites

Use a supported Python 3.11+ environment and current Node.js LTS. Configure provider keys and model IDs only in the backend environment. GitHub public lookup needs no visitor login; a server-side GitHub token is optional. Never put keys in frontend variables.

Planned commands after the application and test scripts exist (run from the repository root):

```powershell
python -m pytest backend/tests
npm --prefix frontend run test -- --run
python -m uvicorn app.main:app --app-dir backend --reload
npm --prefix frontend run dev
```

The two servers run in separate terminals. The test commands are expected to cover mocked HTTP failures and the core frontend interaction; they cannot run during planning because application files do not exist yet.

## Focused checks

1. **Profile facts:** Look up a public username and equivalent profile URL. Expect the same profile, at most 100 repositories sorted by update date, labeled statistics and creation timeline, analyzed count, and subset disclosure where applicable. Confirm the lookup makes no AI request.
   Confirm Portfolio Overview appears automatically with one estimated category per fetched repository, category counts totaling the analyzed count, and a factual summary limited to analyzed repositories. Confirm no extra GitHub request or README fetch occurs for classification.
2. **Selection and README:** Select one, then three repositories; a fourth is blocked. On Generate, confirm only selected READMEs are fetched, each excerpt is at most 4,000 characters, and missing, empty, and truncated states are disclosed.
3. **AI contract:** With mocked provider responses, confirm one evidence-linked summary, zero to three strengths, exactly three recommendations, server-resolved evidence links, and `provider_used`. Reject unknown evidence IDs and malformed output.
4. **Fallback:** Mock a missing Gemini key, rejected Groq key, and successful OpenAI response. Confirm Gemini is skipped, Groq and OpenAI are each attempted once, and OpenAI is reported. Also test timeout, provider rate limit, all-fail, and no-credentials outcomes.
5. **Failure boundaries:** Check invalid input, missing profile, zero repositories, GitHub rate limit/timeout, missing README, and changed selection. Factual analysis remains visible after AI failure, and no secret appears in client output.

Run focused backend tests and a frontend smoke check for each later approved milestone. Record actual commands and results during implementation; this planning document does not claim tests have run.
