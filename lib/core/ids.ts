import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const randomToken = (bytes = 16): string => randomBytes(bytes).toString('hex');
export const newId = (prefix: string): string => `${prefix}_${randomToken(12)}`;
export const sha256Hex = (input: string): string => createHash('sha256').update(input).digest('hex');

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
