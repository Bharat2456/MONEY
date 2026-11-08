'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { AuthCard } from '@/components/AuthCard';
import { ErrorNote, Field, SetupNotice } from '@/components/ui';
import { authMessage } from '@/lib/client/auth-errors';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/client/firebase';

export default function Register() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!isFirebaseConfigured) return <SetupNotice />;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password'));
    if (password.length < 8) { setError('Choose a password with at least 8 characters.'); return; }
    if (password !== String(f.get('confirm'))) { setError('Passwords do not match.'); return; }
    if (f.get('terms') !== 'on') { setError('Please accept the Terms and acknowledge that MONEY is a simulator.'); return; }
    setBusy(true); setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), String(f.get('email')), password);
      await sendEmailVerification(cred.user);
      router.replace('/dashboard');
    } catch (err) { setError(authMessage(err)); setBusy(false); }
  }

  return (
    <AuthCard title="Create your account" sub="Free forever for the sandbox. We’ll email a verification link." footer={<>Already registered? <Link href="/login" className="text-caramel-300 underline underline-offset-4">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-5">
        <ErrorNote message={error} />
        <Field label="Email"><input name="email" type="email" required autoComplete="email" className="input" /></Field>
        <Field label="Password" hint="At least 8 characters."><input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" /></Field>
        <Field label="Confirm password"><input name="confirm" type="password" required autoComplete="new-password" className="input" /></Field>
        <label className="flex items-start gap-3 text-sm text-caramel-200/85"><input name="terms" type="checkbox" className="mt-1 accent-[#B28558]" />
          <span>I accept the <Link href="/legal/terms" className="underline underline-offset-4">Terms</Link> and <Link href="/legal/acceptable-use" className="underline underline-offset-4">Acceptable Use Policy</Link>, and understand MONEY only <em>simulates</em> payments.</span></label>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthCard>
  );
}
