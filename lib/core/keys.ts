import { createHmac, randomBytes } from 'node:crypto';

export const PK_PREFIX = 'money_test_pk_';
export const SK_PREFIX = 'money_test_sk_';

/** HMAC-SHA256 of the secret key. Secret keys are 256-bit random, so a fast keyed hash is appropriate. */
export const hashSecret = (secretKey: string, pepper = ''): string =>
  createHmac('sha256', pepper).update(secretKey).digest('hex');

export interface GeneratedKeyPair {
  publishableKey: string;
  secretKey: string; // shown to the user exactly once, never persisted
  secretHash: string;
  secretLast4: string;
}

export function generateKeyPair(pepper = ''): GeneratedKeyPair {
  const publishableKey = PK_PREFIX + randomBytes(18).toString('base64url');
  const secretKey = SK_PREFIX + randomBytes(32).toString('base64url');
  return { publishableKey, secretKey, secretHash: hashSecret(secretKey, pepper), secretLast4: secretKey.slice(-4) };
}

export function classifyKey(raw: string): 'secret' | 'publishable' | null {
  if (raw.startsWith(SK_PREFIX) && raw.length > SK_PREFIX.length + 20) return 'secret';
  if (raw.startsWith(PK_PREFIX) && raw.length > PK_PREFIX.length + 10) return 'publishable';
  return null;
}

export function extractBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return m ? m[1] : null;
}
