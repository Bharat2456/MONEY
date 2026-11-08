import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Pricing' };

export default function Pricing() {
  const inc = ['Up to 10 projects', 'Up to 5 key pairs per project (rotate and revoke)', 'Up to 5 webhook endpoints per project', 'All simulation scenarios, refunds and hosted checkout', 'Dashboard, transaction timelines, API logs', 'Fair-use API rate limits (about 120 requests/minute per key)'];
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <h1 className="display text-5xl text-cream md:text-6xl">Pricing</h1>
      <p className="mt-4 text-caramel-200/85">One plan. It costs nothing, and there is no credit card.</p>
      <div className="panel mt-10 grid gap-8 p-8 md:grid-cols-[auto_1fr] md:p-10">
        <div><p className="display text-7xl text-caramel-300">₹0</p><p className="mt-1 text-sm text-moss-500">Sandbox plan</p><Link href="/register" className="btn btn-primary mt-6">Create account</Link></div>
        <ul className="space-y-3 text-sm text-caramel-200/90">{inc.map((i) => <li key={i} className="flex gap-3 border-b border-moss-800 pb-3 last:border-0"><span className="text-ok" aria-hidden>✓</span>{i}</li>)}</ul>
      </div>
      <p className="mt-8 text-sm leading-relaxed text-caramel-200/70">“Free” does not mean unlimited. MONEY runs on free-tier hosting and database quotas, so usage may be limited or temporarily unavailable when those quotas are reached. There is no live-payment plan: Phase 1 is test mode only.</p>
    </div>
  );
}
