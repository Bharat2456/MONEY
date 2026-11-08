import { createHmac } from 'node:crypto';
import { safeEqual } from './ids';

export const SIGNATURE_HEADER = 'money-signature';
export const DEFAULT_TOLERANCE_SECONDS = 300;

export const computeSignature = (secret: string, timestampSec: number, body: string): string =>
  createHmac('sha256', secret).update(`${timestampSec}.${body}`).digest('hex');

/** Header format: `t=<unix seconds>,v1=<hex hmac-sha256 of "<t>.<raw body>">`. */
export function signPayload(secret: string, body: string, timestampSec = Math.floor(Date.now() / 1000)): string {
  return `t=${timestampSec},v1=${computeSignature(secret, timestampSec, body)}`;
}

export function verifySignature(
  header: string | null | undefined, rawBody: string, secret: string,
  opts: { toleranceSeconds?: number; nowSec?: number } = {},
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => { const i = p.indexOf('='); return [p.slice(0, i).trim(), p.slice(i + 1).trim()]; }));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !parts.v1) return false;
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - t) > (opts.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS)) return false;
  return safeEqual(parts.v1, computeSignature(secret, t, rawBody));
}
