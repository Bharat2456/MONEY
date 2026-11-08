import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { ApiError, unavailable } from '@/lib/core/errors';
import { defaultResolver, safeTransport } from '@/lib/core/http';
import { RateLimiter } from '@/lib/core/ratelimit';
import { MoneyService } from '@/services/money';
import { FirestoreStore } from './firestore-store';

const REQUIRED = ['FIREBASE_PROJECT_ID', 'MONEY_ENCRYPTION_KEY'] as const;

/** Throws a clear 503 listing what is missing — we never silently fake auth or persistence. */
export function assertConfigured(): void {
  const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  const missing: string[] = REQUIRED.filter((k) => !process.env[k]);
  if (!emulator) for (const k of ['FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) if (!process.env[k]) missing.push(k);
  if (missing.length) {
    throw new ApiError(503, 'not_configured', `MONEY is not configured yet. Missing environment variables: ${missing.join(', ')}. See docs/FIREBASE_SETUP.md.`);
  }
}

export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

function adminApp(): App {
  assertConfigured();
  const existing = getApps()[0];
  if (existing) return existing;
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = () => getAuth(adminApp());

const g = globalThis as unknown as { __money?: { svc: MoneyService; limiter: RateLimiter } };

function runtime() {
  if (!g.__money) {
    const db = getFirestore(adminApp());
    try { db.settings({ ignoreUndefinedProperties: true }); } catch { /* already configured on a warm instance */ }
    g.__money = {
      svc: new MoneyService({
        store: new FirestoreStore(db), appUrl: appUrl(), encryptionKey: process.env.MONEY_ENCRYPTION_KEY!,
        keyPepper: process.env.MONEY_KEY_PEPPER || '', transport: safeTransport, resolveDns: defaultResolver,
      }),
      limiter: new RateLimiter(),
    };
  }
  return g.__money;
}

export const service = (): MoneyService => { try { return runtime().svc; } catch (e) { if (e instanceof ApiError) throw e; throw unavailable(); } };
export const limiter = (): RateLimiter => runtime().limiter;
