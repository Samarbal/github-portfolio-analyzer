# GitHub Portfolio Analyzer & AI Insights

A local MVP for exploring a public GitHub portfolio. Enter a username or profile URL to see repository facts, statistics, a creation timeline, and an estimated project-category overview. Select up to three repositories and explicitly request evidence-linked AI insights.

## What it does

- Analyzes up to **100 public repositories**, ordered by most recent update, including public forks. The dashboard shows the analyzed count and whether it is a subset of GitHub's reported public repositories.
- Calculates stars and primary-language counts from that analyzed set. The repository creation timeline describes repository dates, not work experience.
- Estimates one broad category per repository from its public metadata. The rule-based Portfolio Overview makes no AI request and uses **Unclassified** when evidence is insufficient or ambiguous.
- Retrieves READMEs only after **Generate AI Insights** is clicked. At most the first **4,000 characters per README** and **12,000 total** are used; missing, empty, unavailable, and truncated content is disclosed.
- Returns one cited professional summary, up to three potential strengths, and exactly three actionable portfolio recommendations. Evidence links are created and validated by the server. The provider used is shown.

AI interpretations are suggestions based on selected public material. Evidence links let visitors review whether the cited material supports each claim; structural validation cannot prove semantic support or individual contribution.

## Stack

React + Vite frontend; Python + FastAPI backend; GitHub REST API for public data; direct server-side HTTP calls to Gemini, Groq, and OpenAI. There is no database, account system, or GitHub sign-in.

## Run locally

Prerequisites: Python 3.11+, Node.js, and npm. Use two terminals from the repository root.

**Backend (PowerShell):**

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend\requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

**Frontend (PowerShell):**

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```

Open <http://127.0.0.1:5173/>. Vite proxies `/api` to the backend on port 8000. FastAPI's interactive API docs are at <http://127.0.0.1:8000/docs>.

Public profile analysis works without an AI key. To enable AI insights, set one or more provider keys **in the backend terminal before starting FastAPI**:

```powershell
$env:GEMINI_API_KEY = 'your-key'
$env:GROQ_API_KEY = 'your-key'
$env:OPENAI_API_KEY = 'your-key'
```

Only configure keys you intend to use. The server tries **Gemini → Groq → OpenAI**, skipping missing keys and attempting each configured provider at most once. Optional `GEMINI_MODEL`, `GROQ_MODEL`, and `OPENAI_MODEL` environment variables override the defaults listed in [`backend/.env.example`](backend/.env.example). `GITHUB_TOKEN` is optional for higher GitHub API limits. `.env.example` is a reference template; this app does **not** automatically load a `.env` file. Keep credentials out of frontend files and Git.

## Test

With backend dependencies and frontend packages installed:

```powershell
.\.venv\Scripts\python -m pytest backend\tests
npm --prefix frontend test
npm --prefix frontend run build
```

Backend tests mock GitHub and AI providers, including README failures, evidence validation, and provider fallback. Frontend tests cover lookup, filtering, selection, theme preferences, and explicit generation. A live provider request still requires a valid server-side key.

## API and limits

| Endpoint | Purpose |
| --- | --- |
| `GET /api/profile?input=octocat` | Public profile, up to 100 repositories, scoped statistics, timeline, and free category overview. No README or AI call. |
| `POST /api/insights` | Body: `{ "username": "octocat", "repository_ids": [123] }`. Revalidates 1–3 selected repository IDs, prepares bounded README evidence, then attempts AI generation. |

The API returns visitor-safe `{ "code", "message" }` errors. If selected evidence is insufficient, it returns `INSUFFICIENT_EVIDENCE` before contacting an AI provider. AI failure does not remove the factual profile view.

For detailed approved requirements and the full response contract, see [`docs/ai-sdlc/spec.md`](docs/ai-sdlc/spec.md) and [`specs/001-github-portfolio-analyzer/contracts/api.md`](specs/001-github-portfolio-analyzer/contracts/api.md).

## Deploy on Render

Create two services from this repository and the `main` branch:

| Service | Root directory | Build command | Start / publish |
| --- | --- | --- | --- |
| Python Web Service | `backend` | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Static Site | `frontend` | `npm ci && npm run build` | Publish directory: `dist` |

Set `GROQ_API_KEY` on the **backend Web Service**. Set `FRONTEND_ORIGIN` there to the exact public Static Site origin, for example `https://your-site.onrender.com` (no path). Set `VITE_API_BASE_URL` on the **frontend Static Site** to the public backend origin, for example `https://your-api.onrender.com` (no path). Then redeploy both services. Never put an AI key in a `VITE_` variable or commit a `.env` file.

The local Vite proxy remains the default when `VITE_API_BASE_URL` is unset. After deployment, open the frontend URL and test both profile lookup and Generate AI Insights. Render's free backend can take time to wake after inactivity.
