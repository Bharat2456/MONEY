import 'server-only';
import { ApiError, badRequest, forbidden, tooMany, unauthorized, toErrorResponse } from '@/lib/core/errors';
import { extractBearer } from '@/lib/core/keys';
import { adminAuth, limiter, service } from './runtime';

export const MAX_BODY_BYTES = 64 * 1024;

export async function readJson(req: Request): Promise<unknown> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > MAX_BODY_BYTES) throw new ApiError(413, 'payload_too_large', 'Request body is too large (64 KB max).');
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) throw new ApiError(413, 'payload_too_large', 'Request body is too large (64 KB max).');
  if (!raw.trim()) return {};
  try { return JSON.parse(raw); } catch { throw badRequest('Request body is not valid JSON.', undefined, 'invalid_json'); }
}

export const clientIp = (req: Request) => (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';

export function rateLimit(key: string, limit: number, windowMs = 60_000) {
  const r = limiter().check(key, limit, windowMs);
  if (!r.allowed) throw tooMany(r.retryAfterSec);
}

export interface Session { uid: string; email: string; admin: boolean; emailVerified: boolean }

/** Verifies the Firebase ID token on the server. The uid comes from the verified token — never from the request body or URL. */
export async function requireSession(req: Request, opts: { allowUnverified?: boolean } = {}): Promise<Session> {
  const token = extractBearer(req.headers.get('authorization'));
  if (!token) throw unauthorized();
  let decoded;
  try { decoded = await adminAuth().verifyIdToken(token); } catch (e) { if (e instanceof ApiError) throw e; throw unauthorized('Session expired. Please sign in again.', 'invalid_token'); }
  if (!opts.allowUnverified && !decoded.email_verified) throw forbidden('Please verify your email address to continue.', 'email_not_verified');
  const svc = service();
  await svc.ensureUser(decoded.uid, decoded.email ?? '');
  await svc.assertUserActive(decoded.uid);
  rateLimit(`user:${decoded.uid}`, 240);
  return { uid: decoded.uid, email: decoded.email ?? '', admin: decoded.admin === true, emailVerified: !!decoded.email_verified };
}

export async function requireAdmin(req: Request): Promise<Session> {
  const s = await requireSession(req);
  if (!s.admin) throw forbidden('Administrator access required.', 'admin_required'); // role comes from a server-set custom claim
  return s;
}

type Params = Record<string, string>;
export interface RouteCtx { req: Request; params: Params; query: URLSearchParams; body: () => Promise<unknown> }
type Handler = (c: RouteCtx) => Promise<unknown>;
interface RouteDef { method: string; segs: string[]; handler: Handler; status?: number }

export class Router {
  private routes: RouteDef[] = [];
  add(method: string, pattern: string, handler: Handler, status?: number) { this.routes.push({ method, segs: pattern.split('/'), handler, status }); return this; }

  async dispatch(req: Request, path: string[]): Promise<Response> {
    try {
      const url = new URL(req.url);
      for (const r of this.routes) {
        if (r.method !== req.method || r.segs.length !== path.length) continue;
        const params: Params = {};
        if (!r.segs.every((s, i) => (s.startsWith(':') ? ((params[s.slice(1)] = decodeURIComponent(path[i])), true) : s === path[i]))) continue;
        let cached: Promise<unknown> | null = null;
        const out = await r.handler({ req, params, query: url.searchParams, body: () => (cached ??= readJson(req)) });
        if (out instanceof Response) return out;
        return Response.json(out ?? { ok: true }, { status: r.status ?? 200, headers: { 'Cache-Control': 'no-store' } });
      }
      return Response.json({ error: { code: 'not_found', message: 'Unknown endpoint.' } }, { status: 404 });
    } catch (err) {
      const { status, body } = toErrorResponse(err);
      const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
      if (status === 429 && err instanceof ApiError && err.details?.retry_after_seconds) headers['Retry-After'] = String(err.details.retry_after_seconds);
      if (status >= 500) console.error('[money] unhandled error', err instanceof Error ? err.name : typeof err);
      return Response.json(body, { status, headers });
    }
  }
}

export const segmentsOf = async (ctx: { params: Promise<{ path: string[] }> }) => (await ctx.params).path;
