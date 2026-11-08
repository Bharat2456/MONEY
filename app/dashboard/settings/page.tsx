'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ErrorNote, PageHeader } from '@/components/ui';
import { api, errorMessage } from '@/lib/client/api';
import { useApiData } from '@/hooks/useApiData';
import Link from 'next/link';

export default function Settings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const me = useApiData<{ admin: boolean }>('me');
  const [err, setErr] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  return (
    <>
      <PageHeader title="Settings" sub="Your account." />
      <ErrorNote message={err} />
      <section className="panel mb-6 max-w-2xl p-6"><h2 className="display text-3xl">Profile</h2>
        <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-moss-500">Email</dt><dd>{user?.email}</dd></div><div><dt className="text-moss-500">Email verified</dt><dd>{user?.emailVerified ? 'Yes' : 'No'}</dd></div></dl>
        <div className="mt-5 flex gap-3"><button className="btn btn-ghost" onClick={async () => { await logout(); router.replace('/'); }}>Log out</button>{me.data?.admin && <Link href="/admin" className="btn btn-ghost">Admin console</Link>}</div>
      </section>
      <section className="max-w-2xl rounded-2xl border border-bad/40 p-6"><h2 className="display text-3xl text-bad">Delete my account</h2>
        <p className="mt-2 text-sm leading-relaxed text-caramel-200/80">Submitting a request asks an administrator to erase your account, projects, keys, orders, webhooks and logs. See the <Link href="/legal/data-retention" className="underline underline-offset-4">Data Retention Policy</Link>.</p>
        {requested ? <p className="mt-4 text-sm text-ok">Request recorded. You will be contacted to confirm.</p> : <button className="btn btn-danger mt-5" onClick={async () => { if (!confirm('Request deletion of your account and all data?')) return; try { await api('account/deletion-request', { method: 'POST' }); setRequested(true); } catch (e) { setErr(errorMessage(e)); } }}>Request account deletion</button>}
      </section>
    </>
  );
}
