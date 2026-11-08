import { badRequest } from './errors';
import { WEBHOOK_EVENT_TYPES, type WebhookEventType } from './state-machine';

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR'] as const;
export const MIN_AMOUNT = 100; // smallest currency subunit: 100 paise = INR 1.00
export const MAX_AMOUNT = 10_000_000; // INR 1,00,000.00
export const PROJECT_CATEGORIES = ['education', 'ecommerce', 'saas', 'mobile', 'hackathon', 'nonprofit', 'other'] as const;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function text(v: unknown, field: string, o: { min?: number; max: number; optional?: boolean }): string {
  if (v === undefined || v === null || v === '') {
    if (o.optional) return '';
    throw badRequest(`${field} is required.`, { field });
  }
  if (typeof v !== 'string') throw badRequest(`${field} must be a string.`, { field });
  const s = v.replace(CONTROL, '').trim();
  if (s.length < (o.min ?? 0)) throw badRequest(`${field} must be at least ${o.min} characters.`, { field });
  if (s.length > o.max) throw badRequest(`${field} must be at most ${o.max} characters.`, { field });
  return s;
}

export interface CreateOrderInput { amount: number; currency: string; description: string; merchantOrderId: string; returnUrl: string | null; expiresInMinutes: number; metadata: Record<string, string> }

export function parseCreateOrder(body: unknown): CreateOrderInput {
  if (!isRecord(body)) throw badRequest('Request body must be a JSON object.');
  const { amount, currency = 'INR' } = body;
  if (typeof amount !== 'number' || !Number.isInteger(amount)) throw badRequest('amount must be an integer in the smallest currency unit (paise).', { field: 'amount' });
  if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) throw badRequest(`amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT}.`, { field: 'amount' });
  if (typeof currency !== 'string' || !(SUPPORTED_CURRENCIES as readonly string[]).includes(currency.toUpperCase())) {
    throw badRequest(`currency must be one of ${SUPPORTED_CURRENCIES.join(', ')}.`, { field: 'currency' });
  }
  const description = text(body.description, 'description', { max: 255, optional: true });
  const merchantOrderId = text(body.merchant_order_id, 'merchant_order_id', { min: 1, max: 64 });
  if (!/^[A-Za-z0-9_\-.:]+$/.test(merchantOrderId)) throw badRequest('merchant_order_id may only contain letters, digits and _ - . :', { field: 'merchant_order_id' });
  const returnUrl = body.return_url === undefined || body.return_url === null || body.return_url === '' ? null : text(body.return_url, 'return_url', { max: 2048 });
  let expiresInMinutes = 30;
  if (body.expires_in_minutes !== undefined) {
    const e = body.expires_in_minutes;
    if (typeof e !== 'number' || !Number.isInteger(e) || e < 1 || e > 1440) throw badRequest('expires_in_minutes must be an integer between 1 and 1440.', { field: 'expires_in_minutes' });
    expiresInMinutes = e;
  }
  const metadata: Record<string, string> = {};
  if (body.metadata !== undefined) {
    if (!isRecord(body.metadata)) throw badRequest('metadata must be an object of string values.', { field: 'metadata' });
    const entries = Object.entries(body.metadata);
    if (entries.length > 10) throw badRequest('metadata supports at most 10 keys.', { field: 'metadata' });
    for (const [k, v] of entries) {
      if (!/^[A-Za-z0-9_]{1,40}$/.test(k) || typeof v !== 'string' || v.length > 200) throw badRequest('metadata keys must be [A-Za-z0-9_] (max 40) and values strings (max 200).', { field: 'metadata' });
      metadata[k] = v.replace(CONTROL, '');
    }
  }
  return { amount, currency: currency.toUpperCase(), description, merchantOrderId, returnUrl, expiresInMinutes, metadata };
}

export interface ProjectInput { name: string; description: string; websiteUrl: string; category: string; allowedReturnOrigins: string[] }

export function parseProject(body: unknown): ProjectInput {
  if (!isRecord(body)) throw badRequest('Request body must be a JSON object.');
  const name = text(body.name, 'name', { min: 2, max: 60 });
  const description = text(body.description, 'description', { max: 280, optional: true });
  const websiteUrl = text(body.website_url, 'website_url', { max: 2048, optional: true });
  if (websiteUrl) {
    try { const u = new URL(websiteUrl); if (!/^https?:$/.test(u.protocol)) throw new Error('x'); } catch { throw badRequest('website_url must be a valid http(s) URL.', { field: 'website_url' }); }
  }
  const category = text(body.category ?? 'other', 'category', { max: 30 });
  if (!(PROJECT_CATEGORIES as readonly string[]).includes(category)) throw badRequest(`category must be one of ${PROJECT_CATEGORIES.join(', ')}.`, { field: 'category' });
  const raw = body.allowed_return_origins ?? [];
  if (!Array.isArray(raw) || raw.length > 5) throw badRequest('allowed_return_origins must be an array of at most 5 origins.', { field: 'allowed_return_origins' });
  const allowedReturnOrigins = raw.map((o) => {
    let u: URL;
    try { u = new URL(String(o)); } catch { throw badRequest('allowed_return_origins contains an invalid URL.', { field: 'allowed_return_origins' }); }
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && u.hostname === 'localhost')) throw badRequest('allowed_return_origins must be https origins.', { field: 'allowed_return_origins' });
    return u.origin;
  });
  return { name, description, websiteUrl, category, allowedReturnOrigins: [...new Set(allowedReturnOrigins)] };
}

export interface WebhookInput { url: string; description: string; events: Array<WebhookEventType | '*'> }

export function parseWebhook(body: unknown): WebhookInput {
  if (!isRecord(body)) throw badRequest('Request body must be a JSON object.');
  const url = text(body.url, 'url', { max: 2048 });
  const description = text(body.description, 'description', { max: 120, optional: true });
  const rawEvents = body.events ?? ['*'];
  if (!Array.isArray(rawEvents) || rawEvents.length === 0 || rawEvents.length > WEBHOOK_EVENT_TYPES.length + 1) throw badRequest('events must be a non-empty array.', { field: 'events' });
  const events = rawEvents.map((e) => {
    if (e !== '*' && !(WEBHOOK_EVENT_TYPES as readonly unknown[]).includes(e)) throw badRequest(`Unknown event type: ${String(e).slice(0, 40)}`, { field: 'events' });
    return e as WebhookEventType | '*';
  });
  return { url, description, events: [...new Set(events)] };
}

export interface RefundInput { orderId: string | null; transactionId: string | null; amount: number | null; reason: string; outcome: 'success' | 'failure' }

export function parseRefund(body: unknown): RefundInput {
  if (!isRecord(body)) throw badRequest('Request body must be a JSON object.');
  const orderId = typeof body.payment_order_id === 'string' ? body.payment_order_id : null;
  const transactionId = typeof body.transaction_id === 'string' ? body.transaction_id : null;
  if (!orderId && !transactionId) throw badRequest('Provide payment_order_id or transaction_id.');
  let amount: number | null = null;
  if (body.amount !== undefined && body.amount !== null) {
    if (typeof body.amount !== 'number' || !Number.isInteger(body.amount) || body.amount < 1) throw badRequest('amount must be a positive integer (paise).', { field: 'amount' });
    amount = body.amount;
  }
  const reason = text(body.reason, 'reason', { max: 200, optional: true });
  const outcome = body.outcome === undefined ? 'success' : body.outcome;
  if (outcome !== 'success' && outcome !== 'failure') throw badRequest("outcome must be 'success' or 'failure'.", { field: 'outcome' });
  return { orderId, transactionId, amount, reason, outcome };
}
