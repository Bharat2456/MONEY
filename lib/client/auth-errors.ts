const MAP: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
  'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled in your Firebase project (see docs/FIREBASE_SETUP.md).',
};
export const authMessage = (e: unknown) => MAP[(e as { code?: string })?.code ?? ''] ?? 'Something went wrong. Please try again.';

/** Only same-site relative paths are accepted for post-login redirects (no open redirect). */
export const safeNext = (n: string | null) => (n && /^\/(?!\/)[\w\-/?=&.%]*$/.test(n) ? n : '/dashboard');
