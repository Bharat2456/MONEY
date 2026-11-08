import Link from 'next/link';
import { HeroTicket } from '@/components/HeroTicket';
import { CodeTabs } from '@/components/ui';
import { createOrder } from '@/lib/content/samples';
import { FAQ } from '@/lib/content/faq';

const FLOW = [
  ['Create a free account', 'Register with your email and verify it. That is all the paperwork there is.'],
  ['Make a project', 'Each project gets its own test keys, orders, webhooks and logs.'],
  ['Create orders from your server', 'Call the REST API with your secret test key. Amounts are in paise.'],
  ['Send customers to hosted checkout', 'Pick the outcome you want to test: success, failure, pending, timeout and more.'],
  ['Handle the webhook', 'Receive a signed event, verify it, then confirm status server-to-server.'],
];

const FEATURES = [
  ['A real state machine', 'Created, pending, processing, success, failed, cancelled, expired, reversed, refunded. Illegal transitions are rejected and every change is an immutable event.'],
  ['Outcomes on demand', 'Instant success, delayed confirmation, pending, declines, timeouts, reversals, duplicates. Backend-timed, so refreshing the browser never changes the result.'],
  ['Signed webhooks', 'HMAC-SHA256 signatures, timestamps, event IDs, delivery logs and manual retry. Destinations are checked against SSRF.'],
  ['Refunds, partial and full', 'Cumulative refunds can never exceed the original amount, and failed refunds leave balances untouched.'],
  ['Safe by design', 'Secret keys are shown once and stored only as hashes. Idempotency keys protect against duplicate requests.'],
  ['Built for builders', 'Copy-paste examples in JavaScript, TypeScript, Node.js, Python, cURL and plain HTML, plus a runnable sample merchant.'],
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-16 md:grid-cols-[1.1fr_1fr] md:pt-24">
        <div>
          <p className="mb-5 text-sm text-caramel-300">Modern Online Network Empowering You</p>
          <h1 className="display text-5xl leading-[1.02] text-cream md:text-7xl">Payment testing shouldn’t be expensive.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-caramel-200/85">Build, integrate and test complete payment experiences without needing a commercial payment gateway. Orders, hosted checkout, webhooks and refunds — all simulated, all free.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/register" className="btn btn-primary">Create a free account</Link>
            <Link href="/docs" className="btn btn-ghost">Read the docs</Link>
          </div>
          <p className="mt-6 max-w-md text-sm text-moss-500">MONEY simulates payments for development and testing. It is not a real payment processor and moves no real money.</p>
        </div>
        <HeroTicket />
      </section>

      <section className="border-y border-moss-800 bg-moss-900/50">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="display text-4xl text-cream md:text-5xl">Why we built it</h2>
            <p className="mt-5 leading-relaxed text-caramel-200/85">Students, hackathon teams and first-time founders often can’t get a merchant account just to demo a checkout. They have no registered company, no business documents and no budget. MONEY removes that barrier for <em>testing</em>, so the payment screen in your prototype can behave like the real thing.</p>
          </div>
          <ol className="space-y-0 divide-y divide-moss-700 border-y border-moss-700">
            {FLOW.map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[2.5rem_1fr] gap-4 py-5">
                <span className="display text-3xl text-caramel-500">{i + 1}</span>
                <div><h3 className="font-medium text-cream">{t}</h3><p className="mt-1 text-sm leading-relaxed text-caramel-200/75">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="display max-w-2xl text-4xl text-cream md:text-5xl">Everything a payment integration needs to be tested against.</h2>
        <dl className="mt-12 grid gap-x-14 gap-y-10 md:grid-cols-2">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="border-t border-moss-700 pt-5"><dt className="display text-2xl text-caramel-300">{t}</dt><dd className="mt-2 text-sm leading-relaxed text-caramel-200/80">{d}</dd></div>
          ))}
        </dl>
      </section>

      <section className="border-y border-moss-800 bg-sangria-950">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1fr_1.5fr]">
          <div>
            <h2 className="display text-4xl text-cream md:text-5xl">One request to start.</h2>
            <p className="mt-5 leading-relaxed text-caramel-200/85">Create the order on your backend, redirect the customer to the hosted checkout, and confirm the outcome server-to-server. Keep the secret key on your server — the browser only ever sees the publishable key.</p>
            <Link href="/docs" className="btn btn-ghost mt-7">Full integration guide</Link>
          </div>
          <CodeTabs tabs={[
            { id: 'curl', label: 'cURL', code: createOrder.curl }, { id: 'node', label: 'Node.js', code: createOrder.node },
            { id: 'ts', label: 'TypeScript', code: createOrder.ts }, { id: 'js', label: 'JavaScript', code: createOrder.js }, { id: 'py', label: 'Python', code: createOrder.python },
          ]} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="panel grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
          <div>
            <h2 className="display text-4xl text-cream md:text-5xl">Free, for as long as it’s a sandbox.</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-caramel-200/80">Up to 10 projects, 5 key pairs per project, 5 webhook endpoints per project. No credit card. Fair-use rate limits apply and the service depends on free-tier infrastructure, so capacity is not unlimited.</p>
          </div>
          <Link href="/pricing" className="btn btn-primary">See what’s included</Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-20">
        <h2 className="display text-4xl text-cream md:text-5xl">Questions, answered plainly</h2>
        <div className="mt-8 divide-y divide-moss-700 border-y border-moss-700">
          {FAQ.slice(0, 5).map((f) => (
            <details key={f.q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between text-cream"><span>{f.q}</span><span className="text-caramel-500 transition-transform group-open:rotate-45" aria-hidden>+</span></summary><p className="mt-3 text-sm leading-relaxed text-caramel-200/80">{f.a}</p></details>
          ))}
        </div>
        <Link href="/faq" className="mt-6 inline-block text-sm text-caramel-300 underline underline-offset-4">All questions</Link>
      </section>

      <section className="bg-caramel-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-14">
          <p className="display text-4xl text-sangria-900 md:text-5xl">Your money. Your move.</p>
          <Link href="/register" className="btn bg-sangria-900 text-cream hover:bg-sangria-800">Start building free</Link>
        </div>
      </section>
    </>
  );
}
