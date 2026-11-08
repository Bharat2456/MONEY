import type { Metadata } from 'next';
import Link from 'next/link';
import { CodeBlock, CodeTabs } from '@/components/ui';
import { SCENARIO_LIST } from '@/lib/core/simulation';
import { TRANSITIONS } from '@/lib/core/state-machine';
import * as S from '@/lib/content/samples';

export const metadata: Metadata = { title: 'Documentation' };

const TOC = [['start', 'Quick start'], ['keys', 'API keys'], ['orders', 'Create an order'], ['checkout', 'Hosted checkout'], ['simulate', 'Simulate outcomes'], ['status', 'Check status'], ['webhooks', 'Webhooks'], ['refunds', 'Refunds'], ['errors', 'Errors & idempotency'], ['local', 'Run locally']] as const;

function H({ id, children }: { id: string; children: React.ReactNode }) { return <h2 id={id} className="display mt-16 scroll-mt-24 text-4xl text-caramel-300 first:mt-0">{children}</h2>; }
const P = ({ children }: { children: React.ReactNode }) => <p className="mt-4 leading-relaxed text-caramel-200/90">{children}</p>;
const C = ({ children }: { children: React.ReactNode }) => <code className="rounded bg-sangria-950 px-1.5 py-0.5 font-mono text-[13px] text-caramel-200">{children}</code>;

