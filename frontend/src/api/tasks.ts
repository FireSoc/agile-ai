import { api } from './client';
import type { TaskCalendarItem, TaskCompleteResponse } from '../types';

export const tasksApi = {
  calendar: (start: string, end: string) =>
    api.get<TaskCalendarItem[]>(
      `/tasks/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    ),
  complete: (id: number) => api.post<TaskCompleteResponse>(`/tasks/${id}/complete`),
};
