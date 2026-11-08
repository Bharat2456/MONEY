'use client';
import { useState } from 'react';
import { useProjects } from '@/components/ProjectContext';
import { CopyButton, Empty, ErrorNote, Field, NeedProject, PageHeader, Spinner, StatusBadge, Table } from '@/components/ui';
import { useApiData } from '@/hooks/useApiData';
import { api, errorMessage, formatAmount, formatDate } from '@/lib/client/api';
import type { ListOf, OrderView } from '@/lib/client/types';

const STATUSES = ['CREATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'REVERSED', 'REFUNDED'];

export default function Orders() {
  const { current } = useProjects();
  const [f, setF] = useState({ status: '', merchant: '', min: '', max: '', from: '', to: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const qs = new URLSearchParams();
  if (f.status) qs.set('status', f.status); if (f.merchant) qs.set('merchant_order_id', f.merchant);
  if (f.min) qs.set('min_amount', String(Math.round(Number(f.min) * 100))); if (f.max) qs.set('max_amount', String(Math.round(Number(f.max) * 100)));
  if (f.from) qs.set('from', f.from); if (f.to) qs.set('to', f.to + 'T23:59:59');
  const base = current ? `projects/${current.id}/orders` : null;
  const { data, loading, error, reload } = useApiData<ListOf<OrderView>>(base ? `${base}?${qs}` : null, { pollMs: 8000 });
  if (!current) return <NeedProject />;

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const x = new FormData(e.currentTarget);
    setErr(null);
    try {
      await api(base!, { method: 'POST', body: { amount: Math.round(Number(x.get('amount')) * 100), currency: 'INR', description: x.get('description'), merchant_order_id: x.get('mid') || `TEST-${Date.now()}` } });
      setShow(false); await reload();
    } catch (e2) { setErr(errorMessage(e2)); }
  }
  const run = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); await reload(); } catch (e) { setErr(errorMessage(e)); } };

  return (
    <>
      <PageHeader title="Payment orders" sub={`Project: ${current.name}. Create orders here or through the API.`} action={<button className="btn btn-primary" onClick={() => setShow(!show)}>{show ? 'Close' : 'New test order'}</button>} />
      {show && (
        <form onSubmit={create} className="panel mb-6 grid gap-4 p-5 md:grid-cols-4">
          <Field label="Amount (₹)"><input name="amount" type="number" min="1" max="100000" step="0.01" defaultValue="500" required className="input" /></Field>
          <Field label="Merchant order ID"><input name="mid" className="input" placeholder="auto" maxLength={64} /></Field>
          <div className="md:col-span-2"><Field label="Description"><input name="description" maxLength={255} className="input" defaultValue="Dashboard test order" /></Field></div>
          <div><button className="btn btn-primary">Create order</button></div>
        </form>
      )}
      <div className="panel mb-6 grid gap-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Status"><select className="input py-2" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Merchant order ID"><input className="input py-2" value={f.merchant} onChange={(e) => setF({ ...f, merchant: e.target.value })} /></Field>
        <Field label="Min ₹"><input className="input py-2" type="number" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} /></Field>
        <Field label="Max ₹"><input className="input py-2" type="number" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /></Field>
        <Field label="From"><input className="input py-2" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
        <Field label="To"><input className="input py-2" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
      </div>
      <ErrorNote message={err ?? error} />
      {loading && !data ? <Spinner /> : !data?.data.length ? <Empty title="No orders match">Create a test order above, or call <code className="font-mono text-caramel-300">POST /api/v1/payment-orders</code> from your backend.</Empty> : (
        <Table head={['Order', 'Merchant ref', 'Amount', 'Status', 'Created', 'Actions']}>
          {data.data.map((o) => (
            <tr key={o.id}>
              <td className="td font-mono text-xs">{o.id}</td><td className="td">{o.merchant_order_id}</td>
              <td className="td">{formatAmount(o.amount, o.currency)}{o.refunded_amount > 0 && <span className="block text-xs text-moss-500">refunded {formatAmount(o.refunded_amount, o.currency)}</span>}</td>
              <td className="td"><StatusBadge status={o.status} />{o.failure_code && <span className="mt-1 block font-mono text-[11px] text-moss-500">{o.failure_code}</span>}</td>
              <td className="td text-caramel-200/70">{formatDate(o.created_at)}</td>
              <td className="td"><div className="flex flex-wrap items-center gap-2">
                {['CREATED', 'PENDING'].includes(o.status) && <><a href={o.checkout_url} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">Open checkout</a><CopyButton text={o.checkout_url} label="Copy link" />
                  <button className="btn btn-ghost btn-sm" onClick={() => run(() => api(`${base}/${o.id}/simulate`, { method: 'POST', body: { scenario: 'success' } }))}>Simulate success</button></>}
                {['CREATED', 'PENDING', 'PROCESSING'].includes(o.status) && <button className="btn btn-danger btn-sm" onClick={() => run(() => api(`${base}/${o.id}/cancel`, { method: 'POST' }))}>Cancel</button>}
              </div></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
