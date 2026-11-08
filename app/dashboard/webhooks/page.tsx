'use client';
import { useState } from 'react';
import { useProjects } from '@/components/ProjectContext';
import { Empty, ErrorNote, Field, NeedProject, PageHeader, SecretReveal, Spinner, StatusBadge, Table } from '@/components/ui';
import { useApiData } from '@/hooks/useApiData';
import { api, errorMessage, formatDate } from '@/lib/client/api';
import type { DeliveryView, ListOf, WebhookView } from '@/lib/client/types';

export default function Webhooks() {
  const { current } = useProjects();
  const pid = current?.id;
  const hooks = useApiData<ListOf<WebhookView>>(pid ? `projects/${pid}/webhooks` : null);
  const deliveries = useApiData<ListOf<DeliveryView>>(pid ? `projects/${pid}/deliveries` : null, { pollMs: 10000 });
  const [err, setErr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  if (!current) return <NeedProject />;

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget; const x = new FormData(f);
    setErr(null);
    try { const r = await api<WebhookView & { secret: string }>(`projects/${pid}/webhooks`, { method: 'POST', body: { url: x.get('url'), description: x.get('description'), events: ['*'] } }); setSecret(r.secret); f.reset(); await hooks.reload(); }
    catch (e2) { setErr(errorMessage(e2)); }
  }
  const run = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); await hooks.reload(); await deliveries.reload(); } catch (e) { setErr(errorMessage(e)); } };

  return (
    <>
      <PageHeader title="Webhooks" sub="MONEY sends signed events to your backend. Endpoints must be public https URLs." />
      {secret && <SecretReveal title="Webhook signing secret" onDone={() => setSecret(null)} items={[{ label: 'Signing secret (whsec_…)', value: secret }]} />}
      <ErrorNote message={err} />
      <form onSubmit={add} className="panel mb-6 grid gap-4 p-5 md:grid-cols-[2fr_1fr_auto] md:items-end">
        <Field label="Endpoint URL" hint="https only. localhost and private addresses are blocked — use a tunnel while developing."><input name="url" type="url" required placeholder="https://your-app.example.com/webhooks/money" className="input" /></Field>
        <Field label="Description"><input name="description" maxLength={120} className="input" /></Field>
        <button className="btn btn-primary">Add endpoint</button>
      </form>
      {hooks.loading && !hooks.data ? <Spinner /> : !hooks.data?.data.length ? <Empty title="No endpoints yet">Add an https endpoint to receive payment and refund events.</Empty> : (
        <Table head={['Endpoint', 'Events', 'Secret', 'Status', 'Created', '']}>{hooks.data.data.map((h) => <tr key={h.id}><td className="td break-all">{h.url}{h.description && <span className="block text-xs text-moss-500">{h.description}</span>}</td><td className="td text-xs">{h.events.join(', ')}</td><td className="td font-mono text-xs text-moss-500">{h.secret_hint}</td><td className="td"><StatusBadge status={h.status} /></td><td className="td text-caramel-200/70">{formatDate(h.created_at)}</td><td className="td"><button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete this endpoint?')) void run(() => api(`projects/${pid}/webhooks/${h.id}`, { method: 'DELETE' })); }}>Delete</button></td></tr>)}</Table>
      )}
      <h2 className="display mb-4 mt-12 text-3xl">Delivery log</h2>
      <p className="mb-4 max-w-2xl text-sm text-caramel-200/70">Each event is attempted once, immediately. There is no background retry queue on the free tier — retry failed deliveries manually (up to 10 attempts).</p>
      {deliveries.loading && !deliveries.data ? <Spinner /> : !deliveries.data?.data.length ? <Empty title="No deliveries yet" /> : (
        <Table head={['Event', 'Endpoint', 'Status', 'HTTP', 'Attempts', 'Response / error', 'When', '']}>{deliveries.data.data.map((d) => <tr key={d.id}><td className="td font-mono text-xs">{d.event_type}</td><td className="td max-w-[14rem] break-all text-xs">{d.url}</td><td className="td"><StatusBadge status={d.status} /></td><td className="td">{d.response_status ?? '—'}</td><td className="td">{d.attempts}</td><td className="td max-w-[16rem] break-words text-xs text-caramel-200/70">{d.error ?? d.response_body_preview ?? '—'}</td><td className="td text-caramel-200/70">{formatDate(d.created_at)}</td><td className="td">{d.status !== 'delivered' && <button className="btn btn-ghost btn-sm" onClick={() => run(() => api(`projects/${pid}/deliveries/${d.id}/retry`, { method: 'POST' }))}>Retry</button>}</td></tr>)}</Table>
      )}
    </>
  );
}
