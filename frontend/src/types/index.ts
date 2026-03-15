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

/** Task with project and company info for calendar view. */
export interface TaskCalendarItem {
  id: number;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  required_for_stage_completion: boolean;
  project_id: number;
  customer_id: number;
  company_name: string;
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

// ─── Simulation v2 — Request types ───────────────────────────────────────────

export type RiskBand = 'Low' | 'Guarded' | 'Elevated' | 'Critical';

export type InboxEventType =
  | 'email_sent'
  | 'awaiting_reply'
  | 'reply_received'
  | 'reminder_sent'
  | 'deadline_warning'
  | 'deadline_missed';

export interface SimulationTaskInput {
  title: string;
  stage: OnboardingStage;
  due_offset_days: number;
  required_for_stage_completion?: boolean;
  is_customer_required?: boolean;
  requires_setup_data?: boolean;
  current_status?: TaskStatus;
  delay_days?: number;
  // v2 scoring fields
  criticality?: number;              // 1-4
  estimated_duration_days?: number;
  dependency_count?: number;
  integration_required?: boolean;
  approval_layers?: number;          // 0-3
}

export interface SimulationAssumptions {
  avg_customer_delay_days?: number;
  avg_internal_delay_days?: number;
  setup_data_delay_days?: number;
  customer_delay_days?: number;
  internal_delay_days?: number;
}

export interface SimulationRequest {
  customer_type: string;
  tasks: SimulationTaskInput[];
  assumptions?: SimulationAssumptions;
}

// ─── Simulation v2 — Response types ──────────────────────────────────────────

export interface TaskAssessment {
  task_title: string;
  stage: OnboardingStage;
  slack_risk_score: number;
  external_dependency_score: number;
  dependency_chain_score: number;
  complexity_score: number;
  risk_score: number;
  risk_band: RiskBand;
  urgency_score: number;
  criticality_score: number;
  action_priority_score: number;
  top_reasons: string[];
  recommended_fallback: string;
}

export interface VirtualInboxMessage {
  day: number;
  event_type: InboxEventType;
  subject: string;
  body_preview: string;
  task_title: string | null;
  risk_band: RiskBand | null;
}

export interface VirtualInboxPreview {
  sender_label: string;
  recipient_label: string;
  sent_messages: VirtualInboxMessage[];
  received_messages: VirtualInboxMessage[];
}

export interface SimulationRiskSignal {
  rule: string;
  stage: OnboardingStage;
  task_title: string | null;
  detail: string;
}

export interface SimulationStageResult {
  stage: OnboardingStage;
  total_tasks: number;
  required_tasks: number;
  customer_required_tasks: number;
  setup_data_tasks: number;
  projected_duration_days: number;
  blocker_tasks: string[];
  overdue_tasks: string[];
  can_advance: boolean;
  gate_blocked_reason: string | null;
}

export interface SimulationResponse {
  customer_type: string;
  total_tasks: number;
  stages_simulated: number;
  projected_ttfv_days: number;
  projected_total_days: number;
  at_risk: boolean;
  risk_signals: SimulationRiskSignal[];
  stage_results: SimulationStageResult[];
  recommendations: string[];
  summary: string;
  task_assessments: TaskAssessment[];
  inbox_preview: VirtualInboxPreview | null;
}

// ─── Branch comparison types ──────────────────────────────────────────────────

export interface BranchScenarioRequest {
  name: string;
  assumptions_override?: SimulationAssumptions;
  task_overrides?: SimulationTaskInput[];
}

export interface BranchScenarioResult {
  name: string;
  result: SimulationResponse;
}

export interface ComparisonSummary {
  branch_name: string;
  risk_score_delta: number;
  ttfv_delta_days: number;
  total_duration_delta_days: number;
  at_risk_changed: boolean;
  risk_signal_delta: number;
  top_improvements: string[];
}

export interface SimulationCompareRequest {
  customer_type: string;
  baseline_tasks: SimulationTaskInput[];
  baseline_assumptions?: SimulationAssumptions;
  branches: BranchScenarioRequest[];
}

export interface SimulationCompareResponse {
  customer_type: string;
  baseline: SimulationResponse;
  branches: BranchScenarioResult[];
  comparisons: ComparisonSummary[];
  overall_recommendation: string;
}

// ─── Calendar ──────────────────────────────────────────────────────────────────

export type CalendarEntryType = 'task' | 'deadline' | 'project';

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  entry_type: string;
  start_date: string;
  end_date: string | null;
  duration_days: number | null;
  criticality: number | null;
  stage: OnboardingStage | null;
  status: TaskStatus;
  project_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventCreate {
  title: string;
  description?: string | null;
  entry_type: CalendarEntryType;
  start_date: string;
  end_date?: string | null;
  duration_days?: number | null;
  criticality?: number | null;
  stage?: OnboardingStage | null;
  status?: TaskStatus;
  project_id?: number | null;
}

export interface CalendarEventUpdate {
  title?: string;
  description?: string | null;
  entry_type?: CalendarEntryType;
  start_date?: string;
  end_date?: string | null;
  duration_days?: number | null;
  criticality?: number | null;
  stage?: OnboardingStage | null;
  status?: TaskStatus;
  project_id?: number | null;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export const STAGE_ORDER: OnboardingStage[] = ['kickoff', 'setup', 'training', 'go_live'];

export const STAGE_LABELS: Record<OnboardingStage, string> = {
  kickoff: 'Kickoff',
  setup: 'Setup',
  training: 'Training',
  go_live: 'Go-Live',
};
