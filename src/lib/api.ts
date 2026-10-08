import type { Board } from '../types';

const TOKEN_KEY = 'rep_admin_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? '';
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);

async function request<T>(path: string, init?: RequestInit, opts?: { admin?: boolean; auth?: boolean }): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const tok = opts?.admin ? getToken() : opts?.auth ? getToken() : '';
  if (tok) headers.Authorization = `Bearer ${tok}`;
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export const loadBoard = () => request<Board>('/api/board', undefined, { admin: true });

export const runAction = (type: 'follow-ups' | 'overdue-alerts' | 'reminders') =>
  request<{ action: string; dispatched: number; sent: Array<{ kind: string; to: string; ok: boolean; error?: string }> }>(
    '/api/actions',
    { method: 'POST', body: JSON.stringify({ type }) },
    { admin: true },
  );

export const patchDeal = (id: string, patch: Record<string, unknown>) =>
  request('/api/deals', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }, { admin: true });

export const patchInspection = (id: number, patch: Record<string, unknown>) =>
  request('/api/inspections', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }, { admin: true });

export const patchProperty = (id: string, patch: Record<string, unknown>) =>
  request('/api/properties', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }, { admin: true });

export type InquireResult = {
  ok: boolean;
  matched_property: string | null;
  reply: { subject: string; body: string; sent: boolean; to: string };
  logged: boolean;
};

export const submitInquiry = (payload: { name: string; phone: string; email?: string; message: string }) =>
  request<InquireResult>('/api/inquire', { method: 'POST', body: JSON.stringify(payload) });