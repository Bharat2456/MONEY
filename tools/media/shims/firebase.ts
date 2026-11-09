/** Preview stand-in for lib/client/firebase: a fixed, already-verified demo user. No real authentication happens. */
export const isFirebaseConfigured = true;
const user = { email: 'maya.rao@example.com', emailVerified: true, getIdToken: async () => 'preview-token', reload: async () => {} };
export function getFirebaseAuth() { return { currentUser: user }; }
