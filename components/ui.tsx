'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';

const STATUS_STYLE: Record<string, string> = {
  SUCCESS: 'bg-ok-deep text-ok', SUCCEEDED: 'bg-ok-deep text-ok', DELIVERED: 'bg-ok-deep text-ok', ACTIVE: 'bg-ok-deep text-ok', REFUNDED: 'bg-moss-700 text-caramel-200',
  FAILED: 'bg-bad-deep text-bad', REVERSED: 'bg-bad-deep text-bad',
  PENDING: 'bg-caramel-700/40 text-caramel-300', PROCESSING: 'bg-caramel-700/40 text-caramel-300', CREATED: 'bg-moss-700 text-caramel-200',
  CANCELLED: 'bg-moss-700 text-moss-500', EXPIRED: 'bg-moss-700 text-moss-500', REVOKED: 'bg-moss-700 text-moss-500', ARCHIVED: 'bg-moss-700 text-moss-500',
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toUpperCase();
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[key] ?? 'bg-moss-700 text-caramel-200'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <div role="status" className="flex items-center gap-3 p-8 text-sm text-moss-500"><span className="h-4 w-4 animate-spin rounded-full border-2 border-caramel-500 border-t-transparent" />{label}…</div>;
}

export function ErrorNote({ message }: { message: string | null }) {
  return message ? <p role="alert" className="rounded-lg border border-bad/40 bg-bad-deep/60 px-4 py-3 text-sm text-bad">{message}</p> : null;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-start gap-3 p-8">
      <h3 className="display text-2xl text-cream">{title}</h3>
      {children && <p className="max-w-prose text-sm leading-relaxed text-caramel-200/80">{children}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="display text-4xl text-cream md:text-5xl">{title}</h1>{sub && <p className="mt-2 max-w-2xl text-sm text-caramel-200/75">{sub}</p>}</div>
      {action}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs text-moss-500">{hint}</span>}</label>;
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } }}>
      {done ? 'Copied' : label}
    </button>
  );
}

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-moss-700 bg-sangria-950">
      <div className="flex items-center justify-between border-b border-moss-800 px-4 py-2"><span className="text-xs text-moss-500">{label ?? ''}</span><CopyButton text={code} /></div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-caramel-100"><code>{code}</code></pre>
    </div>
  );
}

export function CodeTabs({ tabs }: { tabs: Array<{ id: string; label: string; code: string }> }) {
  const [active, setActive] = useState(tabs[0].id);
  const cur = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div>
      <div role="tablist" className="mb-3 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === active} onClick={() => setActive(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${t.id === active ? 'bg-caramel-500 text-sangria-900' : 'text-caramel-200 hover:bg-moss-800'}`}>{t.label}</button>
        ))}
      </div>
      <CodeBlock code={cur.code} label={cur.label} />
    </div>
  );
}

export function TestModeBanner() {
  return <div className="bg-caramel-500 px-4 py-1.5 text-center text-xs font-medium text-sangria-900">TEST MODE — simulated payments only. No real money moves.</div>;
}

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="text-caramel-300 underline decoration-caramel-600 underline-offset-4 hover:text-caramel-200">{children}</Link>;
}

export function SetupNotice() {
  return (
    <div className="mx-auto max-w-2xl p-6 md:p-12">
      <div className="panel p-8">
        <h2 className="display text-3xl">Firebase isn’t configured yet</h2>
        <p className="mt-3 text-sm leading-relaxed text-caramel-200/80">MONEY never fakes sign-in or storage. To use accounts and the dashboard, create a free Firebase project and add its values to <code className="font-mono text-caramel-300">.env.local</code>, then restart <code className="font-mono text-caramel-300">npm run dev</code>.</p>
        <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-sm text-caramel-200/80"><li>Follow <code className="font-mono text-caramel-300">docs/FIREBASE_SETUP.md</code> (about 10 minutes, no credit card).</li><li>Fill <code className="font-mono text-caramel-300">NEXT_PUBLIC_FIREBASE_*</code>, <code className="font-mono text-caramel-300">FIREBASE_*</code> and the two <code className="font-mono text-caramel-300">MONEY_*</code> secrets.</li><li>Or run the Firebase Emulator Suite and enable the emulator variables.</li></ol>
        <Link href="/" className="btn btn-ghost mt-6">Back to home</Link>
      </div>
    </div>
  );
}

export function SecretReveal({ title, items, onDone }: { title: string; items: Array<{ label: string; value: string }>; onDone: () => void }) {
  return (
    <div role="alert" className="mb-8 rounded-2xl border border-caramel-500/60 bg-caramel-500/10 p-6">
      <h3 className="display text-2xl text-cream">{title}</h3>
      <p className="mt-1 text-sm text-caramel-200">Copy this now — it is shown <strong>only once</strong> and cannot be recovered. Keep it on your backend server, never in browser code or a public repository.</p>
      <div className="mt-4 space-y-3">
        {items.map((i) => (
          <div key={i.label}><p className="mb-1 text-xs text-caramel-200/80">{i.label}</p>
            <div className="flex items-center gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-sangria-950 px-3 py-2.5 font-mono text-[13px] text-caramel-100">{i.value}</code><CopyButton text={i.value} /></div></div>
        ))}
      </div>
      <button className="btn btn-primary btn-sm mt-5" onClick={onDone}>I’ve saved it</button>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-moss-700"><table className="w-full min-w-[40rem]"><thead className="bg-moss-900"><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead><tbody className="divide-y divide-moss-800 bg-moss-900/40">{children}</tbody></table></div>
  );
}

export function NeedProject() {
  return <Empty title="Create a project first" action={<Link href="/dashboard/projects" className="btn btn-primary btn-sm">Go to Projects</Link>}>Everything in MONEY lives inside a project, with its own keys, orders and webhooks.</Empty>;
}
