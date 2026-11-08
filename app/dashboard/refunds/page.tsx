'use client';
import { useState } from 'react';
import { useProjects } from '@/components/ProjectContext';
import { Empty, ErrorNote, Field, NeedProject, PageHeader, Spinner, StatusBadge, Table } from '@/components/ui';
import { useApiData } from '@/hooks/useApiData';
import { api, errorMessage, formatAmount, formatDate } from '@/lib/client/api';
import type { ListOf, OrderView, RefundView } from '@/lib/client/types';

export default function Refunds() {
  const { current } = useProjects();
  const pid = current?.id;
  const refunds = useApiData<ListOf<RefundView>>(pid ? `projects/${pid}/refunds` : null);
  const orders = useApiData<ListOf<OrderView>>(pid ? `projects/${pid}/orders?status=SUCCESS` : null);
  const [sel, setSel] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  if (!current) return <NeedProject />;
  const eligible = orders.data?.data.filter((o) => o.refunded_amount < o.amount) ?? [];
  const chosen = eligible.find((o) => o.id === sel);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErr(null); setOk(null);
    const amt = String(f.get('amount') ?? '').trim();
    try {
      const r = await api<RefundView>(`projects/${pid}/refunds`, { method: 'POST', body: { payment_order_id: sel, ...(amt ? { amount: Math.round(Number(amt) * 100) } : {}), reason: f.get('reason'), outcome: f.get('outcome') } });
      setOk(`Refund ${r.status.toLowerCase()} (${formatAmount(r.amount, r.currency)}). Simulated — no money was returned.`);
      await refunds.reload(); await orders.reload();
    } catch (e2) { setErr(errorMessage(e2)); }
  }

  return (
    <>
      <PageHeader title="Refunds" sub="Simulated refunds only — no money is returned. Cumulative refunds can never exceed the original amount." />
      <form onSubmit={submit} className="panel mb-8 grid gap-4 p-5 md:grid-cols-4">
        <div className="md:col-span-4"><ErrorNote message={err} />{ok && <p className="rounded-lg border border-ok/40 bg-ok-deep/60 px-4 py-3 text-sm text-ok">{ok}</p>}</div>
        <div className="md:col-span-2"><Field label="Successful order"><select className="input" required value={sel} onChange={(e) => setSel(e.target.value)}><option value="">{eligible.length ? 'Select an order…' : 'No refundable orders'}</option>{eligible.map((o) => <option key={o.id} value={o.id}>{o.merchant_order_id} · {formatAmount(o.amount - o.refunded_amount, o.currency)} refundable</option>)}</select></Field></div>
        <Field label="Amount (₹)" hint={chosen ? `Leave empty for the full ${formatAmount(chosen.amount - chosen.refunded_amount)}` : 'Empty = full remaining'}><input name="amount" type="number" step="0.01" min="0.01" className="input" /></Field>
        <Field label="Simulate"><select name="outcome" className="input"><option value="success">Refund succeeds</option><option value="failure">Refund fails</option></select></Field>
        <div className="md:col-span-3"><Field label="Reason"><input name="reason" maxLength={200} className="input" placeholder="Customer request" /></Field></div>
        <div className="flex items-end"><button className="btn btn-primary" disabled={!sel}>Request refund</button></div>
      </form>
      {refunds.loading && !refunds.data ? <Spinner /> : !refunds.data?.data.length ? <Empty title="No refunds yet">Refund a successful order above or via <code className="font-mono text-caramel-300">POST /api/v1/refunds</code>.</Empty> : (
        <Table head={['Refund', 'Order', 'Amount', 'Status', 'Reason', 'Created']}>{refunds.data.data.map((r) => <tr key={r.id}><td className="td font-mono text-xs">{r.id}</td><td className="td font-mono text-xs">{r.payment_order_id}</td><td className="td">{formatAmount(r.amount, r.currency)}</td><td className="td"><StatusBadge status={r.status} /></td><td className="td text-caramel-200/70">{r.reason || '—'}</td><td className="td text-caramel-200/70">{formatDate(r.created_at)}</td></tr>)}</Table>
      )}
    </>
  );
}
