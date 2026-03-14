import { api } from './client';

export const seedApi = {
  seed: () => api.post<{ message: string }>('/seed'),
};
