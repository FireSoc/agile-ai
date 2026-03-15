import { api } from './client';
import type { OpsInboxResponse, OpsInboxItemType } from '../types';

export interface OpsInboxParams {
  type?: OpsInboxItemType;
  stage?: string;
  customer_id?: number;
  limit?: number;
  offset?: number;
}

export const opsInboxApi = {
  getInbox: (params?: OpsInboxParams) => {
    const search = new URLSearchParams();
    if (params?.type) search.set('type', params.type);
    if (params?.stage) search.set('stage', params.stage);
    if (params?.customer_id != null) search.set('customer_id', String(params.customer_id));
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.offset != null) search.set('offset', String(params.offset));
    const qs = search.toString();
    return api.get<OpsInboxResponse>(`/ops/inbox${qs ? `?${qs}` : ''}`);
  },
};
