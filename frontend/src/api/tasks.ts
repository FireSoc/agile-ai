import { api } from './client';
import type { TaskCompleteResponse } from '../types';

export const tasksApi = {
  complete: (id: number) => api.post<TaskCompleteResponse>(`/tasks/${id}/complete`),
};
