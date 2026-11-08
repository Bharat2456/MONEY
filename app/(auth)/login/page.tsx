'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { AuthCard } from '@/components/AuthCard';
import { ErrorNote, Field, SetupNotice } from '@/components/ui';
import { authMessage, safeNext } from '@/lib/client/auth-errors';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/client/firebase';

function Form() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    try { await signInWithEmailAndPassword(getFirebaseAuth(), String(f.get('email')), String(f.get('password'))); router.replace(next); }
    catch (err) { setError(authMessage(err)); setBusy(false); }
  }

  return (
    <AuthCard title="Welcome back" sub="Log in to your MONEY dashboard." footer={<>New here? <Link href="/register" className="text-caramel-300 underline underline-offset-4">Create a free account</Link></>}>
      <form onSubmit={submit} className="space-y-5">
        <ErrorNote message={error} />
        <Field label="Email"><input name="email" type="email" required autoComplete="email" className="input" /></Field>
        <Field label="Password"><input name="password" type="password" required autoComplete="current-password" className="input" /></Field>
        <div className="flex items-center justify-between"><button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button><Link href="/forgot-password" className="text-sm text-caramel-300 underline underline-offset-4">Forgot password?</Link></div>
      </form>
    </AuthCard>
  );
}
export default function Login() { return isFirebaseConfigured ? <Suspense><Form /></Suspense> : <SetupNotice />; }
