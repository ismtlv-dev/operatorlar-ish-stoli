/**
 * Neon Postgres API mijozi.
 * Server (server.mjs) bilan /api/* orqali gaplashadi.
 * Server o'chiq bo'lsa har bir chaqiruv xato otadi - chaqiruvchi lokal rejimga o'tadi.
 */
import { Operator, SchoolRecord, EditLog, ChatMessage } from './types';

const BASE = '/api';

async function http<T = { ok: boolean }>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface StateResponse {
  operators: Operator[];
  logs: EditLog[];
  serverTime: number;
}

export interface ChangesResponse {
  serverTime: number;
  operators: { id: string; name: string; password: string; ord: number }[];
  records: (SchoolRecord & { operatorId: string })[];
  logs: EditLog[];
  opCount: number;
  recCount: number;
}

export const api = {
  getState: () => http<StateResponse>('/state'),
  getChanges: (since: number) => http<ChangesResponse>(`/changes?since=${since}`),

  updateRecord: (id: string, field: string, value: string) =>
    http(`/records/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ field, value }) }),
  addRecord: (operatorId: string, record: SchoolRecord) =>
    http('/records', { method: 'POST', body: JSON.stringify({ operatorId, record }) }),
  deleteRecord: (id: string) =>
    http(`/records/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  upsertOperator: (op: { id: string; name?: string; password?: string; ord?: number }) =>
    http('/operators', { method: 'POST', body: JSON.stringify(op) }),
  deleteOperator: (id: string) =>
    http(`/operators/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  reorderOperators: (ids: string[]) =>
    http('/operators/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),

  bulkReplace: (operators: Operator[]) =>
    http('/bulk', { method: 'POST', body: JSON.stringify({ operators }) }),

  addLog: (log: EditLog) =>
    http('/logs', { method: 'POST', body: JSON.stringify(log) }),

  getMessages: (afterId?: string) =>
    http<ChatMessage[]>('/messages' + (afterId ? `?after=${encodeURIComponent(afterId)}` : '')),
  sendMessage: (msg: ChatMessage) =>
    http('/messages', { method: 'POST', body: JSON.stringify(msg) }),
  clearMessages: () =>
    http('/messages', { method: 'DELETE' }),
};
