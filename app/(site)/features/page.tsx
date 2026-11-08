import type { Metadata } from 'next';
import Link from 'next/link';
import { SCENARIO_LIST } from '@/lib/core/simulation';

export const metadata: Metadata = { title: 'Features' };

const GROUPS = [
  ['Orders & hosted checkout', ['Create orders with one API call', 'Unique checkout URL per order, no customer account needed', 'Clearly marked simulated payment methods and test-mode banner', 'Return-URL allow-listing prevents open redirects']],
  ['Payment simulation', ['Deterministic scenarios you choose from a visible testing panel', 'Delays are owned by the backend, never a browser timer', 'Explicit state machine with documented transitions', 'Immutable event history for every transaction']],
  ['Webhooks', ['Ten event types across payments and refunds', 'HMAC-SHA256 signatures with timestamps and unique event IDs', 'Delivery log with status codes, response previews and attempt counts', 'Manual retry and SSRF-hardened destinations']],
  ['Keys & security', ['Publishable and secret test keys per project', 'Secret keys shown once; only keyed hashes stored', 'Rotation, revocation and last-used timestamps', 'Idempotency keys, rate limits, audit logs']],
  ['Dashboard', ['Live statistics computed from your data — nothing hard-coded', 'Filters by status, amount, date and merchant order ID', 'Transaction timelines, refunds, API logs', 'Multiple isolated projects']],
  ['Developer experience', ['JavaScript, TypeScript, Node.js, Python, cURL and HTML samples', 'A runnable sample merchant site in the repository', 'Run locally on Windows PowerShell; deploy on free tiers', 'Full API reference and lifecycle documentation']],
] as const;

export default function Features() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <h1 className="display text-5xl text-cream md:text-6xl">Features</h1>
      <p className="mt-4 max-w-2xl text-caramel-200/85">A complete, honest simulation of the payment lifecycle — so what you build against MONEY is ready to swap onto a real provider later.</p>
      <div className="mt-14 grid gap-x-14 gap-y-12 md:grid-cols-2">
        {GROUPS.map(([t, items]) => (
          <section key={t} className="border-t border-moss-700 pt-5"><h2 className="display text-3xl text-caramel-300">{t}</h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-caramel-200/85">{items.map((i) => <li key={i} className="flex gap-3"><span className="mt-2 h-1 w-3 shrink-0 bg-caramel-600" />{i}</li>)}</ul>
          </section>
        ))}
      </div>
      <section className="mt-20">
        <h2 className="display text-4xl text-cream">Scenarios you can test</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-moss-700">
          <table className="w-full min-w-[32rem]"><thead className="bg-moss-900"><tr><th className="th">Scenario</th><th className="th">What happens</th></tr></thead>
            <tbody className="divide-y divide-moss-800">{SCENARIO_LIST.map((s) => <tr key={s.id}><td className="td font-medium text-cream">{s.label}</td><td className="td text-caramel-200/80">{s.description}</td></tr>)}</tbody></table>
        </div>
      </section>
      <div className="mt-14"><Link href="/register" className="btn btn-primary">Create a free account</Link></div>
    </div>
  );
}
