'use client';
import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { AuthCard } from '@/components/AuthCard';
import { ErrorNote, Field, SetupNotice } from '@/components/ui';
import { authMessage } from '@/lib/client/auth-errors';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/client/firebase';

export default function Forgot() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isFirebaseConfigured) return <SetupNotice />;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try { await sendPasswordResetEmail(getFirebaseAuth(), String(new FormData(e.currentTarget).get('email'))); setDone(true); }
    catch (err) { const code = (err as { code?: string }).code; if (code === 'auth/user-not-found') setDone(true); else setError(authMessage(err)); }
  }
  return (
    <AuthCard title="Reset your password" sub="We’ll email you a reset link." footer={<Link href="/login" className="text-caramel-300 underline underline-offset-4">Back to log in</Link>}>
      {done ? <p className="panel p-5 text-sm text-caramel-200">If an account exists for that address, a reset link is on its way.</p> : (
        <form onSubmit={submit} className="space-y-5"><ErrorNote message={error} /><Field label="Email"><input name="email" type="email" required className="input" autoComplete="email" /></Field><button className="btn btn-primary">Send reset link</button></form>
      )}
    </AuthCard>
  );
}
