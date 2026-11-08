'use client';
import { useState } from 'react';
import { ErrorNote, Field } from '@/components/ui';

export default function Contact() {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState('sending'); setError(null);
    const res = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(f)) });
    if (res.ok) { setState('done'); return; }
    const j = await res.json().catch(() => ({}));
    setError(j?.error?.message ?? 'Could not send your message.'); setState('idle');
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="display text-5xl text-cream md:text-6xl">Contact</h1>
      <p className="mt-3 text-caramel-200/85">Questions, support requests or abuse reports. We read every message.</p>
      {state === 'done' ? (
        <div className="panel mt-10 p-8"><h2 className="display text-3xl text-cream">Message received</h2><p className="mt-2 text-sm text-caramel-200/80">Thank you — we will reply by email.</p></div>
      ) : (
        <form onSubmit={submit} className="mt-10 space-y-5">
          <ErrorNote message={error} />
          <Field label="Type"><select name="type" className="input" defaultValue="support"><option value="support">Support / question</option><option value="abuse">Report abuse</option></select></Field>
          <div className="grid gap-5 md:grid-cols-2"><Field label="Name"><input name="name" required maxLength={80} className="input" autoComplete="name" /></Field><Field label="Email"><input name="email" type="email" required maxLength={120} className="input" autoComplete="email" /></Field></div>
          <Field label="Message" hint="Never include secret keys, passwords or real card/bank details."><textarea name="message" required minLength={10} maxLength={2000} rows={6} className="input" /></Field>
          <button className="btn btn-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send message'}</button>
        </form>
      )}
    </div>
  );
}
