'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { LogoMark } from '@/components/Logo';
import { StatusBadge, TestModeBanner } from '@/components/ui';
import { formatAmount } from '@/lib/client/api';

interface View {
  order: { id: string; amount: number; currency: string; description: string; merchant_order_id: string; status: string; failure_code: string | null; expires_at: string };
  project_name: string; scenarios: Array<{ id: string; label: string; description: string }>; redirect_url: string | null;
}
const IN_FLIGHT = ['PENDING', 'PROCESSING'];

const RESULT: Record<string, { title: string; body: string; tone: string }> = {
  SUCCESS: { title: 'Payment successful', body: 'This was a simulated payment. No money moved.', tone: 'text-ok' },
  REFUNDED: { title: 'Payment refunded', body: 'This simulated payment was refunded.', tone: 'text-caramel-300' },
  REVERSED: { title: 'Payment reversed', body: 'The simulated payment succeeded and was then reversed.', tone: 'text-bad' },
  FAILED: { title: 'Payment failed', body: 'The simulator declined this payment.', tone: 'text-bad' },
  CANCELLED: { title: 'Payment cancelled', body: 'This payment was cancelled.', tone: 'text-caramel-300' },
  EXPIRED: { title: 'Payment expired', body: 'This checkout session has expired.', tone: 'text-caramel-300' },
};

function Checkout() {
  const { orderId } = useParams<{ orderId: string }>();
  const t = useSearchParams().get('t') ?? '';
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scenario, setScenario] = useState('success');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/checkout/${orderId}?t=${encodeURIComponent(t)}`, { cache: 'no-store' });
    const j = await res.json();
    if (!res.ok) { setError(res.status === 404 ? 'This checkout link is invalid or no longer available.' : (j?.error?.message ?? 'Unable to load checkout.')); return; }
    setView(j); setError(null);
  }, [orderId, t]);

  useEffect(() => { void load(); }, [load]);
  // The browser only *asks* the backend for state; the backend is the sole source of truth and owns all timers.
  useEffect(() => {
    if (!view || !IN_FLIGHT.includes(view.order.status)) return;
    const i = setInterval(() => void load(), 2000);
    return () => clearInterval(i);
  }, [view, load]);

  async function act(body: Record<string, unknown>) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/checkout/${orderId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t, ...body }) });
      const j = await res.json();
      if (res.ok) setView(j); else { setError(j?.error?.message ?? 'Something went wrong.'); await load(); }
    } finally { setBusy(false); }
  }

  if (error && !view) return <Shell><div className="panel p-8 text-center"><h1 className="display text-3xl">Checkout unavailable</h1><p className="mt-3 text-sm text-caramel-200/80">{error}</p></div></Shell>;
  if (!view) return <Shell><p role="status" className="p-10 text-center text-sm text-moss-500">Loading checkout…</p></Shell>;

  const { order } = view;
  const result = RESULT[order.status];
  return (
    <Shell>
      <div className="rounded-2xl bg-sangria-950 shadow-ticket">
        <div className="border-b border-dashed border-moss-700 p-6">
          <p className="text-sm text-caramel-200/70">Paying <strong className="font-medium text-cream">{view.project_name}</strong></p>
          <p className="display mt-2 text-6xl text-cream">{formatAmount(order.amount, order.currency)}</p>
          <p className="mt-2 text-sm text-caramel-200/80">{order.description || 'Order'}</p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-moss-500"><span>Ref {order.merchant_order_id}</span><span>{order.id}</span></p>
        </div>

        {result ? (
          <div className="p-6 text-center" role="status">
            <p className={`display text-4xl ${result.tone}`}>{result.title}</p>
            <p className="mt-2 text-sm text-caramel-200/80">{result.body}{order.failure_code ? ` (${order.failure_code})` : ''}</p>
            {view.redirect_url ? <a href={view.redirect_url} className="btn btn-primary mt-6">Return to {view.project_name}</a> : <p className="mt-6 text-xs text-moss-500">The merchant did not set a return URL. You can close this page.</p>}
            <p className="mt-4 text-xs text-moss-500">Merchants must confirm payment server-to-server — this screen is not proof of payment.</p>
          </div>
        ) : IN_FLIGHT.includes(order.status) ? (
          <div className="p-6 text-center" role="status" aria-live="polite">
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-caramel-500 border-t-transparent" />
            <p className="display mt-4 text-3xl text-cream">{order.status === 'PENDING' ? 'Payment pending' : 'Processing payment'}</p>
            <p className="mt-2 text-sm text-caramel-200/75">The simulator is deciding the outcome on the server. You can safely refresh this page.</p>
            <div className="mt-4"><StatusBadge status={order.status} /></div>
            <button className="btn btn-ghost btn-sm mt-6" disabled={busy} onClick={() => act({ action: 'cancel' })}>Cancel payment</button>
          </div>
        ) : (
          <form className="p-6" onSubmit={(e) => { e.preventDefault(); void act({ action: 'simulate', scenario }); }}>
            <fieldset>
              <legend className="mb-1 text-sm text-cream">Choose a simulated outcome</legend>
              <p className="mb-4 text-xs text-moss-500">These are sandbox test options, not real payment methods.</p>
              <div className="space-y-2">
                {view.scenarios.map((s) => (
                  <label key={s.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${scenario === s.id ? 'border-caramel-500 bg-caramel-500/10' : 'border-moss-700 hover:border-moss-600'}`}>
                    <input type="radio" name="scenario" value={s.id} checked={scenario === s.id} onChange={() => setScenario(s.id)} className="mt-1 accent-[#B28558]" />
                    <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-sm text-cream">{s.label}<span className="rounded bg-moss-700 px-1.5 py-0.5 text-[10px] text-caramel-300">SIMULATED</span></span><span className="mt-0.5 block text-xs text-caramel-200/70">{s.description}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p role="alert" className="mt-4 rounded-lg border border-bad/40 bg-bad-deep/60 px-3 py-2 text-sm text-bad">{error}</p>}
            <button className="btn btn-primary mt-5 w-full py-3" disabled={busy}>{busy ? 'Working…' : `Pay ${formatAmount(order.amount, order.currency)} (simulated)`}</button>
            <button type="button" className="mt-3 w-full text-center text-xs text-caramel-300 underline underline-offset-4" disabled={busy} onClick={() => act({ action: 'cancel' })}>Cancel</button>
          </form>
        )}
      </div>
      <p className="mt-5 text-center text-xs leading-relaxed text-moss-500">No real money moves. MONEY never asks for a UPI PIN, card CVV, OTP or bank login — do not enter any.</p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen"><TestModeBanner />
      <main className="mx-auto max-w-md px-4 py-10"><div className="mb-6 flex items-center gap-2.5"><LogoMark size={24} /><span className="display text-xl text-caramel-200">Money · hosted checkout</span></div>{children}</main>
    </div>
  );
}

export default function Page() { return <Suspense><Checkout /></Suspense>; }
