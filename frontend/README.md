# Agile — Onboarding Workflow Engine (Frontend)

A clean internal-tool frontend for the Agile onboarding workflow engine. Built with React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, and React Router v6.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Build | Vite 8 |
| Routing | React Router v6 |
| Server state | TanStack Query |
| Styling | Tailwind CSS v3 |
| Icons | Lucide React |

---

## Project Structure

```
frontend/src/
├── api/
│   ├── client.ts          # Base fetch wrapper with error handling
│   ├── customers.ts       # Customer API helpers
│   ├── projects.ts        # Project API helpers
│   ├── tasks.ts           # Task API helpers
│   └── seed.ts            # Seed endpoint helper
├── types/
│   └── index.ts           # TypeScript types matching backend schemas
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx  # Root layout with sidebar
│   │   ├── Sidebar.tsx    # Navigation sidebar
│   │   └── Topbar.tsx     # Page header bar
│   └── ui/
│       ├── StatusBadge.tsx    # Badge variants for status/stage/type
│       ├── StatCard.tsx       # Metric stat card
│       ├── StageProgress.tsx  # Stage stepper component
│       ├── EventFeed.tsx      # Workflow event timeline
│       ├── Modal.tsx          # Accessible dialog modal
│       ├── CustomerForm.tsx   # Create customer form
│       ├── ProjectForm.tsx    # Create project form
│       ├── EmptyState.tsx     # Empty state component
│       ├── LoadingSpinner.tsx # Spinner + page loading
│       └── ErrorAlert.tsx     # Error message component
└── pages/
    ├── Dashboard.tsx      # Overview with stats + recent projects
    ├── Customers.tsx      # Customer list + create
    ├── Projects.tsx       # Project table + create
    └── ProjectDetail.tsx  # Full project view with tasks + events
```

---

## Local Setup

### 1. Start the backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
# Backend runs at http://127.0.0.1:8000
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

### 3. Seed sample data

Once both are running, click **Seed Database** on the dashboard, or run:

```bash
curl -X POST http://127.0.0.1:8000/seed
```

---

## Pages

| Route | Description |
|---|---|
| `/dashboard` | Overview stats, recent projects, quick links |
| `/customers` | Customer list + create customer modal |
| `/projects` | Project table + create project modal |
| `/projects/:id` | Project detail — tasks, stage progress, event feed |

---

## API Configuration

The frontend reads `VITE_API_URL` from `.env.local` (defaults to `http://127.0.0.1:8000`).

To point to a different backend:

```bash
# frontend/.env.local
VITE_API_URL=https://your-api.example.com
```
