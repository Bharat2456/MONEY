import { randomBytes } from 'node:crypto';
import { MemoryStore } from '@/lib/core/memory-store';
import type { Transport, TransportRequest } from '@/lib/core/http';
import { MoneyService } from '@/services/money';

export const ENC_KEY = randomBytes(32).toString('base64');

export interface Harness {
  svc: MoneyService; store: MemoryStore; clock: { t: number }; sent: TransportRequest[];
  respond: { status: number; body: string }; advance: (ms: number) => void;
}

export function makeHarness(): Harness {
  const store = new MemoryStore();
  const clock = { t: 1_800_000_000_000 };
  const sent: TransportRequest[] = [];
  const respond = { status: 200, body: 'ok' };
  const transport: Transport = async (req) => { sent.push(req); return { ...respond }; };
  const publicDns = async (host: string) => (host === 'evil.example.com' ? ['10.0.0.5'] : ['93.184.216.34']);
  const svc = new MoneyService({ store, appUrl: 'https://money.test', encryptionKey: ENC_KEY, keyPepper: 'test-pepper', transport, resolveDns: publicDns, now: () => clock.t });
  return { svc, store, clock, sent, respond, advance: (ms) => { clock.t += ms; } };
}

export async function setupProject(h: Harness, uid = 'user_a') {
  await h.svc.ensureUser(uid, `${uid}@example.com`);
  const created = await h.svc.createProject(uid, { name: 'Demo Shop', website_url: 'https://shop.example.com', category: 'ecommerce' });
  return { ctx: { uid, projectId: created.project.id }, secretKey: created.secretKey, publishableKey: created.key.publishableKey, project: created.project };
}

export const orderBody = (over: Record<string, unknown> = {}) => ({
  amount: 50000, currency: 'INR', description: 'Demo product purchase', merchant_order_id: 'ORDER-10001', return_url: 'https://shop.example.com/result', ...over,
});

