'use client';
import { getFirebaseAuth } from './firebase';

export class ClientApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

/** Calls MONEY's own dashboard API with the user's fresh Firebase ID token. The server verifies it on every request. */
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new ClientApiError(401, 'unauthorized', 'Please sign in.');
  const token = await user.getIdToken();
  const res = await fetch(`/api/dashboard/${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ClientApiError(res.status, json?.error?.code ?? 'error', json?.error?.message ?? 'Something went wrong.');
  return json as T;
}

export async function adminApi<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new ClientApiError(401, 'unauthorized', 'Please sign in.');
  const res = await fetch(`/api/admin/${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${await user.getIdToken(true)}`, ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ClientApiError(res.status, json?.error?.code ?? 'error', json?.error?.message ?? 'Something went wrong.');
  return json as T;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

export const formatAmount = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount / 100);

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—';
