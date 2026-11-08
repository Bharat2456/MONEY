'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Logo } from '@/components/Logo';
import { Empty, ErrorNote, SetupNotice, Spinner, StatusBadge, Table, TestModeBanner } from '@/components/ui';
import { adminApi, errorMessage, formatDate } from '@/lib/client/api';

const TABS = ['overview', 'users', 'projects', 'audit', 'support', 'deliveries'] as const;
type Tab = (typeof TABS)[number];
type Row = Record<string, string | number | boolean | null>;

export default function Admin() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<{ data?: Row[] } & Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const path = { overview: 'overview', users: 'users', projects: 'projects', audit: 'audit', support: 'support', deliveries: 'deliveries/failed' }[tab];
  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try { setData(await adminApi(path)); } catch (e) { setData(null); setError(errorMessage(e)); } finally { setBusy(false); }
  }, [path]);

  useEffect(() => { if (configured && !loading && !user) router.replace('/login?next=/admin'); }, [configured, loading, user, router]);
  useEffect(() => { if (user) void load(); }, [user, load]);
  if (!configured) return <SetupNotice />;
  if (loading || !user) return <Spinner />;

  const act = async (p: string, body?: unknown) => { try { await adminApi(p, { method: 'POST', body: body ?? {} }); await load(); } catch (e) { setError(errorMessage(e)); } };
  const rows = data?.data ?? [];

  return (
    <div className="min-h-screen"><TestModeBanner />
      <header className="flex items-center justify-between border-b border-moss-800 bg-sangria-950 px-6 py-4"><div className="flex items-center gap-4"><Logo href="/dashboard" /><span className="rounded-full bg-moss-700 px-3 py-1 text-xs text-caramel-200">Admin console</span></div><Link href="/dashboard" className="text-sm text-caramel-300 underline underline-offset-4">Back to dashboard</Link></header>
      <main className="mx-auto max-w-6xl p-6">
        <nav aria-label="Admin sections" className="mb-8 flex flex-wrap gap-2">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={`rounded-full px-4 py-1.5 text-sm capitalize ${tab === t ? 'bg-caramel-500 text-sangria-900' : 'border border-moss-700 text-caramel-200'}`}>{t === 'deliveries' ? 'Webhook errors' : t}</button>)}</nav>
        <ErrorNote message={error} />
        {busy && !data ? <Spinner /> : tab === 'overview' && data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(['users', 'suspended', 'deletion_requests', 'projects', 'open_support', 'failed_deliveries'] as const).map((k) => <div key={k} className="panel p-5"><p className="text-xs text-moss-500">{k.replace('_', ' ')}</p><p className="display mt-2 text-4xl">{String(data[k] ?? 0)}</p></div>)}<div className="panel p-5"><p className="text-xs text-moss-500">Service health</p><p className="mt-3 flex gap-3 text-sm"><StatusBadge status="active" /> database &amp; auth reachable</p></div></div>
        ) : tab === 'overview' ? null : !rows.length ? <Empty title="Nothing here yet" /> : tab === 'users' ? (
          <Table head={['Email', 'User ID', 'Created', 'State', 'Deletion', '']}>{rows.map((u) => <tr key={String(u.id)}><td className="td">{String(u.email)}</td><td className="td font-mono text-xs">{String(u.id)}</td><td className="td text-caramel-200/70">{formatDate(u.created_at as string)}</td><td className="td"><StatusBadge status={u.suspended ? 'revoked' : 'active'} /></td><td className="td text-xs">{u.deletion_requested_at ? formatDate(u.deletion_requested_at as string) : '—'}</td><td className="td"><div className="flex gap-2">{u.suspended ? <button className="btn btn-ghost btn-sm" onClick={() => act(`users/${u.id}/unsuspend`)}>Unsuspend</button> : <button className="btn btn-danger btn-sm" onClick={() => { const reason = prompt('Reason for suspension?'); if (reason !== null) void act(`users/${u.id}/suspend`, { reason }); }}>Suspend</button>}{u.deletion_requested_at && <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Permanently erase this user and all their data?')) void act(`users/${u.id}/process-deletion`); }}>Erase data</button>}</div></td></tr>)}</Table>
        ) : tab === 'projects' ? (
          <Table head={['Project', 'Owner', 'Category', 'Status', 'Created']}>{rows.map((p) => <tr key={String(p.id)}><td className="td">{String(p.name)}<span className="block font-mono text-[11px] text-moss-500">{String(p.id)}</span></td><td className="td font-mono text-xs">{String(p.owner_uid)}</td><td className="td">{String(p.category)}</td><td className="td"><StatusBadge status={String(p.status)} /></td><td className="td text-caramel-200/70">{formatDate(p.created_at as string)}</td></tr>)}</Table>
        ) : tab === 'audit' ? (
          <Table head={['Time', 'Actor', 'Action', 'Target']}>{rows.map((a) => <tr key={String(a.id)}><td className="td text-caramel-200/70">{formatDate(a.at as string)}</td><td className="td font-mono text-xs">{String(a.actor_uid)}</td><td className="td">{String(a.action)}</td><td className="td break-all font-mono text-xs">{String(a.target)}</td></tr>)}</Table>
        ) : tab === 'support' ? (
          <Table head={['Type', 'From', 'Message', 'Received', 'Status', '']}>{rows.map((s) => <tr key={String(s.id)}><td className="td">{String(s.kind)}</td><td className="td text-xs">{String(s.name)}<span className="block text-moss-500">{String(s.email)}</span></td><td className="td max-w-md whitespace-pre-wrap break-words text-xs">{String(s.message)}</td><td className="td text-caramel-200/70">{formatDate(new Date(Number(s.createdAt)).toISOString())}</td><td className="td"><StatusBadge status={s.status === 'open' ? 'pending' : 'success'} /></td><td className="td">{s.status === 'open' && <button className="btn btn-ghost btn-sm" onClick={() => act(`support/${s.id}/resolve`)}>Resolve</button>}</td></tr>)}</Table>
        ) : (
          <Table head={['Event', 'Endpoint', 'HTTP', 'Attempts', 'Error', 'Last attempt']}>{rows.map((d) => <tr key={String(d.id)}><td className="td font-mono text-xs">{String(d.event_type)}</td><td className="td break-all text-xs">{String(d.url)}</td><td className="td">{String(d.response_status ?? '—')}</td><td className="td">{String(d.attempts)}</td><td className="td text-xs">{String(d.error ?? '—')}</td><td className="td text-caramel-200/70">{formatDate(d.last_attempt_at as string)}</td></tr>)}</Table>
        )}
      </main>
    </div>
  );
}
