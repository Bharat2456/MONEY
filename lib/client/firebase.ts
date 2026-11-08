'use client';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const emulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

/** True only when real (or emulator) config is present. We never fake authentication. */
export const isFirebaseConfigured = Boolean(cfg.projectId && (emulator || (cfg.apiKey && cfg.appId)));

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured.');
  if (!auth) {
    app = getApps()[0] ?? initializeApp({ ...cfg, apiKey: cfg.apiKey ?? 'emulator-key', appId: cfg.appId ?? 'emulator-app' });
    auth = getAuth(app);
    if (emulator) { try { connectAuthEmulator(auth, `http://${process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'}`, { disableWarnings: true }); } catch { /* already connected */ } }
  }
  return auth;
}
