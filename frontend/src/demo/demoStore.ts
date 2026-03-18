/**
 * Demo workspace state: seeded data plus session-only mutations.
 * All mutations update in-memory state; reset() restores the canonical seed.
 */
import type {
  Customer,
  Project,
  ProjectDetail,
  Task,
  OnboardingEvent,
} from '../types';
import { STAGE_ORDER } from '../types';
import {
  DEMO_CUSTOMERS,
  DEMO_PROJECTS,
  DEMO_PROJECT_DETAILS,
  DEMO_PROJECT_IDS,
} from './demoSeedData';

export const DEMO_QUERY_KEY_PREFIX = ['demo'] as const;

function deepCloneSeed(): {
  customers: Customer[];
  projects: Project[];
  projectDetails: Record<number, ProjectDetail>;
} {
  const customers = JSON.parse(JSON.stringify(DEMO_CUSTOMERS)) as Customer[];
  const projects = JSON.parse(JSON.stringify(DEMO_PROJECTS)) as Project[];
  const projectDetails = JSON.parse(
    JSON.stringify(Object.fromEntries(DEMO_PROJECT_IDS.map((id) => [id, DEMO_PROJECT_DETAILS[id]])))
  ) as Record<number, ProjectDetail>;
  return { customers, projects, projectDetails };
}

let state = deepCloneSeed();
const listeners = new Set<() => void>();

function getState() {
  return state;
}

function setState(next: typeof state) {
  state = next;
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDemoCustomers(): Customer[] {
  return getState().customers;
}

export function getDemoProjects(): Project[] {
  return getState().projects;
}

export function getDemoProjectDetail(id: number): ProjectDetail | undefined {
  return getState().projectDetails[id];
}

export function resetDemo(): void {
  setState(deepCloneSeed());
}

function getDetail(projectId: number): ProjectDetail | undefined {
  return getState().projectDetails[projectId];
}

function writeDetail(projectId: number, detail: ProjectDetail): void {
  const s = getState();
  setState({
    ...s,
    projectDetails: { ...s.projectDetails, [projectId]: detail },
  });
}

function writeProject(projectId: number, updates: Partial<Project>): void {
  const s = getState();
  const projects = s.projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p));
  const existing = s.projectDetails[projectId];
  if (existing) {
    setState({
      ...s,
      projects,
      projectDetails: { ...s.projectDetails, [projectId]: { ...existing, ...updates } },
    });
  } else {
    setState({ ...s, projects });
  }
}

export function completeTask(projectId: number, taskId: number): {
  task: Task;
  stage_advanced: boolean;
  new_stage: string | null;
  project_completed: boolean;
  message: string;
} {
  const detail = getDetail(projectId);
  if (!detail) {
    throw new Error(`Project ${projectId} not found`);
  }
  const task = detail.tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  const now = new Date().toISOString();
  const tasks = detail.tasks.map((t) =>
    t.id === taskId
      ? { ...t, status: 'completed' as const, completed_at: now, updated_at: now }
      : t
  );
  const events = [
    ...detail.events,
    {
      id: detail.events.length + 1,
      project_id: projectId,
      task_id: taskId,
      event_type: 'task_completed' as const,
      message: task.title,
      created_at: now,
    } as OnboardingEvent,
  ];
  const stageTasks = tasks.filter((t) => t.stage === detail.current_stage);
  const allStageComplete =
    stageTasks.length > 0 &&
    stageTasks.every((t) => t.status === 'completed');
  let newStage: string | null = null;
  let projectCompleted = false;
  if (allStageComplete) {
    const idx = STAGE_ORDER.indexOf(detail.current_stage);
    if (idx >= 0 && idx < STAGE_ORDER.length - 1) {
      newStage = STAGE_ORDER[idx + 1];
      writeProject(projectId, { current_stage: STAGE_ORDER[idx + 1] });
      events.push({
        id: events.length + 1,
        project_id: projectId,
        task_id: null,
        event_type: 'project_advanced',
        message: `Stage advanced to ${newStage}`,
        created_at: now,
      } as OnboardingEvent);
    } else if (idx === STAGE_ORDER.length - 1) {
      projectCompleted = true;
      writeProject(projectId, { status: 'completed' as const });
    }
  }
  writeDetail(projectId, {
    ...detail,
    tasks,
    events,
    ...(newStage ? { current_stage: newStage as Project['current_stage'] } : {}),
    ...(projectCompleted ? { status: 'completed' as const } : {}),
  });
  const updatedTask = tasks.find((t) => t.id === taskId)!;
  return {
    task: updatedTask,
    stage_advanced: allStageComplete && !!newStage,
    new_stage: newStage,
    project_completed: projectCompleted,
    message: projectCompleted ? 'Project completed.' : allStageComplete ? 'Stage advanced.' : 'Task completed.',
  };
}

export function advanceStage(projectId: number): {
  advanced: boolean;
  new_stage: string | null;
  project_completed: boolean;
  message: string;
} {
  const detail = getDetail(projectId);
  if (!detail) {
    throw new Error(`Project ${projectId} not found`);
  }
  const idx = STAGE_ORDER.indexOf(detail.current_stage);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) {
    return {
      advanced: false,
      new_stage: null,
      project_completed: detail.status === 'completed',
      message: 'Already at final stage.',
    };
  }
  const newStage = STAGE_ORDER[idx + 1];
  const now = new Date().toISOString();
  writeProject(projectId, { current_stage: newStage });
  const updated = getDetail(projectId)!;
  const events = [
    ...updated.events,
    {
      id: updated.events.length + 1,
      project_id: projectId,
      task_id: null,
      event_type: 'project_advanced' as const,
      message: `Stage advanced to ${newStage}`,
      created_at: now,
    } as OnboardingEvent,
  ];
  writeDetail(projectId, { ...updated, events });
  return {
    advanced: true,
    new_stage: newStage,
    project_completed: false,
    message: `Advanced to ${newStage}.`,
  };
}

export function dismissRecommendation(projectId: number, recommendationId: number): void {
  const detail = getDetail(projectId);
  if (!detail) return;
  const recommendations = detail.recommendations.map((r) =>
    r.id === recommendationId ? { ...r, dismissed: true } : r
  );
  writeDetail(projectId, { ...detail, recommendations });
}

// Recalculate risk for demo: return current stored risk (no real computation).
export function getRiskRead(projectId: number): {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_flag: boolean;
  explanations: string[];
} {
  const detail = getDetail(projectId);
  if (!detail) {
    throw new Error(`Project ${projectId} not found`);
  }
  const signals = (detail.risk_signals ?? []).map((s) => s.description);
  return {
    risk_score: detail.risk_score ?? 0,
    risk_level: detail.risk_level ?? 'low',
    risk_flag: detail.risk_flag ?? false,
    explanations: signals.length > 0 ? signals : ['No risk signals.'],
  };
}
