import { badRequest } from '@/lib/core/errors';
import { SCENARIO_LIST } from '@/lib/core/simulation';
import { clientIp, rateLimit, readJson } from '@/lib/server/http';
import { service } from '@/lib/server/runtime';
import { toErrorResponse } from '@/lib/core/errors';
import type { OrderDoc, ProjectDoc } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Customer-facing view: deliberately minimal — no keys, no project internals. */
const view = (o: OrderDoc, p: ProjectDoc, redirect: string | null) => ({
  order: { id: o.id, amount: o.amount, currency: o.currency, description: o.description, merchant_order_id: o.merchantOrderId, status: o.status, failure_code: o.failureCode, expires_at: new Date(o.expiresAt).toISOString(), simulated_reference: undefined },
  project_name: p.name,
  scenarios: SCENARIO_LIST.map(({ id, label, description }) => ({ id, label, description })),
  redirect_url: ['SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'REVERSED', 'REFUNDED'].includes(o.status) ? redirect : null,
});

export async function GET(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    rateLimit(`co:${clientIp(req)}:${orderId}`, 120);
    const { order, project } = await service().resolveCheckout(orderId, new URL(req.url).searchParams.get('t') ?? '');
    return Response.json(view(order, project, service().redirectUrlFor(order, project)), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { const r = toErrorResponse(e); return Response.json(r.body, { status: r.status }); }
}

export async function POST(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    rateLimit(`co-w:${clientIp(req)}:${orderId}`, 20);
    const b = (await readJson(req)) as { t?: unknown; action?: unknown; scenario?: unknown };
    const { ctx, order: before } = await service().resolveCheckout(orderId, typeof b.t === 'string' ? b.t : '');
    if (b.action === 'simulate') {
      if (typeof b.scenario !== 'string') throw badRequest('scenario is required.');
      await service().simulate(ctx, before.id, b.scenario, 'checkout');
    } else if (b.action === 'cancel') await service().cancelOrder(ctx, before.id, 'checkout');
    else throw badRequest('Unknown action.');
    const { order, project } = await service().resolveCheckout(orderId, b.t as string);
    return Response.json(view(order, project, service().redirectUrlFor(order, project)), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { const r = toErrorResponse(e); return Response.json(r.body, { status: r.status }); }
}
