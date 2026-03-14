import { api } from './client';
import type {
  Project,
  ProjectCreate,
  ProjectDetail,
  Task,
  WorkflowEvent,
  OverdueCheckResponse,
  RiskCheckResponse,
} from '../types';

export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: number) => api.get<ProjectDetail>(`/projects/${id}`),
  create: (data: ProjectCreate) => api.post<Project>('/projects', data),
  tasks: (id: number) => api.get<Task[]>(`/projects/${id}/tasks`),
  events: (id: number) => api.get<WorkflowEvent[]>(`/projects/${id}/events`),
  checkOverdue: (id: number) => api.post<OverdueCheckResponse>(`/projects/${id}/check-overdue`),
  checkRisk: (id: number) => api.post<RiskCheckResponse>(`/projects/${id}/check-risk`),
};
