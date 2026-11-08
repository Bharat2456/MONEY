'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useProjects } from '@/components/ProjectContext';
import { Empty, ErrorNote, PageHeader, Spinner, StatusBadge, Table } from '@/components/ui';
import { useApiData } from '@/hooks/useApiData';
import { formatAmount, formatDate } from '@/lib/client/api';
import type { Stats } from '@/lib/client/types';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
  return <div className="panel p-5"><p className="text-xs text-moss-500">{label}</p><p className={`display mt-2 text-4xl ${tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : 'text-cream'}`}>{value}</p></div>;
}

export default function Overview() {
  const { projects, current, loading: pl } = useProjects();
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const path = pl ? null : projects.length === 0 ? null : scope === 'all' || !current ? 'stats' : `stats?project=${current.id}`;
  const { data: s, error, loading } = useApiData<Stats>(path, { pollMs: 10000 });

  if (pl) return <Spinner />;
  if (!projects.length) return (<><PageHeader title="Welcome to MONEY" sub="Your free payment sandbox. Nothing here moves real money." /><Empty title="Let’s create your first project" action={<Link href="/dashboard/projects" className="btn btn-primary">Create a project</Link>}>A project gets its own test API keys. Then create an order, open the hosted checkout and watch the webhook arrive.</Empty></>);

  return (
    <>
      <PageHeader title="Overview" sub={scope === 'all' ? 'Across all projects' : `Project: ${current?.name}`} action={
        <div role="group" aria-label="Scope" className="flex rounded-full border border-moss-700 p-1 text-xs">
          {(['current', 'all'] as const).map((k) => <button key={k} onClick={() => setScope(k)} aria-pressed={scope === k} className={`rounded-full px-3.5 py-1.5 ${scope === k ? 'bg-caramel-500 text-sangria-900' : 'text-caramel-200'}`}>{k === 'current' ? 'This project' : 'All projects'}</button>)}
        </div>} />
      <ErrorNote message={error} />
      {loading && !s ? <Spinner /> : s && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Simulated payment orders" value={String(s.total_orders)} />
            <Stat label="Successful" value={String(s.successful)} tone="ok" />
            <Stat label="Failed" value={String(s.failed)} tone="bad" />
            <Stat label="Pending / in progress" value={String(s.pending)} />
            <Stat label="Simulated volume" value={formatAmount(s.volume)} />
            <Stat label="Refunded (simulated)" value={formatAmount(s.refunded)} />
            <Stat label="Success rate" value={s.success_rate === null ? '—' : `${s.success_rate}%`} />
            <Stat label="Cancelled / expired" value={`${s.cancelled} / ${s.expired}`} />
          </div>
          <h2 className="display mb-4 mt-12 text-3xl">Recent activity</h2>
          {s.recent.length === 0 ? <Empty title="No orders yet" action={<Link href="/dashboard/orders" className="btn btn-primary btn-sm">Create a test order</Link>}>Create an order from the dashboard or the API, then open its checkout link to simulate a payment.</Empty> : (
            <Table head={['Order', 'Merchant ref', 'Amount', 'Status', 'Created']}>{s.recent.map((o) => <tr key={o.id}><td className="td font-mono text-xs">{o.id}</td><td className="td">{o.merchant_order_id}</td><td className="td">{formatAmount(o.amount, o.currency)}</td><td className="td"><StatusBadge status={o.status} /></td><td className="td text-caramel-200/70">{formatDate(o.created_at)}</td></tr>)}</Table>
          )}
        </>
      )}
    </>
  );
}
