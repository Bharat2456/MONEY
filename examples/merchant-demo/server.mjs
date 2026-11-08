// Sample merchant website for MONEY. No dependencies — run with:  node examples/merchant-demo/server.mjs
// It shows the complete, correct integration:
//   1. create the order SERVER-side with the secret key      4. confirm status SERVER-to-SERVER on return
//   2. redirect the customer to the hosted checkout          5. receive + verify signed webhooks (dedupe by event id)
//   3. never trust the browser redirect as proof of payment
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { verifyMoneySignature } from './verify.mjs';

const BASE = (process.env.MONEY_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const SECRET_KEY = process.env.MONEY_SECRET_KEY;            // money_test_sk_…  (stays on this server)
const WEBHOOK_SECRET = process.env.MONEY_WEBHOOK_SECRET;    // whsec_…
const PORT = Number(process.env.PORT ?? 4242);
const SELF = `http://localhost:${PORT}`;

if (!SECRET_KEY) { console.error('Set MONEY_SECRET_KEY (PowerShell: $env:MONEY_SECRET_KEY="money_test_sk_…") and restart.'); process.exit(1); }

const seenEvents = new Set();
const log = [];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const page = (body) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo Shop</title>
<style>body{font:16px/1.6 system-ui;background:#2C0E11;color:#F1E6D6;max-width:640px;margin:48px auto;padding:0 20px}h1{font-weight:500}
button,a.b{background:#B28558;color:#2C0E11;border:0;border-radius:999px;padding:10px 22px;font:inherit;cursor:pointer;text-decoration:none;display:inline-block}
code,pre{background:#1B0709;padding:2px 6px;border-radius:6px}pre{padding:12px;overflow:auto}.card{border:1px solid #4D443A;border-radius:14px;padding:20px;margin:20px 0}</style>${body}`;

const moneyApi = (path, init = {}) => fetch(`${BASE}/api/v1/${path}`, { ...init, headers: { Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json', ...init.headers } });
const readRaw = (req) => new Promise((resolve, reject) => { const c = []; let n = 0; req.on('data', (d) => { n += d.length; if (n > 64 * 1024) { reject(new Error('too large')); req.destroy(); } else c.push(d); }); req.on('end', () => resolve(Buffer.concat(c).toString('utf8'))); req.on('error', reject); });

createServer(async (req, res) => {
  const url = new URL(req.url, SELF);
  const send = (code, body, type = 'text/html; charset=utf-8', extra = {}) => { res.writeHead(code, { 'content-type': type, ...extra }); res.end(body); };
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      return send(200, page(`<h1>Demo Shop</h1><div class="card"><h2>Wireless headphones</h2><p>₹500.00 — <em>simulated payment, no real money</em></p>
        <form method="post" action="/buy"><button>Buy now</button></form></div>
        <p><a href="/events" style="color:#D2B48C">Webhook events received</a></p>`));
    }
    if (req.method === 'POST' && url.pathname === '/buy') {
      const merchantOrderId = `DEMO-${Date.now()}`;
      const r = await moneyApi('payment-orders', {
        method: 'POST', headers: { 'Idempotency-Key': randomUUID() },
        body: JSON.stringify({ amount: 50000, currency: 'INR', description: 'Wireless headphones', merchant_order_id: merchantOrderId, return_url: `${SELF}/payment-result` }),
      });
      const order = await r.json();
      if (!r.ok) return send(502, page(`<h1>Could not create order</h1><pre>${esc(JSON.stringify(order, null, 2))}</pre>`));
      return send(303, '', 'text/plain', { Location: order.checkout_url });   // customer → MONEY hosted checkout
    }
    if (req.method === 'GET' && url.pathname === '/payment-result') {
      // The query string (?status=…) is informational ONLY. Ask MONEY, server-to-server, what really happened.
      const id = url.searchParams.get('payment_order_id') ?? '';
      if (!/^ord_[a-f0-9]{24}$/.test(id)) return send(400, page('<h1>Bad request</h1>'));
      const r = await moneyApi(`payment-orders/${id}`);
      const order = await r.json();
      if (!r.ok) return send(502, page(`<h1>Could not verify payment</h1><pre>${esc(JSON.stringify(order))}</pre>`));
      const paid = order.status === 'SUCCESS';
      return send(200, page(`<h1>${paid ? 'Thank you — payment confirmed' : 'Payment not completed'}</h1>
        <div class="card"><p>Order <code>${esc(order.merchant_order_id)}</code></p><p>Status (verified server-to-server): <strong>${esc(order.status)}</strong></p>
        <p style="color:#857868">Browser said: <code>${esc(url.searchParams.get('status') ?? '')}</code> — never used for fulfilment.</p></div><a class="b" href="/">Back to shop</a>`));
    }
    if (req.method === 'POST' && url.pathname === '/webhooks/money') {
      const raw = await readRaw(req);                                         // RAW body is required for the signature
      if (!WEBHOOK_SECRET) return send(500, 'MONEY_WEBHOOK_SECRET not set', 'text/plain');
      if (!verifyMoneySignature(req.headers['money-signature'], raw, WEBHOOK_SECRET)) return send(400, 'bad signature', 'text/plain');
      const event = JSON.parse(raw);
      if (seenEvents.has(event.id)) return send(200, 'duplicate ignored', 'text/plain');   // deliveries can repeat
      seenEvents.add(event.id);
      log.unshift({ at: new Date().toISOString(), type: event.type, order: event.data?.object?.merchant_order_id, status: event.data?.object?.status });
      if (event.type === 'payment.succeeded') console.log(`✔ fulfil ${event.data.object.merchant_order_id}`);
      return send(200, 'ok', 'text/plain');
    }
    if (req.method === 'GET' && url.pathname === '/events') {
      return send(200, page(`<h1>Webhook events</h1>${log.length ? `<pre>${esc(JSON.stringify(log, null, 2))}</pre>` : '<p>None yet. Expose this server with a public https tunnel and register <code>/webhooks/money</code>.</p>'}<a class="b" href="/">Back</a>`));
    }
    send(404, page('<h1>Not found</h1>'));
  } catch (e) { console.error(e); send(500, page('<h1>Something went wrong</h1>')); }
}).listen(PORT, () => console.log(`Demo merchant on ${SELF}  (MONEY at ${BASE})`));
