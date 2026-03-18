/**
 * Demo API adapter: same shapes as projectsApi / customersApi / tasksApi
 * but backed by demoStore. Used by demo route tree only; never sends auth headers.
 */
import type {
  Customer,
  OnboardingStage,
  Project,
  ProjectDetail,
  ProjectSummaryResponse,
  RiskRead,
  OverdueCheckResponse,
  RiskCheckResponse,
  Recommendation,
  TaskCompleteResponse,
  SimulationRequest,
  SimulationCompareRequest,
  SimulationResponse,
  SimulationCompareResponse,
  SimulationTaskInput,
} from '../types';
import {
  getDemoCustomers,
  getDemoProjects,
  getDemoProjectDetail,
  completeTask,
  advanceStage,
  dismissRecommendation,
  getRiskRead,
  resetDemo,
} from './demoStore';
import { DEMO_QUERY_KEY_PREFIX } from './demoStore';

export { resetDemo, DEMO_QUERY_KEY_PREFIX };

// Query key helpers for demo (so we can invalidate from store subscription).
export const demoQueryKeys = {
  all: [...DEMO_QUERY_KEY_PREFIX] as const,
  projects: [...DEMO_QUERY_KEY_PREFIX, 'projects'] as const,
  project: (id: number) => [...DEMO_QUERY_KEY_PREFIX, 'project', id] as const,
  customers: [...DEMO_QUERY_KEY_PREFIX, 'customers'] as const,
};

function delay<T>(value: T, ms = 0): Promise<T> {
  return ms <= 0 ? Promise.resolve(value) : new Promise((r) => setTimeout(() => r(value), ms));
}

export const demoProjectsApi = {
  list: (): Promise<Project[]> => delay(getDemoProjects()),
  get: (id: number): Promise<ProjectDetail> => {
    const d = getDemoProjectDetail(id);
    if (!d) return Promise.reject(new Error('Project not found'));
    return delay(d);
  },
  getRisk: (id: number): Promise<RiskRead> => delay(getRiskRead(id)),
  advanceStage: (id: number) =>
    delay(advanceStage(id)),
  recommendations: (id: number): Promise<Recommendation[]> => {
    const d = getDemoProjectDetail(id);
    return delay(d?.recommendations ?? []);
  },
  dismissRecommendation: (projectId: number, recommendationId: number): Promise<Recommendation> => {
    dismissRecommendation(projectId, recommendationId);
    const d = getDemoProjectDetail(projectId);
    const r = d?.recommendations.find((x) => x.id === recommendationId);
    return delay(r ?? ({} as Recommendation));
  },
  checkOverdue: (_id: number): Promise<OverdueCheckResponse> =>
    delay({ overdue_count: 0, reminder_events_created: 0, message: 'Demo: no changes.' }),
  checkRisk: (id: number): Promise<RiskCheckResponse> => {
    const r = getRiskRead(id);
    return delay({
      risk_flag: r.risk_flag,
      was_already_flagged: r.risk_flag,
      reason: r.explanations[0] ?? null,
      message: 'Demo: risk state unchanged.',
    });
  },
  recalculateRisk: (id: number): Promise<RiskRead> => delay(getRiskRead(id)),
  getSummary: (id: number): Promise<ProjectSummaryResponse> => {
    const d = getDemoProjectDetail(id);
    return delay({
      what_is_complete: 'Demo summary.',
      what_is_blocked: d?.risk_signals?.map((s) => s.description).join(' ') ?? 'Nothing.',
      why_risk_elevated: d?.risk_flag ? 'Overdue or blocked tasks.' : 'N/A',
      what_happens_next: d?.next_best_action ?? 'Continue with tasks.',
      go_live_realistic: d?.projected_go_live_date
        ? `Projected ${new Date(d.projected_go_live_date).toLocaleDateString()}.`
        : 'Not set.',
    });
  },
};

export const demoCustomersApi = {
  list: (): Promise<Customer[]> => delay(getDemoCustomers()),
};

export const demoTasksApi = {
  complete: (taskId: number): Promise<TaskCompleteResponse> => {
    const projects = getDemoProjects();
    for (const p of projects) {
      const d = getDemoProjectDetail(p.id);
      if (d?.tasks.some((t) => t.id === taskId)) {
        const result = completeTask(p.id, taskId);
        return delay({
          ...result,
          new_stage: result.new_stage as OnboardingStage | null,
        });
      }
    }
    return Promise.reject(new Error('Task not found'));
  },
};

