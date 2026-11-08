import { notFound } from '@/lib/core/errors';
import { Router, requireAdmin, segmentsOf } from '@/lib/server/http';
import { adminAuth, service } from '@/lib/server/runtime';
import { serializeProject } from '@/services/serializers';
import type { DeliveryDoc, ProjectDoc, UserDoc } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const iso = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString() : null);

/**
 * Admin API. Role = Firebase custom claim `admin: true`, set only by scripts/grant-admin.mjs with the service account.
 * Responses never contain API secret keys (only hashes exist) or webhook signing secrets.
 */
const router = new Router()
  .add('GET', 'overview', async (c) => {
    await requireAdmin(c.req);
    const store = service().store;
    const [projects, users, support, failed] = await Promise.all([
      store.queryGroup<ProjectDoc>('projects', { limit: 500 }),
      store.query<UserDoc>('users', { limit: 500 }),
      store.query<{ status: string }>('supportRequests', { limit: 200 }),
      store.queryGroup<DeliveryDoc>('deliveries', { where: [['status', '==', 'failed']], limit: 50 }),
    ]);
    return { users: users.length, suspended: users.filter((u) => u.suspended).length, deletion_requests: users.filter((u) => u.deletionRequestedAt).length, projects: projects.length, open_support: support.filter((s) => s.status === 'open').length, failed_deliveries: failed.length, health: { database: 'ok', auth: 'ok' } };
  })
  .add('GET', 'users', async (c) => {
    await requireAdmin(c.req);
    const docs = await service().store.query<UserDoc>('users', { orderBy: ['createdAt', 'desc'], limit: 200 });
    return { data: docs.map((u) => ({ id: u.id, email: u.email, created_at: iso(u.createdAt), suspended: u.suspended, suspended_reason: u.suspendedReason ?? null, deletion_requested_at: iso(u.deletionRequestedAt) })) };
  })
  .add('POST', 'users/:uid/suspend', async (c) => {
    const a = await requireAdmin(c.req);
    const b = (await c.body()) as { reason?: string };
    const u = await service().store.get<UserDoc>(`users/${c.params.uid}`); if (!u) throw notFound('User');
    await service().store.update(`users/${c.params.uid}`, { suspended: true, suspendedReason: String(b.reason ?? '').slice(0, 200) });
    await service().audit(a.uid, 'admin.user_suspended', `users/${c.params.uid}`, { reason: b.reason ?? null });
    return { suspended: true };
  })
  .add('POST', 'users/:uid/unsuspend', async (c) => {
    const a = await requireAdmin(c.req);
    const u = await service().store.get<UserDoc>(`users/${c.params.uid}`); if (!u) throw notFound('User');
    await service().store.update(`users/${c.params.uid}`, { suspended: false, suspendedReason: null });
    await service().audit(a.uid, 'admin.user_unsuspended', `users/${c.params.uid}`);
    return { suspended: false };
  })
  .add('POST', 'users/:uid/process-deletion', async (c) => {
    const a = await requireAdmin(c.req);
    const svc = service();
    const u = await svc.store.get<UserDoc>(`users/${c.params.uid}`); if (!u) throw notFound('User');
    if (!u.deletionRequestedAt) return new Response(JSON.stringify({ error: { code: 'no_deletion_request', message: 'The user has not requested deletion.' } }), { status: 409 });
    for (const p of await svc.listProjects(u.id)) await svc.deleteProject(u.id, p.id, p.name);
    await svc.store.deleteTree(`users/${u.id}`);
    await adminAuth().deleteUser(u.id).catch(() => undefined);
    await svc.audit(a.uid, 'admin.account_deleted', `users/${u.id}`);
    return { deleted: true };
  })
  .add('GET', 'projects', async (c) => {
    await requireAdmin(c.req);
    const rows = await service().store.queryGroup<ProjectDoc>('projects', { orderBy: ['createdAt', 'desc'], limit: 200 });
    return { data: rows.map((p) => ({ ...serializeProject(p), owner_uid: p.uid })) };
  })
  .add('GET', 'audit', async (c) => {
    await requireAdmin(c.req);
    const rows = await service().store.query<{ id: string; at: number; actorUid: string; action: string; target: string }>('auditLogs', { orderBy: ['at', 'desc'], limit: 200 });
    return { data: rows.map((r) => ({ id: r.id, at: iso(r.at), actor_uid: r.actorUid, action: r.action, target: r.target })) };
  })
  .add('GET', 'support', async (c) => {
    await requireAdmin(c.req);
    return { data: await service().store.query('supportRequests', { orderBy: ['createdAt', 'desc'], limit: 200 }) };
  })
  .add('POST', 'support/:id/resolve', async (c) => {
    const a = await requireAdmin(c.req);
    await service().store.update(`supportRequests/${c.params.id}`, { status: 'resolved', resolvedAt: Date.now() });
    await service().audit(a.uid, 'admin.support_resolved', `supportRequests/${c.params.id}`);
    return { resolved: true };
  })
  .add('GET', 'deliveries/failed', async (c) => {
    await requireAdmin(c.req);
    const rows = await service().store.queryGroup<DeliveryDoc>('deliveries', { where: [['status', '==', 'failed']], limit: 100 });
    return { data: rows.map((d) => ({ id: d.id, project_id: d.projectId, url: d.url, event_type: d.eventType, attempts: d.attempts, response_status: d.responseStatus, error: d.error, last_attempt_at: iso(d.lastAttemptAt) })) }; // payload bodies are not exposed
  });

async function handle(req: Request, ctx: { params: Promise<{ path: string[] }> }) { return router.dispatch(req, await segmentsOf(ctx)); }
export const GET = handle, POST = handle;
