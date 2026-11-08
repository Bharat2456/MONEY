'use client';
import { Fragment, useState } from 'react';
import { useProjects } from '@/components/ProjectContext';
import { Empty, ErrorNote, NeedProject, PageHeader, Spinner, StatusBadge, Table } from '@/components/ui';
import { useApiData } from '@/hooks/useApiData';
import { formatAmount, formatDate } from '@/lib/client/api';
import type { EventView, ListOf, TxnView } from '@/lib/client/types';

function Timeline({ pid, id }: { pid: string; id: string }) {
  const { data, loading, error } = useApiData<TxnView & { events: EventView[] }>(`projects/${pid}/transactions/${id}`);
  if (loading) return <Spinner />;
  if (!data) return <ErrorNote message={error} />;
  return (
    <ol className="space-y-3 border-l border-moss-600 pl-5">
      {data.events.map((e) => (
        <li key={e.id} className="relative"><span className="absolute -left-[1.62rem] top-1.5 h-2 w-2 rounded-full bg-caramel-500" />
          <p className="text-sm text-cream">{e.type === 'status.changed' ? `${e.from ?? '—'} → ${e.to}` : e.type === 'payment.created' ? 'Order created' : e.type.replace('.', ' ')}</p>
          <p className="text-xs text-moss-500">#{e.seq} · {e.actor} · {formatDate(e.created_at)}{e.data && Object.keys(e.data).length ? ` · ${JSON.stringify(e.data)}` : ''}</p></li>
      ))}
    </ol>
  );
}

export default function Transactions() {
  const { current } = useProjects();
  const { data, loading, error } = useApiData<ListOf<TxnView>>(current ? `projects/${current.id}/transactions` : null, { pollMs: 10000 });
  const [open, setOpen] = useState<string | null>(null);
  if (!current) return <NeedProject />;
  return (
    <>
      <PageHeader title="Transactions" sub="Every transaction keeps an immutable event history. Select one to inspect it." />
      <ErrorNote message={error} />
      {loading && !data ? <Spinner /> : !data?.data.length ? <Empty title="No transactions yet">Transactions appear as soon as an order is created.</Empty> : (
        <Table head={['Transaction', 'Reference', 'Amount', 'Status', 'Scenario', 'Created', '']}>
          {data.data.map((t) => (
            <Fragment key={t.id}>
              <tr><td className="td font-mono text-xs">{t.id}</td><td className="td font-mono text-xs">{t.simulated_reference}</td><td className="td">{formatAmount(t.amount, t.currency)}</td><td className="td"><StatusBadge status={t.status} /></td><td className="td text-caramel-200/70">{t.scenario ?? '—'}</td><td className="td text-caramel-200/70">{formatDate(t.created_at)}</td>
                <td className="td"><button className="btn btn-ghost btn-sm" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>{open === t.id ? 'Hide' : 'Timeline'}</button></td></tr>
              {open === t.id && <tr><td colSpan={7} className="bg-sangria-950/60 px-6 py-5"><Timeline pid={current.id} id={t.id} /></td></tr>}
            </Fragment>
          ))}
        </Table>
      )}
    </>
  );
}
