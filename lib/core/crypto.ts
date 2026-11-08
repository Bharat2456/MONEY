import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** AES-256-GCM envelope used for webhook signing secrets (they must be recoverable to sign payloads). */
function keyFrom(b64: string): Buffer {
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32) throw new Error('MONEY_ENCRYPTION_KEY must be 32 random bytes, base64-encoded.');
  return key;
}

export function encryptSecret(plain: string, keyB64: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(keyB64), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), enc.toString('base64url')].join('.');
}

export function decryptSecret(envelope: string, keyB64: string): string {
  const [v, iv, tag, data] = envelope.split('.');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Unsupported secret envelope.');
  const decipher = createDecipheriv('aes-256-gcm', keyFrom(keyB64), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
