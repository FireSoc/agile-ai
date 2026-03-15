// ─── Enums ────────────────────────────────────────────────────────────────────

export type CustomerType = 'smb' | 'enterprise';

export type OnboardingStage = 'kickoff' | 'setup' | 'training' | 'go_live';

export type ProjectStatus = 'active' | 'at_risk' | 'blocked' | 'completed';

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'blocked';

export type EventType =
  | 'project_created'
  | 'tasks_generated'
  | 'task_completed'
  | 'project_advanced'
  | 'reminder_triggered'
  | 'risk_flag_added'
  | 'risk_flag_cleared'
  | 'project_completed'
  | 'stage_blocked';

// ─── Domain models ────────────────────────────────────────────────────────────

export interface Customer {
  id: number;
  company_name: string;
  customer_type: CustomerType;
  industry: string;
  created_at: string;
}

export interface Project {
  id: number;
  customer_id: number;
  name: string | null;
  current_stage: OnboardingStage;
  status: ProjectStatus;
  risk_flag: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithCustomer extends Project {
  customer?: Customer;
}

export interface Task {
  id: number;
  project_id: number;
  stage: OnboardingStage;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  due_date: string | null;
  required_for_stage_completion: boolean;
  is_customer_required: boolean;
  requires_setup_data: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEvent {
  id: number;
  project_id: number;
  task_id: number | null;
  event_type: EventType;
  message: string;
  created_at: string;
}

export interface ProjectDetail extends Project {
  tasks: Task[];
  events: WorkflowEvent[];
}

// ─── Request / Response shapes ────────────────────────────────────────────────

export interface CustomerCreate {
  company_name: string;
  customer_type: CustomerType;
  industry: string;
}

export interface ProjectCreate {
  customer_id: number;
  name?: string | null;
  notes?: string;
}

export interface TaskCompleteResponse {
  task: Task;
  stage_advanced: boolean;
  new_stage: OnboardingStage | null;
  project_completed: boolean;
  message: string;
}

export interface OverdueCheckResponse {
  overdue_count: number;
  reminder_events_created: number;
  message: string;
}

export interface RiskCheckResponse {
  risk_flag: boolean;
  was_already_flagged: boolean;
  reason: string | null;
  message: string;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export const STAGE_ORDER: OnboardingStage[] = ['kickoff', 'setup', 'training', 'go_live'];

export const STAGE_LABELS: Record<OnboardingStage, string> = {
  kickoff: 'Kickoff',
  setup: 'Setup',
  training: 'Training',
  go_live: 'Go-Live',
};
