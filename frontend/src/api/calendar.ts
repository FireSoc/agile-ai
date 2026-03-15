import { api } from './client';
import type {
  CalendarEvent,
  CalendarEventCreate,
  CalendarEventUpdate,
} from '../types';

export const calendarApi = {
  list: (start: string, end: string) =>
    api.get<CalendarEvent[]>(
      `/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    ),

  create: (data: CalendarEventCreate) =>
    api.post<CalendarEvent>('/calendar/events', data),

  update: (id: number, data: CalendarEventUpdate) =>
    api.put<CalendarEvent>(`/calendar/events/${id}`, data),

  delete: (id: number) => api.delete<void>(`/calendar/events/${id}`),

  get: (id: number) => api.get<CalendarEvent>(`/calendar/events/${id}`),
};
