<div align="center">
  <img src="frontend/public/agile-logo.png" alt="Agile logo" width="200" />
</div>

# Agile — Onboarding Ops Co-pilot

An AI-assisted onboarding ops co-pilot that helps teams run and automate customer onboarding workflows: playbook-driven projects, risk and next-best actions, and a single place to see what needs attention.

**Audience:** CS, onboarding, and implementation teams who turn won deals into structured onboarding projects and want to avoid stalls and missed go-lives.

| Layer   | Stack |
|--------|--------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router |
| Backend  | FastAPI, SQLAlchemy 2, Pydantic v2, PostgreSQL |

---

## Project layout

| Directory | Purpose |
|-----------|---------|
| **Root** | This README, `docker-compose.yml`, `docs/` (product focus, playbooks). Run backend/frontend from their own directories. |
| **frontend/** | React SPA: landing, auth (Supabase), demo at `/demo`, and signed-in app (dashboard, projects, playbooks, simulator, pipeline). See `frontend/README.md`. |
| **backend/** | FastAPI API: customers, projects, tasks, workflow templates, risk, seed, AI. See `backend/README.md`. |

---

## Running locally

Run **backend first**, then the **frontend**. Use the directories below; do not run from repo root.

### 1. Backend

You need a running **PostgreSQL** database. Create a database (e.g. `createdb agile`) and set `DATABASE_URL` in `backend/.env` (see `backend/.env.example`).

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head      # create tables
uvicorn app.main:app --reload
```

On startup, the backend seeds default playbooks automatically so all users have access. API: **http://127.0.0.1:8000**  
- Docs: **http://127.0.0.1:8000/docs**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: **http://localhost:5173**

`package.json` is in `frontend/`; running `npm run dev` from the repo root will fail.

### 3. Public demo (no login)

From the homepage, click **Try interactive demo** to open a stateless demo at **http://localhost:5173/demo**. You get a seeded workspace with 3 sample projects at different onboarding stages. All changes are in-memory and reset when you refresh or click **Reset demo**. The demo includes a short guided tour; use **Explore freely** to dismiss it.

### 4. Seed data (optional, for signed-in app)

With both running and a signed-in user, use **Seed Database** on the dashboard if your instance exposes it, or call the backend seed endpoint if available (see `backend/README.md`).

---

See **Running with Docker** in `backend/README.md` for a one-command stack. See `docs/PRODUCT_FOCUS.md` for product direction; see `frontend/README.md` and `backend/README.md` for detailed setup and structure.
