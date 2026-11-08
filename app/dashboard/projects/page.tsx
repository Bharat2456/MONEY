'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useProjects } from '@/components/ProjectContext';
import { ErrorNote, Empty, Field, PageHeader, SecretReveal, Spinner, StatusBadge } from '@/components/ui';
import { api, errorMessage, formatDate } from '@/lib/client/api';

const CATS = ['education', 'ecommerce', 'saas', 'mobile', 'hackathon', 'nonprofit', 'other'];

export default function Projects() {
  const { projects, loading, reload, setCurrentId } = useProjects();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ sk: string; pk: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    try {
      const origins = String(f.get('origins') ?? '').split(/[\s,]+/).filter(Boolean);
      const r = await api<{ project: { id: string }; key: { publishable_key: string }; secret_key: string }>('projects', { method: 'POST', body: { name: f.get('name'), description: f.get('description'), website_url: f.get('website'), category: f.get('category'), allowed_return_origins: origins } });
      setSecret({ sk: r.secret_key, pk: r.key.publishable_key }); setCurrentId(r.project.id); setShow(false); await reload();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Projects" sub="Each project has isolated test keys, orders, webhooks and logs. Test mode only." action={<button className="btn btn-primary" onClick={() => setShow(!show)}>{show ? 'Close' : 'New project'}</button>} />
      {secret && <SecretReveal title="Your test keys" onDone={() => setSecret(null)} items={[{ label: 'Publishable key (safe for browsers)', value: secret.pk }, { label: 'Secret key (backend only)', value: secret.sk }]} />}
      {show && (
        <form onSubmit={create} className="panel mb-8 grid gap-5 p-6 md:grid-cols-2">
          <div className="md:col-span-2"><ErrorNote message={error} /></div>
          <Field label="Project name"><input name="name" required minLength={2} maxLength={60} className="input" /></Field>
          <Field label="Category"><select name="category" className="input" defaultValue="other">{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Website URL" hint="Its origin is allowed for return URLs."><input name="website" type="url" placeholder="https://example.com" className="input" /></Field>
          <Field label="Extra allowed return origins" hint="Space or comma separated, https only. localhost is always allowed."><input name="origins" className="input" placeholder="https://staging.example.com" /></Field>
          <div className="md:col-span-2"><Field label="Description"><textarea name="description" maxLength={280} rows={2} className="input" /></Field></div>
          <div className="md:col-span-2"><button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create project'}</button></div>
        </form>
      )}
      {loading ? <Spinner /> : projects.length === 0 ? <Empty title="No projects yet">Create your first project to receive test API keys.</Empty> : (
        <ul className="grid gap-4 md:grid-cols-2">{projects.map((p) => (
          <li key={p.id} className="panel p-6"><div className="flex items-start justify-between gap-3"><h2 className="display text-3xl">{p.name}</h2><StatusBadge status={p.status} /></div>
            <p className="mt-2 text-sm text-caramel-200/75">{p.description || 'No description.'}</p>
            <p className="mt-3 text-xs text-moss-500">{p.category} · test mode · created {formatDate(p.created_at)}</p>
            <div className="mt-5 flex gap-2"><Link href={`/dashboard/projects/${p.id}`} className="btn btn-ghost btn-sm">View & edit</Link><button className="btn btn-ghost btn-sm" onClick={() => setCurrentId(p.id)}>Use this project</button></div></li>
        ))}</ul>
      )}
    </>
  );
}
