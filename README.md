# CitationX

Production-ready scaffolding for a legal research web app with a Next.js + Tailwind frontend and a FastAPI backend.

## Stack
- Frontend: Next.js (App Router, TypeScript) + Tailwind CSS
- Backend: FastAPI with CORS enabled
- Python 3.10+, Node 18+

## Project layout
- `frontend/` — Next.js app (runs on `localhost:3000`)
- `backend/` — FastAPI app (runs on `localhost:8000`)

## Environment
Copy the sample env files and adjust as needed:
- `cp frontend/.env.example frontend/.env.local`
- `cp backend/.env.example backend/.env`

Key variables:
- `NEXT_PUBLIC_API_BASE_URL` — frontend API target (default `http://localhost:8000`)
- `APP_ENV`, `PORT`, `ALLOWED_ORIGINS` — backend runtime settings
- `GEMINI_API_KEY` — optional; enables Gemini summaries for judgments

## Run locally
Frontend:
```bash
cd frontend
npm install
npm run dev
# available at http://localhost:3000
```

Backend:
```bash
cd backend
python -m venv .venv
.\\.venv\\Scripts\\activate  # on Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# health: http://localhost:8000/health -> {"status": "ok"}
# judgment fetch: http://localhost:8000/judgment?url=...
# judgment selection: http://localhost:8000/judgment/select?url=...&q=...
# judgment summarize (uses Gemini if configured, falls back if not): http://localhost:8000/judgment/summarize?url=...&q=...
```

## Deploy
- Frontend: Vercel config in `vercel.json` (monorepo pointing to `frontend/`).
- Backend: Render service config in `render.yaml` (runs uvicorn in `backend/`).

## Notes
- No scraping beyond polite single-page fetches.
- Keep dependencies lean; add new packages only when necessary.
