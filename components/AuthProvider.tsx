'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/client/firebase';

interface AuthState { user: User | null; loading: boolean; configured: boolean; logout: () => Promise<void>; refresh: () => Promise<void> }
const Ctx = createContext<AuthState>({ user: null, loading: true, configured: false, logout: async () => {}, refresh: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [, bump] = useState(0);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), (u) => { setUser(u); setLoading(false); });
  }, []);

  const value = useMemo<AuthState>(() => ({
    user, loading, configured: isFirebaseConfigured,
    logout: async () => { await signOut(getFirebaseAuth()); },
    refresh: async () => { const u = getFirebaseAuth().currentUser; if (u) { await u.reload(); await u.getIdToken(true); setUser(getFirebaseAuth().currentUser); bump((n) => n + 1); } },
  }), [user, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
