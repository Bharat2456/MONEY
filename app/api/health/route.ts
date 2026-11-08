import { assertConfigured } from '@/lib/server/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public liveness + configuration probe. Reports only whether configuration is present — never any values. */
export async function GET() {
  try { assertConfigured(); return Response.json({ status: 'ok', configured: true, mode: 'test', simulated: true }); }
  catch (e) { return Response.json({ status: 'setup_required', configured: false, message: (e as Error).message }, { status: 503 }); }
}
