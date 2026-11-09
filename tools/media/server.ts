// Preview backend: REAL MoneyService + in-memory store, behind routes that mirror app/api/dashboard and app/api/checkout.
// Serves the preview bundle. No Firebase, no real auth — for generating README media only.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toErrorResponse, badRequest } from '@/lib/core/errors';
import { SCENARIO_LIST } from '@/lib/core/simulation';
import { serializeDelivery, serializeEvent, serializeKey, serializeOrder, serializeProject, serializeRefund, serializeTxn, serializeWebhook } from '@/services/serializers';
import { clock, makeService, seed, UID } from './seed';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 5173);
process.env.PREVIEW_URL = `http://127.0.0.1:${PORT}`;
const { svc } = makeService();
const APP = process.env.PREVIEW_URL as string;

const list = <T,>(data: T[]) => ({ object: 'list', data });
const date = (v: string | null) => { if (!v) return undefined; const t = Date.parse(v); return Number.isNaN(t) ? undefined : t; };
const num = (v: string | null) => (v ? Number(v) : undefined);
type Q = URLSearchParams;
type Handler = (p: Record<string, string>, q: Q, body: () => Promise<any>) => Promise<unknown>; // eslint-disable-line @typescript-eslint/no-explicit-any
const routes: Array<[string, string[], Handler, number?]> = [];
const add = (m: string, pattern: string, h: Handler, status?: number) => routes.push([m, pattern.split('/'), h, status]);
const pc = (p: Record<string, string>) => ({ uid: UID, projectId: p.pid });

add('GET', 'me', async () => ({ uid: UID, email: 'maya.rao@example.com', email_verified: true, admin: false }));
add('GET', 'stats', async (_p, q) => svc.stats(UID, q.get('project') ?? undefined));
add('GET', 'projects', async () => list((await svc.listProjects(UID)).map(serializeProject)));
add('POST', 'projects', async (_p, _q, b) => { const r = await svc.createProject(UID, await b()); return { project: serializeProject(r.project), key: serializeKey(r.key), secret_key: r.secretKey }; }, 201);
add('GET', 'projects/:pid', async (p) => serializeProject(await svc.getProject(UID, p.pid)));
add('PATCH', 'projects/:pid', async (p, _q, b) => { const x = await b(); return serializeProject(x.status ? await svc.setProjectStatus(UID, p.pid, x.status) : await svc.updateProject(UID, p.pid, x)); });
add('DELETE', 'projects/:pid', async (p, _q, b) => { await svc.deleteProject(UID, p.pid, String((await b()).confirm_name ?? '')); return { deleted: true }; });
add('GET', 'projects/:pid/keys', async (p) => list((await svc.listKeys(pc(p))).map(serializeKey)));
add('POST', 'projects/:pid/keys', async (p, _q, b) => { const r = await svc.createKeyPair(pc(p), (await b()).label); return { key: serializeKey(r.key), secret_key: r.secretKey }; }, 201);
add('POST', 'projects/:pid/keys/:kid/rotate', async (p) => { const r = await svc.rotateKey(pc(p), p.kid); return { key: serializeKey(r.key), secret_key: r.secretKey }; });
add('DELETE', 'projects/:pid/keys/:kid', async (p) => { await svc.revokeKey(pc(p), p.kid); return { revoked: true }; });
add('GET', 'projects/:pid/orders', async (p, q) => list((await svc.listOrders(pc(p), { status: q.get('status') ?? undefined, merchantOrderId: q.get('merchant_order_id') ?? undefined, minAmount: num(q.get('min_amount')), maxAmount: num(q.get('max_amount')), from: date(q.get('from')), to: date(q.get('to')), limit: 200 })).map((o) => serializeOrder(o, APP))));
add('POST', 'projects/:pid/orders', async (p, _q, b) => serializeOrder((await svc.createOrder(pc(p), await b())).order, APP), 201);
add('GET', 'projects/:pid/orders/:oid', async (p) => serializeOrder(await svc.getOrder(pc(p), p.oid), APP));
add('POST', 'projects/:pid/orders/:oid/simulate', async (p, _q, b) => serializeOrder((await svc.simulate(pc(p), p.oid, String((await b()).scenario), 'dashboard')).order, APP));
add('POST', 'projects/:pid/orders/:oid/cancel', async (p) => serializeOrder(await svc.cancelOrder(pc(p), p.oid, 'dashboard'), APP));
add('GET', 'projects/:pid/transactions', async (p) => list((await svc.listTransactions(pc(p), 200)).map(serializeTxn)));
add('GET', 'projects/:pid/transactions/:tid', async (p) => { const r = await svc.getTransaction(pc(p), p.tid); return { ...serializeTxn(r.transaction), events: r.events.map(serializeEvent) }; });
add('GET', 'projects/:pid/refunds', async (p) => list((await svc.listRefunds(pc(p), 200)).map(serializeRefund)));
add('POST', 'projects/:pid/refunds', async (p, _q, b) => serializeRefund((await svc.createRefund(pc(p), await b(), 'dashboard')).refund), 201);
add('GET', 'projects/:pid/webhooks', async (p) => list((await svc.listWebhooks(pc(p))).map(serializeWebhook)));
add('POST', 'projects/:pid/webhooks', async (p, _q, b) => { const r = await svc.createWebhook(pc(p), await b()); return { ...serializeWebhook(r.webhook), secret: r.secret }; }, 201);
add('DELETE', 'projects/:pid/webhooks/:wid', async (p) => { await svc.deleteWebhook(pc(p), p.wid); return { deleted: true }; });
add('GET', 'projects/:pid/deliveries', async (p) => list((await svc.listDeliveries(pc(p))).map(serializeDelivery)));
add('POST', 'projects/:pid/deliveries/:did/retry', async (p) => serializeDelivery(await svc.retryDelivery(pc(p), p.did)));
add('GET', 'projects/:pid/logs', async (p) => list(await svc.listApiLogs(pc(p), 100)));

