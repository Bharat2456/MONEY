'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth } from './AuthProvider';
import { Logo } from './Logo';
import { ProjectProvider, useProjects } from './ProjectContext';
import { ErrorNote, SetupNotice, Spinner, TestModeBanner } from './ui';
import { errorMessage } from '@/lib/client/api';
import { getFirebaseAuth } from '@/lib/client/firebase';

const NAV = [['Overview', '/dashboard'], ['Projects', '/dashboard/projects'], ['API Keys', '/dashboard/keys'], ['Payment Orders', '/dashboard/orders'], ['Transactions', '/dashboard/transactions'], ['Refunds', '/dashboard/refunds'], ['Webhooks', '/dashboard/webhooks'], ['API Logs', '/dashboard/logs'], ['Documentation', '/docs'], ['Settings', '/dashboard/settings']] as const;

function VerifyEmail() {
  const { user, refresh, logout } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-lg p-8 pt-24">
      <div className="panel p-8">
        <h1 className="display text-4xl">Verify your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-caramel-200/80">We sent a link to <strong className="text-cream">{user?.email}</strong>. Click it, then come back and continue. Verification is required before you can create projects or keys.</p>
        <div className="mt-5"><ErrorNote message={err} />{msg && <p className="text-sm text-ok">{msg}</p>}</div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={async () => { await refresh(); }}>I’ve verified</button>
          <button className="btn btn-ghost" onClick={async () => { try { await sendEmailVerification(getFirebaseAuth().currentUser!); setMsg('Verification email sent again.'); setErr(null); } catch (e) { setErr(errorMessage(e)); } }}>Resend email</button>
          <button className="btn btn-ghost" onClick={logout}>Log out</button>
        </div>
      </div>
    </div>
  );
}

function ProjectSwitcher() {
  const { projects, current, setCurrentId } = useProjects();
  if (!projects.length) return null;
  return (
    <label className="block px-3 pb-3">
      <span className="mb-1.5 block px-1 text-xs text-moss-500">Project</span>
      <select className="input py-2" value={current?.id ?? ''} onChange={(e) => setCurrentId(e.target.value)} aria-label="Switch project">
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status === 'archived' ? ' (archived)' : ''}</option>)}
      </select>
    </label>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const nav = (
    <nav aria-label="Dashboard" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
      {NAV.map(([l, h]) => {
        const active = h === '/dashboard' ? path === h : path.startsWith(h);
        return <Link key={h} href={h} aria-current={active ? 'page' : undefined} className={`block rounded-lg px-3 py-2 text-sm transition-colors ${active ? 'bg-caramel-500/15 text-caramel-200' : 'text-caramel-200/70 hover:bg-moss-800 hover:text-cream'}`}>{l}</Link>;
      })}
    </nav>
  );
  return (
    <div className="min-h-screen">
      <TestModeBanner />
      <div className="md:grid md:grid-cols-[16rem_1fr]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-moss-800 bg-sangria-950 md:flex">
          <div className="p-5"><Logo href="/dashboard" /></div>
          <ProjectSwitcher />
          {nav}
          <div className="border-t border-moss-800 p-4 text-xs text-moss-500"><p className="truncate">{user?.email}</p><button onClick={logout} className="mt-2 text-caramel-300 underline underline-offset-4">Log out</button></div>
        </aside>
        <div className="flex items-center justify-between border-b border-moss-800 bg-sangria-950 px-4 py-3 md:hidden">
          <Logo href="/dashboard" /><button className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>Menu</button>
        </div>
        {open && <div className="border-b border-moss-800 bg-sangria-950 pb-3 md:hidden"><ProjectSwitcher />{nav}<button onClick={logout} className="px-6 text-sm text-caramel-300 underline underline-offset-4">Log out</button></div>}
        <main id="main" className="min-w-0 p-5 md:p-10">{children}</main>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => { if (configured && !loading && !user) router.replace(`/login?next=${encodeURIComponent(path)}`); }, [configured, loading, user, router, path]);
  if (!configured) return <SetupNotice />;
  if (loading || !user) return <Spinner label="Checking your session" />;
  if (!user.emailVerified) return <VerifyEmail />;
  return <ProjectProvider><Frame>{children}</Frame></ProjectProvider>;
}
