'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useProjects, type ProjectView } from '@/components/ProjectContext';
import { ErrorNote, Field, PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { useApiData } from '@/hooks/useApiData';
import { api, errorMessage, formatDate } from '@/lib/client/api';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { reload, setCurrentId } = useProjects();
  const { data: p, error: loadError, loading, reload: refetch } = useApiData<ProjectView>(`projects/${id}`);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState('');

  if (loading) return <Spinner />;
  if (!p) return <ErrorNote message={loadError ?? 'Project not found.'} />;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null); setSaved(false);
    try {
      await api(`projects/${id}`, { method: 'PATCH', body: { name: f.get('name'), description: f.get('description'), website_url: f.get('website'), category: p!.category, allowed_return_origins: String(f.get('origins')).split(/[\s,]+/).filter(Boolean) } });
      setSaved(true); await refetch(); await reload();
    } catch (err) { setError(errorMessage(err)); }
  }
  async function setStatus(status: 'archived' | 'active') {
    try { await api(`projects/${id}`, { method: 'PATCH', body: { status } }); await refetch(); await reload(); } catch (err) { setError(errorMessage(err)); }
  }
  async function remove() {
    try { await api(`projects/${id}`, { method: 'DELETE', body: { confirm_name: confirm } }); await reload(); router.replace('/dashboard/projects'); } catch (err) { setError(errorMessage(err)); }
  }

  return (
    <>
      <PageHeader title={p.name} sub={`Created ${formatDate(p.created_at)} · test mode`} action={<StatusBadge status={p.status} />} />
      <ErrorNote message={error} />
      <div className="mb-8 flex flex-wrap gap-3">
        {['keys', 'orders', 'webhooks'].map((k) => <Link key={k} href={`/dashboard/${k}`} onClick={() => setCurrentId(p.id)} className="btn btn-ghost btn-sm">{k === 'keys' ? 'API keys' : k === 'orders' ? 'Payment orders' : 'Webhooks'}</Link>)}
      </div>
      <form onSubmit={save} className="panel grid gap-5 p-6 md:grid-cols-2">
        <Field label="Project name"><input name="name" defaultValue={p.name} required minLength={2} maxLength={60} className="input" /></Field>
        <Field label="Website URL"><input name="website" type="url" defaultValue={p.website_url} className="input" /></Field>
        <div className="md:col-span-2"><Field label="Description"><textarea name="description" defaultValue={p.description} rows={2} maxLength={280} className="input" /></Field></div>
        <div className="md:col-span-2"><Field label="Allowed return origins" hint="Space or comma separated, https only."><input name="origins" defaultValue={p.allowed_return_origins.join(' ')} className="input" /></Field></div>
        <div className="flex items-center gap-4 md:col-span-2"><button className="btn btn-primary">Save changes</button>{saved && <span className="text-sm text-ok">Saved.</span>}</div>
      </form>
      <section className="mt-10 rounded-2xl border border-bad/40 p-6">
        <h2 className="display text-3xl text-bad">Danger zone</h2>
        <p className="mt-2 text-sm text-caramel-200/80">Archiving disables the project’s API keys (reversible). Deleting permanently removes its keys, orders, transactions, refunds, webhooks and logs.</p>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <button className="btn btn-ghost" onClick={() => setStatus(p.status === 'active' ? 'archived' : 'active')}>{p.status === 'active' ? 'Archive project' : 'Restore project'}</button>
          <Field label={`Type “${p.name}” to enable deletion`}><input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
          <button className="btn btn-danger" disabled={confirm !== p.name} onClick={remove}>Delete permanently</button>
        </div>
      </section>
    </>
  );
}