const view = (o: any, project: any, redirect: string | null) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
  order: { id: o.id, amount: o.amount, currency: o.currency, description: o.description, merchant_order_id: o.merchantOrderId, status: o.status, failure_code: o.failureCode, expires_at: new Date(o.expiresAt).toISOString() },
  project_name: project.name, scenarios: SCENARIO_LIST.map(({ id, label, description }) => ({ id, label, description })),
  redirect_url: ['SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'REVERSED', 'REFUNDED'].includes(o.status) ? redirect : null,
});

const read = (req: IncomingMessage) => new Promise<string>((res) => { let s = ''; req.on('data', (d) => (s += d)); req.on('end', () => res(s)); });
const send = (res: ServerResponse, status: number, body: unknown, type = 'application/json') => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); res.end(type === 'application/json' ? JSON.stringify(body) : (body as string)); };
const mime: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' };

async function main() {
if (process.env.SEED === '0') { clock.live = true; await svc.ensureUser(UID, 'maya.rao@example.com'); } else await seed(svc);
createServer(async (req, res) => {
  const url = new URL(req.url!, APP);
  try {
    if (url.pathname.startsWith('/api/checkout/')) {
      const orderId = url.pathname.split('/')[3];
      if (req.method === 'GET') {
        const r = await svc.resolveCheckout(orderId, url.searchParams.get('t') ?? '');
        return send(res, 200, view(r.order, r.project, svc.redirectUrlFor(r.order, r.project)));
      }
      const b = JSON.parse((await read(req)) || '{}');
      const r = await svc.resolveCheckout(orderId, b.t ?? '');
      if (b.action === 'simulate') await svc.simulate(r.ctx, r.order.id, String(b.scenario), 'checkout');
      else if (b.action === 'cancel') await svc.cancelOrder(r.ctx, r.order.id, 'checkout');
      else throw badRequest('Unknown action.');
      const r2 = await svc.resolveCheckout(orderId, b.t);
      return send(res, 200, view(r2.order, r2.project, svc.redirectUrlFor(r2.order, r2.project)));
    }
    if (url.pathname.startsWith('/api/dashboard/')) {
      const segs = url.pathname.replace('/api/dashboard/', '').split('/');
      for (const [m, pat, h, status] of routes) {
        if (m !== req.method || pat.length !== segs.length) continue;
        const params: Record<string, string> = {};
        if (!pat.every((s, i) => (s.startsWith(':') ? ((params[s.slice(1)] = decodeURIComponent(segs[i])), true) : s === segs[i]))) continue;
        const raw = await read(req);
        return send(res, status ?? 200, await h(params, url.searchParams, async () => JSON.parse(raw || '{}')));
      }
      return send(res, 404, { error: { code: 'not_found', message: 'Unknown endpoint.' } });
    }
    const file = url.pathname === '/bundle.js' || url.pathname === '/style.css' ? url.pathname : '/index.html'; // SPA fallback
    const p = join(here, 'dist', file);
    if (!existsSync(p)) return send(res, 500, 'run build.mjs first', 'text/plain');
    res.writeHead(200, { 'content-type': mime[file.slice(file.lastIndexOf('.'))] ?? 'text/plain' }); res.end(readFileSync(p));
  } catch (e) { const r = toErrorResponse(e); send(res, r.status, r.body); }
}).listen(PORT, '127.0.0.1', () => console.log(`preview on ${APP}`));
}
void main();
