import { badRequest } from '@/lib/core/errors';
import { SCENARIO_LIST } from '@/lib/core/simulation';
import { Router, requireSession, segmentsOf, type RouteCtx } from '@/lib/server/http';
import { appUrl, service } from '@/lib/server/runtime';
import { serializeDelivery, serializeEvent, serializeKey, serializeOrder, serializeProject, serializeRefund, serializeTxn, serializeWebhook } from '@/services/serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const list = <T,>(data: T[]) => ({ object: 'list', data });
/** Ownership is structural: every Firestore path is rooted at the uid from the verified ID token. */
const project = async (c: RouteCtx) => {
  const s = await requireSession(c.req);
  await service().getProject(s.uid, c.params.pid);
  return { s, ctx: { uid: s.uid, projectId: c.params.pid } };
};
const num = (v: string | null) => (v !== null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : undefined);
const date = (v: string | null) => { if (!v) return undefined; const t = Date.parse(v); return Number.isNaN(t) ? undefined : t; };

const router = new Router()
  .add('GET', 'me', async (c) => { const s = await requireSession(c.req, { allowUnverified: true }); return { uid: s.uid, email: s.email, email_verified: s.emailVerified, admin: s.admin }; })
  .add('POST', 'account/deletion-request', async (c) => { const s = await requireSession(c.req); await service().requestAccountDeletion(s.uid); return { requested: true }; })
  .add('GET', 'meta', async () => ({ scenarios: SCENARIO_LIST.map(({ id, label, description }) => ({ id, label, description })), app_url: appUrl() }))
  .add('GET', 'stats', async (c) => { const s = await requireSession(c.req); return service().stats(s.uid, c.query.get('project') ?? undefined); })
  // projects
  .add('GET', 'projects', async (c) => { const s = await requireSession(c.req); return list((await service().listProjects(s.uid)).map(serializeProject)); })
  .add('POST', 'projects', async (c) => {
    const s = await requireSession(c.req);
    const r = await service().createProject(s.uid, await c.body());
    return { project: serializeProject(r.project), key: serializeKey(r.key), secret_key: r.secretKey };
  }, 201)
  .add('GET', 'projects/:pid', async (c) => { const { s } = await project(c); return serializeProject(await service().getProject(s.uid, c.params.pid)); })
  .add('PATCH', 'projects/:pid', async (c) => {
    const { s } = await project(c);
    const b = (await c.body()) as { status?: string };
    if (b.status === 'archived' || b.status === 'active') return serializeProject(await service().setProjectStatus(s.uid, c.params.pid, b.status));
    return serializeProject(await service().updateProject(s.uid, c.params.pid, b));
  })
  .add('DELETE', 'projects/:pid', async (c) => {
    const { s } = await project(c);
    const b = (await c.body()) as { confirm_name?: string };
    await service().deleteProject(s.uid, c.params.pid, String(b.confirm_name ?? ''));
    return { deleted: true };
  })
  // keys
  .add('GET', 'projects/:pid/keys', async (c) => list((await service().listKeys((await project(c)).ctx)).map(serializeKey)))
  .add('POST', 'projects/:pid/keys', async (c) => {
    const { ctx } = await project(c);
    const b = (await c.body()) as { label?: string };
    const r = await service().createKeyPair(ctx, typeof b.label === 'string' ? b.label : undefined);
    return { key: serializeKey(r.key), secret_key: r.secretKey };
  }, 201)
  .add('POST', 'projects/:pid/keys/:kid/rotate', async (c) => { const r = await service().rotateKey((await project(c)).ctx, c.params.kid); return { key: serializeKey(r.key), secret_key: r.secretKey }; })
  .add('DELETE', 'projects/:pid/keys/:kid', async (c) => { await service().revokeKey((await project(c)).ctx, c.params.kid); return { revoked: true }; })
  // orders (dashboard can create test orders too)
  .add('GET', 'projects/:pid/orders', async (c) => {
    const { ctx } = await project(c);
    const q = c.query;
    const rows = await service().listOrders(ctx, { status: q.get('status') ?? undefined, merchantOrderId: q.get('merchant_order_id') ?? undefined, minAmount: num(q.get('min_amount')), maxAmount: num(q.get('max_amount')), from: date(q.get('from')), to: date(q.get('to')), limit: 200 });
    return list(rows.map((o) => serializeOrder(o, appUrl())));
  })
  .add('POST', 'projects/:pid/orders', async (c) => serializeOrder((await service().createOrder((await project(c)).ctx, await c.body())).order, appUrl()), 201)
  .add('GET', 'projects/:pid/orders/:oid', async (c) => serializeOrder(await service().getOrder((await project(c)).ctx, c.params.oid), appUrl()))
  .add('POST', 'projects/:pid/orders/:oid/simulate', async (c) => {
    const { ctx } = await project(c);
    const b = (await c.body()) as { scenario?: unknown };
    if (typeof b.scenario !== 'string') throw badRequest('scenario is required.');
    return serializeOrder((await service().simulate(ctx, c.params.oid, b.scenario, 'dashboard')).order, appUrl());
  })
  .add('POST', 'projects/:pid/orders/:oid/cancel', async (c) => serializeOrder(await service().cancelOrder((await project(c)).ctx, c.params.oid, 'dashboard'), appUrl()))
  // transactions
  .add('GET', 'projects/:pid/transactions', async (c) => list((await service().listTransactions((await project(c)).ctx, 200)).map(serializeTxn)))
  .add('GET', 'projects/:pid/transactions/:tid', async (c) => {
    const { transaction, events } = await service().getTransaction((await project(c)).ctx, c.params.tid);
    return { ...serializeTxn(transaction), events: events.map(serializeEvent) };
  })
  // refunds
  .add('GET', 'projects/:pid/refunds', async (c) => list((await service().listRefunds((await project(c)).ctx, 200)).map(serializeRefund)))
  .add('POST', 'projects/:pid/refunds', async (c) => serializeRefund((await service().createRefund((await project(c)).ctx, await c.body(), 'dashboard')).refund), 201)
  // webhooks
  .add('GET', 'projects/:pid/webhooks', async (c) => list((await service().listWebhooks((await project(c)).ctx)).map(serializeWebhook)))
  .add('POST', 'projects/:pid/webhooks', async (c) => { const r = await service().createWebhook((await project(c)).ctx, await c.body()); return { ...serializeWebhook(r.webhook), secret: r.secret }; }, 201)
  .add('DELETE', 'projects/:pid/webhooks/:wid', async (c) => { await service().deleteWebhook((await project(c)).ctx, c.params.wid); return { deleted: true }; })
  .add('GET', 'projects/:pid/deliveries', async (c) => list((await service().listDeliveries((await project(c)).ctx)).map(serializeDelivery)))
  .add('POST', 'projects/:pid/deliveries/:did/retry', async (c) => serializeDelivery(await service().retryDelivery((await project(c)).ctx, c.params.did)))
  // logs
  .add('GET', 'projects/:pid/logs', async (c) => list(await service().listApiLogs((await project(c)).ctx, 100)));

async function handle(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return router.dispatch(req, await segmentsOf(ctx));
}
export const GET = handle, POST = handle, PATCH = handle, DELETE = handle;
