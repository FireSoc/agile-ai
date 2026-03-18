# Agile — Onboarding Ops Co-pilot (Frontend)

React SPA for the Agile onboarding ops co-pilot: landing, auth (Supabase), public demo at `/demo`, and signed-in app (dashboard, projects, playbooks, simulator, pipeline). Built with React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, and React Router v7.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Build | Vite 8 |
| Routing | React Router v7 |
| Server state | TanStack Query |
| Styling | Tailwind CSS v3 |
| Icons | Lucide React |

---

## IMPORTANT — Run commands from the correct directory

The `package.json` lives inside `frontend/`. Running `npm run dev` from the repo root will fail with `ENOENT: no such file or directory, open '.../package.json'`.

**Always `cd frontend` first.**

---

## Local Setup

### 1. Start the backend

From repo root, see **Running locally** in the root `README.md`. In short:

```bash
cd backend
source venv/bin/activate   # after creating venv and pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
# Backend runs at http://127.0.0.1:8000 — docs at http://127.0.0.1:8000/docs
```

### 2. Start the frontend

```bash
# from repo root
cd frontend
npm install     # only needed once / after dependency changes
npm run dev
# Frontend runs at http://localhost:5173
```

### 3. Seed sample data

Once both are running, click **Seed Database** on the dashboard, or run:

```bash
curl -X POST http://127.0.0.1:8000/seed
```

---

## Project structure

```
frontend/src/
├── api/                   # Backend API clients
│   ├── client.ts
│   ├── customers.ts, projects.ts, tasks.ts, seed.ts
│   ├── playbooks.ts, simulations.ts, ai.ts
│   ├── portal.ts, crm.ts, accounts.ts
│   └── ...
├── demo/                  # Public /demo — stateless seeded workspace
│   ├── DemoProvider.tsx, DemoLayout.tsx, DemoSidebar.tsx
│   ├── DemoChecklist.tsx, DemoTourOverlay.tsx, DemoPromptBanner.tsx
│   ├── demoApi.ts, demoStore.ts, demoSeedData.ts
│   └── pages/             # DemoDashboard, DemoProjects*, DemoProjectDetail, etc.
├── contexts/
│   └── AuthContext.tsx    # Supabase auth
├── lib/
│   ├── supabase.ts
│   └── utils.ts
├── types/
│   └── index.ts
├── components/
│   ├── layout/            # AppLayout, Sidebar, Topbar, PageContainer, etc.
│   └── ui/                # StatusBadge, StageProgress, EventFeed, forms, simulation panels, etc.
└── pages/
    ├── Landing.tsx, Login.tsx, Signup.tsx
    ├── Dashboard.tsx, Customers.tsx, ProjectsLanding.tsx, Projects.tsx
    ├── ProjectDetail.tsx, ProjectTasks.tsx
    ├── PlaybookInspector.tsx, Simulator.tsx, Pipeline.tsx
    ├── ImportDeal.tsx, CustomerPortalProject.tsx, Settings.tsx
    └── ...
```

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing; link to **Try interactive demo** and sign-in |
| `/login`, `/signup` | Auth (Supabase) |
| `/portal/projects/:id` | Customer portal (shareable, no auth) |
| **Demo** (no auth) | |
| `/demo` | Demo layout; redirects to `/demo/dashboard` |
| `/demo/dashboard` | Demo overview |
| `/demo/projects`, `/demo/projects/:id`, `/demo/projects/:id/tasks` | Demo projects |
| `/demo/customers`, `/demo/simulator`, `/demo/playbooks` | Demo customers, simulator, playbooks |
| **App** (signed-in) | |
| `/dashboard` | Overview, seed action, quick links |
| `/customers` | Customer list + create |
| `/projects`, `/projects/list` | Projects landing and list |
| `/projects/:id`, `/projects/:id/tasks` | Project detail and tasks |
| `/playbooks` | Playbook inspector |
| `/simulator` | Decision sandbox — tasks, simulation, branch compare |
| `/pipeline` | Pipeline view |
| `/deals/import` | Import deal |
| `/settings` | Settings |

---

## Simulator (decision sandbox)

The **Simulator** (`/simulator` or `/demo/simulator`) lets you define an ad-hoc workflow, score its risk without any live customer data, and compare baseline vs alternative scenarios.

### Quick demo (your March 19/22/24 example)

1. Navigate to `/simulator`.
2. Add three tasks:
   - "Intro Email" — day 0, criticality 1
   - "Request Documents" — day 3, customer-required, criticality 4
   - "First Sales Pitch Meeting" — day 5, setup-data required, criticality 4
3. Set customer delay assumption to `1` day.
4. Click **Run Simulation** to see risk bands and inbox preview.
5. Click **Add Branch** → set customer delay to `3` days → **Run Compare** to see the risk delta.

### API payload examples (for Swagger / direct testing)

**Single simulation:**
```json
POST http://127.0.0.1:8000/simulations/risk
{
  "customer_type": "smb",
  "assumptions": { "customer_delay_days": 1, "internal_delay_days": 0.5 },
  "tasks": [
    {
      "title": "Request Documents",
      "stage": "kickoff",
      "due_offset_days": 3,
      "is_customer_required": true,
      "criticality": 4,
      "estimated_duration_days": 1,
      "dependency_count": 1,
      "integration_required": false,
      "approval_layers": 0
    }
  ]
}
```

**Branch compare:**
```json
POST http://127.0.0.1:8000/simulations/risk/compare
{
  "customer_type": "smb",
  "baseline_tasks": [ ...same task list... ],
  "baseline_assumptions": { "customer_delay_days": 1 },
  "branches": [
    {
      "name": "slow-customer",
      "assumptions_override": { "customer_delay_days": 3 }
    },
    {
      "name": "early-request",
      "task_overrides": [
        { "title": "Request Documents", "due_offset_days": 1, ... }
      ]
    }
  ]
}
```

---

## API Configuration

The frontend reads `VITE_API_URL` from `.env.local` (defaults to `http://127.0.0.1:8000`).

```bash
# frontend/.env.local
VITE_API_URL=https://your-api.example.com
```

---

## Development Commands

All commands must be run from `frontend/`:

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # TypeScript check + production build
npm run lint      # ESLint
npm run preview   # Preview production build locally
```
