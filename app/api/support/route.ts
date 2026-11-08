import { badRequest, toErrorResponse } from '@/lib/core/errors';
import { newId } from '@/lib/core/ids';
import { text, isRecord } from '@/lib/core/validation';
import { clientIp, rateLimit, readJson } from '@/lib/server/http';
import { service } from '@/lib/server/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Contact / support / abuse-report intake. Stored for administrators to review. */
export async function POST(req: Request) {
  try {
    rateLimit(`support:${clientIp(req)}`, 5, 10 * 60_000);
    const b = await readJson(req);
    if (!isRecord(b)) throw badRequest('Invalid request.');
    const kind = b.type === 'abuse' ? 'abuse' : 'support';
    const name = text(b.name, 'name', { min: 1, max: 80 });
    const email = text(b.email, 'email', { min: 5, max: 120 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Enter a valid email address.', { field: 'email' });
    const message = text(b.message, 'message', { min: 10, max: 2000 });
    const id = newId('sup');
    await service().store.set(`supportRequests/${id}`, { id, kind, name, email, message, status: 'open', createdAt: Date.now() });
    return Response.json({ received: true, id }, { status: 201 });
  } catch (e) { const r = toErrorResponse(e); return Response.json(r.body, { status: r.status }); }
}
