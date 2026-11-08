// Secure administrator provisioning. Sets the Firebase custom claim { admin: true } using the service account.
// Usage (PowerShell, from the project root, after filling .env.local):
//   node --env-file=.env.local scripts/grant-admin.mjs you@example.com
//   node --env-file=.env.local scripts/grant-admin.mjs you@example.com --revoke
// The user must sign out and sign in again for the new claim to appear in their ID token.
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [email, flag] = process.argv.slice(2);
if (!email) { console.error('Usage: node --env-file=.env.local scripts/grant-admin.mjs <email> [--revoke]'); process.exit(1); }
const emulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
initializeApp(emulator
  ? { projectId: process.env.FIREBASE_PROJECT_ID }
  : { credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n') }) });
const auth = getAuth();
const user = await auth.getUserByEmail(email);
if (!user.emailVerified) { console.error('Refusing: this account has not verified its email address.'); process.exit(1); }
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: flag !== '--revoke' });
console.log(`${flag === '--revoke' ? 'Revoked' : 'Granted'} admin for ${email} (${user.uid}). Ask them to sign in again.`);