// Seeded AI risk summary for demo (no backend call).
const DEMO_RISK_SUMMARIES: Record<number, string> = {
  1: 'Acme Corp is on track. Kickoff is complete and setup is in progress. No blockers.',
  2: 'Northgate Industries has elevated risk: two overdue tasks and a blocker on API credentials. Recommend escalating with the customer security team and running the simulator to compare go-live scenarios.',
  3: 'Summit Labs is nearing go-live. Training is almost complete. One final session and the go-live checklist remain.',
};

export const demoAiApi = {
  getRiskSummary: (projectId: number): Promise<{ risk_summary: string }> =>
    delay({
      risk_summary: DEMO_RISK_SUMMARIES[projectId] ?? 'No AI summary for this project.',
    }),
};

// ─── Demo simulation: build baseline from project, call public backend (no auth) ─

const BASE_URL = () => import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (24 * 60 * 60 * 1000));
}

/** Build SimulationTaskInput[] from demo project detail for use in risk/compare. */
export function buildDemoBaseline(
  project: ProjectDetail,
  customerType: string
): { customer_type: string; tasks: SimulationTaskInput[] } {
  const base = project.created_at ?? project.kickoff_date ?? project.created_at;
  const now = new Date().toISOString();
  const tasks: SimulationTaskInput[] = (project.tasks ?? []).map((t) => {
    const due = t.due_date ?? base;
    const offset = Math.max(0, daysBetween(base, due));
    let delay_days = 0;
    if (t.status !== 'completed' && t.due_date && t.due_date < now) {
      delay_days = Math.max(0, daysBetween(t.due_date, now));
    }
    return {
      title: t.title,
      stage: t.stage,
      due_offset_days: offset,
      required_for_stage_completion: t.required_for_stage_completion ?? true,
      is_customer_required: t.is_customer_required ?? false,
      requires_setup_data: t.requires_setup_data ?? false,
      current_status: t.status,
      delay_days,
      criticality: 2,
      estimated_duration_days: 1,
      dependency_count: 0,
      integration_required: false,
      approval_layers: 0,
    };
  });
  return { customer_type: customerType, tasks };
}

/** Get baseline for a demo project (uses demo store only). */
export async function getDemoProjectBaseline(projectId: number): Promise<{
  customer_type: string;
  tasks: SimulationTaskInput[];
}> {
  const detail = getDemoProjectDetail(projectId);
  if (!detail) throw new Error('Project not found');
  const customers = getDemoCustomers();
  const customer = customers.find((c) => c.id === detail.customer_id);
  const customerType = customer?.customer_type ?? 'mid_market';
  return Promise.resolve(buildDemoBaseline(detail, customerType));
}

/** Run single risk simulation (public POST /simulations/risk). */
export async function runDemoSimulationRequest(
  request: SimulationRequest
): Promise<SimulationResponse> {
  const res = await fetch(`${BASE_URL()}/simulations/risk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status === 422 ? `Invalid payload: ${text}` : `Simulation failed: ${res.status}`);
  }
  return res.json() as Promise<SimulationResponse>;
}

/** Run compare simulation (public POST /simulations/risk/compare). */
export async function runDemoSimulationCompare(
  request: SimulationCompareRequest
): Promise<SimulationCompareResponse> {
  const res = await fetch(`${BASE_URL()}/simulations/risk/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status === 422 ? `Invalid payload: ${text}` : `Compare failed: ${res.status}`);
  }
  return res.json() as Promise<SimulationCompareResponse>;
}

/** Legacy: run a single simulation for project 2 (kept for backward compatibility). */
export async function runDemoSimulation(): Promise<SimulationResponse> {
  const detail = getDemoProjectDetail(2);
  const customers = getDemoCustomers();
  const customer = customers.find((c) => c.id === (detail?.customer_id ?? 2));
  const customerType = customer?.customer_type ?? 'mid_market';
  const baseline = detail ? buildDemoBaseline(detail, customerType) : { customer_type: 'mid_market' as const, tasks: [] as SimulationTaskInput[] };
  const tasks = baseline.tasks.length > 0 ? baseline.tasks : [
    { title: 'Kickoff call', stage: 'kickoff' as const, due_offset_days: 2, required_for_stage_completion: true, is_customer_required: false },
    { title: 'Environment setup', stage: 'setup' as const, due_offset_days: 5, required_for_stage_completion: true, is_customer_required: false },
    { title: 'API credentials', stage: 'setup' as const, due_offset_days: 7, required_for_stage_completion: true, is_customer_required: true },
    { title: 'Integration test', stage: 'integration' as const, due_offset_days: 12, required_for_stage_completion: true, is_customer_required: false },
  ];
  return runDemoSimulationRequest({
    customer_type: baseline.customer_type,
    tasks,
    assumptions: { customer_delay_days: 1.5, internal_delay_days: 0.5 },
  });
}
