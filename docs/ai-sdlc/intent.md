# GitHub Portfolio Analyzer & AI Insights — Product Intent

## Problem

A public GitHub profile contains useful evidence of a developer’s work, but visitors must inspect many repositories to understand their activity, projects, and strengths. Developers also need help spotting gaps in how they present their work.

## Users and value

- **Developers** get a quick view of their public portfolio and practical ways to improve it.
- **Recruiters and reviewers** get a concise overview with links back to the underlying GitHub evidence.

## Goal

Build a portfolio worthy MVP in roughly **five hours**. A visitor enters a public GitHub username or profile URL, reviews profile insights, selects up to three repositories, and receives an evidence based AI summary and recommendations.

## MVP scope

1. Accept a GitHub username or profile URL; analyze public data without GitHub sign-in.
2. Analyze up to 100 public repositories. Show profile details and simple repository statistics, such as repository count, languages, stars, and recent activity where available. Clearly disclose how many repositories were analyzed and whether the results represent a subset of the user's public repositories.
3. Show a public project timeline based on repository creation dates. Label it clearly as a **repository creation timeline**, not a complete history of the developer’s work.
4. Let the visitor select up to three public repositories and analyze their README files.
5. Generate a concise AI summary of the selected projects and actionable portfolio recommendations. Tie substantive claims to specific repositories or README evidence, with links to GitHub. Generate AI insights only after the visitor explicitly selects repositories and clicks **Generate AI Insights**. Do not call AI providers during the initial GitHub profile lookup.
6. Support Gemini, Groq, and OpenAI through server-side API keys, with fallback order Gemini → Groq → OpenAI. Show which provider generated the result. If AI is unavailable, keep the factual profile and repository analysis usable.

## Boundaries

- No database, account system, GitHub sign-in, private repositories, or saved reports.
- No claims about code quality, individual contribution, or professional skill that the available public data cannot support.
- No full commit or contribution history in this MVP.

## Technical constraints

- FastAPI and Python backend; Vite and React frontend.
- GitHub API for public profile and repository data.
- Keep provider keys on the server. Handle missing README files, unavailable AI providers, and GitHub API errors clearly.

## Assumptions to validate during specification

- “Recent activity” uses public repository metadata available through the chosen GitHub API requests.
- The five-hour target includes a working local demo and basic setup instructions; deployment is outside this initial scope.

## Success criteria

A visitor can analyze a public profile, understand the displayed statistics and timeline, see the analyzed repository count and whether it is a subset, select up to three projects, and explicitly request useful AI insights with traceable evidence. The initial profile lookup does not call an AI provider, and the app remains useful when AI generation fails.
