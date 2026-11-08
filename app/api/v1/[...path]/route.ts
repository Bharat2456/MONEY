import { forbidden, badRequest, unauthorized } from '@/lib/core/errors';
import { extractBearer } from '@/lib/core/keys';
import { Router, rateLimit, segmentsOf, type RouteCtx } from '@/lib/server/http';
import { service } from '@/lib/server/runtime';
import { serializeDelivery, serializeEvent, serializeOrder, serializeRefund, serializeTxn, serializeWebhook } from '@/services/serializers';
import { appUrl } from '@/lib/server/runtime';
import { SCENARIO_LIST } from '@/lib/core/simulation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const list = <T,>(data: T[]) => ({ object: 'list', data, has_more: false });

async function auth(c: RouteCtx) {
  const token = extractBearer(c.req.headers.get('authorization'));
  if (!token) throw unauthorized('Missing API key. Send "Authorization: Bearer money_test_sk_…".', 'missing_api_key');
  const ctx = await service().authenticateSecretKey(token);
  rateLimit(`key:${ctx.keyId}`, 120);
  return ctx;
}
const idem = (c: RouteCtx) => c.req.headers.get('idempotency-key') ?? undefined;
const url = () => appUrl();

const router = new Router()
  .add('POST', 'payment-orders', async (c) => {
    const ctx = await auth(c);
    const { order, replayed } = await service().createOrder(ctx, await c.body(), idem(c));
    return new Response(JSON.stringify(serializeOrder(order, url())), { status: replayed ? 200 : 201, headers: { 'content-type': 'application/json', ...(replayed ? { 'Idempotent-Replayed': 'true' } : {}) } });
  })
  .add('GET', 'payment-orders', async (c) => {
    const ctx = await auth(c);
    const q = c.query;
    const rows = await service().listOrders(ctx, { status: q.get('status') ?? undefined, merchantOrderId: q.get('merchant_order_id') ?? undefined, limit: Math.min(Number(q.get('limit') ?? 50) || 50, 100) });
    return list(rows.map((o) => serializeOrder(o, url())));
  })
  .add('GET', 'payment-orders/:id', async (c) => serializeOrder(await service().getOrder(await auth(c), c.params.id), url()))
  .add('POST', 'payment-orders/:id/simulate', async (c) => {
    const ctx = await auth(c);
    const b = (await c.body()) as { scenario?: unknown };
    if (typeof b.scenario !== 'string') throw badRequest('scenario is required.', { field: 'scenario', allowed: SCENARIO_LIST.map((s) => s.id) });
    return serializeOrder((await service().simulate(ctx, c.params.id, b.scenario, 'api', idem(c))).order, url());
  })
  .add('POST', 'payment-orders/:id/cancel', async (c) => serializeOrder(await service().cancelOrder(await auth(c), c.params.id, 'api'), url()))
  .add('POST', 'refunds', async (c) => {
    const ctx = await auth(c);
    const { refund, replayed } = await service().createRefund(ctx, await c.body(), 'api', idem(c));
    return new Response(JSON.stringify(serializeRefund(refund)), { status: replayed ? 200 : 201, headers: { 'content-type': 'application/json' } });
  })
  .add('GET', 'refunds/:id', async (c) => {
    const ctx = await auth(c);
    const [r, events] = await Promise.all([service().getRefund(ctx, c.params.id), service().getRefundEvents(ctx, c.params.id)]);
    return { ...serializeRefund(r), events: events.map(serializeEvent) };
  })
  .add('GET', 'transactions', async (c) => list((await service().listTransactions(await auth(c))).map(serializeTxn)))
  .add('GET', 'transactions/:id', async (c) => {
    const { transaction, events } = await service().getTransaction(await auth(c), c.params.id);
    return { ...serializeTxn(transaction), events: events.map(serializeEvent) };
  })
  .add('POST', 'webhooks', async (c) => {
    const { webhook, secret } = await service().createWebhook(await auth(c), await c.body());
    return new Response(JSON.stringify({ ...serializeWebhook(webhook), secret }), { status: 201, headers: { 'content-type': 'application/json' } }); // secret is shown once
  })
  .add('GET', 'webhooks', async (c) => list((await service().listWebhooks(await auth(c))).map(serializeWebhook)))
  .add('DELETE', 'webhooks/:id', async (c) => { await service().deleteWebhook(await auth(c), c.params.id); return { id: c.params.id, deleted: true }; })
  .add('GET', 'webhook-deliveries', async (c) => list((await service().listDeliveries(await auth(c))).map(serializeDelivery)))
  // Browser-safe lookup used by money.js with a PUBLISHABLE key. Returns only checkout-facing, non-sensitive fields.
  .add('GET', 'public/orders/:id', async (c) => {
    const pk = c.query.get('key') ?? '';
    const ctx = await service().resolvePublishableKey(pk);
    if (!ctx) throw unauthorized('Invalid publishable key.', 'invalid_api_key');
    rateLimit(`pk:${pk}`, 60);
    const o = await service().getOrder(ctx, c.params.id).catch(() => { throw forbidden('Order not found for this key.', 'forbidden'); });
    return new Response(JSON.stringify({ id: o.id, status: o.status, amount: o.amount, currency: o.currency, checkout_url: serializeOrder(o, url()).checkout_url }), {
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
    });
  });

async function handle(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const path = await segmentsOf(ctx);
  const started = Date.now();
  const res = await router.dispatch(req, path);
  // API log (metadata only) — best effort, only for authenticated requests
  try {
    const token = extractBearer(req.headers.get('authorization'));
    if (token && path[0] !== 'public') {
      const a = await service().authenticateSecretKey(token).catch(() => null);
      if (a) await service().logApi(a, { method: req.method, path: '/api/v1/' + path.join('/'), status: res.status, durationMs: Date.now() - started, keyId: a.keyId });
    }
  } catch { /* logging must never break the API */ }
  return res;
}

export const GET = handle, POST = handle, DELETE = handle;
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' } });
}