export default function Docs() {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-[13rem_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-sm text-moss-500">On this page</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm lg:block lg:space-y-2">{TOC.map(([id, l]) => <li key={id}><a href={`#${id}`} className="text-caramel-200 hover:text-cream">{l}</a></li>)}</ul>
      </aside>
      <div className="min-w-0 max-w-3xl">
        <h1 className="display text-5xl text-cream md:text-6xl">Documentation</h1>
        <P>Everything here targets <strong className="font-medium text-cream">test mode</strong>. All payments, refunds and notifications are simulated.</P>

        <H id="start">Quick start</H>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-caramel-200/90">
          <li><Link href="/register" className="text-caramel-300 underline underline-offset-4">Register</Link> with your email and click the verification link.</li>
          <li>In the dashboard choose <strong className="font-medium text-cream">Projects → New project</strong>. A first key pair is created for you.</li>
          <li>Copy the <C>money_test_sk_…</C> secret key <em>immediately</em> — it is displayed once and cannot be recovered. Store it in your backend’s environment, e.g. <C>MONEY_SECRET_KEY</C>.</li>
          <li>Create an order from your server, send the customer to its <C>checkout_url</C>, then confirm the result server-to-server.</li>
        </ol>

        <H id="keys">API keys</H>
        <P>Each project has isolated credentials. The <strong className="font-medium text-cream">publishable key</strong> (<C>money_test_pk_…</C>) is public and can only look up a checkout URL. The <strong className="font-medium text-cream">secret key</strong> (<C>money_test_sk_…</C>) authorises every other call.</P>
        <div className="mt-4 rounded-xl border border-bad/40 bg-bad-deep/50 p-4 text-sm leading-relaxed text-bad">Secret keys belong on your backend only. Never embed one in a web page, mobile app or repository. If one leaks, rotate or revoke it on the Keys page — revocation is immediate. MONEY stores only a keyed hash, so a lost secret cannot be shown again.</div>

        <H id="orders">Create a payment order</H>
        <P>Amounts are integers in the smallest unit: ₹500.00 is <C>50000</C> paise. Supported currencies: INR, USD, EUR. Send an <C>Idempotency-Key</C> header so retries never create duplicates. A <C>return_url</C> must be https (or localhost) and match your project’s website or allowed return origins.</P>
        <div className="mt-5"><CodeTabs tabs={[{ id: 'curl', label: 'cURL', code: S.createOrder.curl }, { id: 'js', label: 'JavaScript', code: S.createOrder.js }, { id: 'ts', label: 'TypeScript', code: S.createOrder.ts }, { id: 'node', label: 'Node.js', code: S.createOrder.node }, { id: 'py', label: 'Python', code: S.createOrder.python }]} /></div>

        <H id="checkout">Hosted checkout</H>
        <P>Redirect the customer to <C>checkout_url</C>. They need no MONEY account. The page shows your project name, amount and order reference, a test-mode banner, and a panel of <em>simulated</em> payment methods — each one picks the outcome to test. It never asks for a UPI PIN, card CVV, OTP or bank login. Afterwards the customer is sent to your <C>return_url</C> with <C>?payment_order_id=…&amp;status=…</C>.</P>
        <div className="mt-4 rounded-xl border border-caramel-500/40 bg-caramel-500/10 p-4 text-sm leading-relaxed text-caramel-200">A browser redirect is <strong>never</strong> proof of payment. Always verify with a signed webhook or by calling <C>GET /api/v1/payment-orders/:id</C> from your server before fulfilling an order.</div>
        <P>Browser-side, you can start checkout with the publishable key only:</P>
        <div className="mt-3"><CodeBlock code={S.htmlCheckout} label="HTML" /></div>

        <H id="simulate">Simulate outcomes</H>
        <P>Choose a scenario in the checkout panel, or drive it from tests via the API. The backend owns every state change and delay: refreshing or closing the browser never alters the result. Because the free tier has no background queue, a due delayed transition is applied the next time the order is read, and its webhook is sent then.</P>
        <div className="mt-4 overflow-x-auto rounded-xl border border-moss-700"><table className="w-full min-w-[30rem]"><thead className="bg-moss-900"><tr><th className="th">Scenario ID</th><th className="th">Behaviour</th></tr></thead><tbody className="divide-y divide-moss-800">{SCENARIO_LIST.map((s) => <tr key={s.id}><td className="td font-mono text-[13px] text-caramel-300">{s.id}</td><td className="td text-caramel-200/80">{s.description}</td></tr>)}</tbody></table></div>
        <div className="mt-4"><CodeBlock code={S.simulate} label="cURL" /></div>
        <h3 className="display mt-8 text-2xl text-cream">Permitted state transitions</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-moss-700"><table className="w-full min-w-[26rem]"><thead className="bg-moss-900"><tr><th className="th">From</th><th className="th">To</th></tr></thead><tbody className="divide-y divide-moss-800">{Object.entries(TRANSITIONS).map(([from, to]) => <tr key={from}><td className="td font-mono text-[13px] text-cream">{from}</td><td className="td font-mono text-[13px] text-caramel-200/80">{to.length ? to.join(', ') : '— terminal'}</td></tr>)}</tbody></table></div>

        <H id="status">Retrieve status</H>
        <div className="mt-4"><CodeTabs tabs={[{ id: 'curl', label: 'cURL', code: S.getOrder.curl }, { id: 'js', label: 'JavaScript', code: S.getOrder.js }, { id: 'py', label: 'Python', code: S.getOrder.python }]} /></div>
        <P>Also available: <C>GET /api/v1/payment-orders</C>, <C>GET /api/v1/transactions</C> and <C>GET /api/v1/transactions/:id</C> (includes the immutable event history).</P>

        <H id="webhooks">Webhooks</H>
        <P>Register an https endpoint on the Webhooks page or <C>POST /api/v1/webhooks</C>; the signing secret (<C>whsec_…</C>) is shown once. Event types: <C>payment.created</C>, <C>payment.pending</C>, <C>payment.succeeded</C>, <C>payment.failed</C>, <C>payment.cancelled</C>, <C>payment.expired</C>, <C>payment.reversed</C>, <C>refund.created</C>, <C>refund.succeeded</C>, <C>refund.failed</C>. Headers: <C>money-signature</C>, <C>money-event-id</C>, <C>money-delivery-id</C>, <C>money-event-type</C>.</P>
        <div className="mt-4"><CodeBlock code={S.webhookPayload} label="Payload (JSON)" /></div>
        <h3 className="display mt-8 text-2xl text-cream">Verify the signature</h3>
        <P>The signature is <C>HMAC-SHA256(secret, "&lt;t&gt;.&lt;raw body&gt;")</C> in hex. Verify against the <em>raw</em> body, reject timestamps older than five minutes, and de-duplicate on <C>event.id</C> — deliveries may repeat.</P>
        <div className="mt-4"><CodeTabs tabs={[{ id: 'ts', label: 'TypeScript', code: S.webhookVerifyTs }, { id: 'py', label: 'Python', code: S.webhookVerifyPy }]} /></div>
        <div className="mt-4 rounded-xl border border-caramel-500/40 bg-caramel-500/10 p-4 text-sm leading-relaxed text-caramel-200"><strong>Limits to know.</strong> Each event is attempted once, immediately, with a 4-second timeout; failures can be retried manually from the dashboard (up to 10 attempts). There is no durable background retry queue on the free tier. Endpoints must be public https hosts — localhost, private IPs and cloud-metadata addresses are blocked. While developing, use a tunnel such as Cloudflare Tunnel or ngrok.</div>

        <H id="refunds">Refunds</H>
        <P>Only successful payments can be refunded. Cumulative successful refunds cannot exceed the original amount; a full refund moves the order to <C>REFUNDED</C>. Refunds are simulated — no money is returned.</P>
        <div className="mt-4"><CodeBlock code={S.refund} label="cURL" /></div>

        <H id="errors">Errors &amp; idempotency</H>
        <P>Errors share one shape: <C>{'{ "error": { "code", "message", "details?" } }'}</C>. Common codes: <C>invalid_request</C> (400), <C>invalid_api_key</C> (401), <C>not_found</C> (404), <C>invalid_state_transition</C> / <C>payment_already_processed</C> (409), <C>idempotency_key_reuse</C> / <C>refund_exceeds_available</C> (422), <C>rate_limited</C> (429, with <C>Retry-After</C>), <C>quota_exceeded</C> (429) and <C>service_unavailable</C> (503).</P>
        <P>Send <C>Idempotency-Key</C> on <C>POST</C> requests. Replaying the same key with the same body returns the original resource (header <C>Idempotent-Replayed: true</C>); the same key with a different body returns 422.</P>

        <H id="local">Run MONEY locally</H>
        <div className="mt-4"><CodeBlock label="PowerShell" code={`npm install\nCopy-Item .env.example .env.local   # fill in the Firebase values — see docs/FIREBASE_SETUP.md\nnpm run dev                        # http://localhost:3000\nnpm run demo:merchant              # sample merchant at http://localhost:4242`} /></div>
      </div>
    </div>
  );
}
