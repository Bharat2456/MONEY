'use client';
import { useState } from 'react';
import { useProjects } from '@/components/ProjectContext';
import { CopyButton, Empty, ErrorNote, NeedProject, PageHeader, SecretReveal, Spinner, StatusBadge, Table } from '@/components/ui';
import { useApiData } from '@/hooks/useApiData';
import { api, errorMessage, formatDate } from '@/lib/client/api';
import type { KeyView, ListOf } from '@/lib/client/types';

export default function Keys() {
  const { current } = useProjects();
  const base = current ? `projects/${current.id}/keys` : null;
  const { data, loading, error, reload } = useApiData<ListOf<KeyView>>(base);
  const [err, setErr] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ pk: string; sk: string } | null>(null);

  if (!current) return <NeedProject />;
  const act = async (fn: () => Promise<{ key?: KeyView; secret_key?: string } | unknown>) => {
    setErr(null);
    try { const r = (await fn()) as { key?: KeyView; secret_key?: string }; if (r?.secret_key && r.key) setSecret({ pk: r.key.publishable_key, sk: r.secret_key }); await reload(); } catch (e) { setErr(errorMessage(e)); }
  };

  return (
    <>
      <PageHeader title="API keys" sub={`Project: ${current.name}. Test keys only.`} action={<button className="btn btn-primary" onClick={() => act(() => api(base!, { method: 'POST', body: { label: 'API key' } }))}>New key pair</button>} />
      <div className="mb-6 rounded-xl border border-caramel-500/40 bg-caramel-500/10 p-4 text-sm leading-relaxed text-caramel-200">Secret keys (<code className="font-mono">money_test_sk_…</code>) belong on your <strong>backend servers</strong>. Only the publishable key may appear in browser code.</div>
      {secret && <SecretReveal title="New test keys" onDone={() => setSecret(null)} items={[{ label: 'Publishable key', value: secret.pk }, { label: 'Secret key', value: secret.sk }]} />}
      <ErrorNote message={err ?? error} />
      {loading ? <Spinner /> : !data?.data.length ? <Empty title="No keys">Create a key pair to start calling the API.</Empty> : (
        <Table head={['Label', 'Publishable key', 'Secret key', 'Status', 'Created', 'Last used', '']}>
          {data.data.map((k) => (
            <tr key={k.id}>
              <td className="td">{k.label}</td>
              <td className="td"><span className="font-mono text-xs">{k.publishable_key}</span> <CopyButton text={k.publishable_key} /></td>
              <td className="td font-mono text-xs text-moss-500">{k.secret_key_hint}</td>
              <td className="td"><StatusBadge status={k.status} /></td>
              <td className="td text-caramel-200/70">{formatDate(k.created_at)}</td>
              <td className="td text-caramel-200/70">{formatDate(k.last_used_at)}</td>
              <td className="td">{k.status === 'active' && <div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Rotate this key? The old secret stops working immediately.')) void act(() => api(`${base}/${k.id}/rotate`, { method: 'POST' })); }}>Rotate</button><button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Revoke this key? This cannot be undone.')) void act(() => api(`${base}/${k.id}`, { method: 'DELETE' })); }}>Revoke</button></div>}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
