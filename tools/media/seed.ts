import { randomBytes } from 'node:crypto';
import { MemoryStore } from '@/lib/core/memory-store';
import type { Transport } from '@/lib/core/http';
import { MoneyService } from '@/services/money';

export const UID = 'preview_user';
const H = 3_600_000, D = 24 * H;

export const clock = { live: false, t: 0 };

/** Demo webhook receiver: one delivery fails the first time (so the Retry button has something to show). */
const attempts = new Map<string, number>();
const transport: Transport = async ({ body, headers }) => {
  const id = headers['money-delivery-id'];
  const n = (attempts.get(id) ?? 0) + 1; attempts.set(id, n);
  const ev = JSON.parse(body);
  if (ev.data?.object?.merchant_order_id === 'CM-1007' && ev.type === 'payment.failed' && n === 1) return { status: 502, body: 'Bad Gateway: upstream timed out' };
  return { status: 200, body: 'ok' };
};

export function makeService() {
  const store = new MemoryStore();
  const svc = new MoneyService({
    store, appUrl: process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173', encryptionKey: randomBytes(32).toString('base64'), keyPepper: 'preview',
    transport, resolveDns: async () => ['93.184.216.34'], now: () => (clock.live ? Date.now() : clock.t),
  });
  return { svc, store };
}

/** Demo data created through the REAL service (state machine, events, webhooks, refunds all genuine). */
export async function seed(svc: MoneyService) {
  clock.live = false; clock.t = Date.now() - 6 * D;
  await svc.ensureUser(UID, 'maya.rao@example.com');

  const hack = await svc.createProject(UID, { name: 'Hackathon Demo', description: 'Weekend build — checkout for the demo day.', website_url: 'https://hack-demo.example.com', category: 'hackathon' });
  clock.t += H;
  const shop = await svc.createProject(UID, { name: 'Campus Merch Store', description: 'Hoodies and stickers for the college fest.', website_url: 'https://campus-merch.example.com', category: 'ecommerce', allowed_return_origins: ['https://staging.campus-merch.example.com'] });
  const ctx = { uid: UID, projectId: shop.project.id };
  await svc.createWebhook(ctx, { url: 'https://hooks.campus-merch.example.com/money', description: 'Order fulfilment', events: ['*'] });
  void hack;

  const ret = 'https://campus-merch.example.com/payment-result';
  const plan: Array<[string, number, string, string | null]> = [
    ['CM-1001', 129900, 'Fest hoodie (black)', 'success'], ['CM-1002', 49900, 'Sticker pack x10', 'success'], ['CM-1003', 89900, 'Tote bag + cap', 'success'],
    ['CM-1004', 249900, 'Team jersey bundle', 'success'], ['CM-1005', 49900, 'Sticker pack x10', 'cancelled'], ['CM-1006', 159900, 'Fest hoodie (grey)', 'success'],
    ['CM-1007', 74900, 'Water bottle', 'failure'], ['CM-1008', 99900, 'Fest hoodie (kids)', 'reversed'], ['CM-1009', 29900, 'Keychain', 'success'], ['CM-1010', 119900, 'Varsity jacket deposit', 'success'],
  ];
  const ids: Record<string, string> = {};
  for (const [mid, amount, description, scenario] of plan) {
    clock.t += 7 * H + Math.floor(Math.random() * 3 * H);
    const { order } = await svc.createOrder(ctx, { amount, currency: 'INR', description, merchant_order_id: mid, return_url: ret, expires_in_minutes: 1440 });
    ids[mid] = order.id;
    clock.t += 90_000;
    if (scenario) await svc.simulate(ctx, order.id, scenario, 'checkout');
    await svc.logApi(ctx, { method: 'POST', path: '/api/v1/payment-orders', status: 201, durationMs: 180 + Math.floor(Math.random() * 90) });
    if (scenario) await svc.logApi(ctx, { method: 'POST', path: `/api/v1/payment-orders/${order.id}/simulate`, status: 200, durationMs: 210 + Math.floor(Math.random() * 90) });
  }
  // refunds: one partial, one full
  await svc.createRefund(ctx, { payment_order_id: ids['CM-1004'], amount: 50000, reason: 'Two jerseys returned' }, 'dashboard');
  await svc.createRefund(ctx, { payment_order_id: ids['CM-1009'], reason: 'Item out of stock' }, 'dashboard');
  await svc.logApi(ctx, { method: 'POST', path: '/api/v1/refunds', status: 201, durationMs: 260 });
  await svc.logApi(ctx, { method: 'POST', path: '/api/v1/payment-orders', status: 400, durationMs: 41 });
  await svc.logApi(ctx, { method: 'GET', path: '/api/v1/payment-orders', status: 200, durationMs: 95 });

  // open items created "just now" so they remain open
  clock.t = Date.now() - 12 * 60_000;
  const p = await svc.createOrder(ctx, { amount: 59900, currency: 'INR', description: 'Fest hoodie (white)', merchant_order_id: 'CM-1011', return_url: ret, expires_in_minutes: 1440 });
  await svc.simulate(ctx, p.order.id, 'pending_until_expiry', 'checkout');
  clock.t = Date.now() - 4 * 60_000;
  await svc.createOrder(ctx, { amount: 50000, currency: 'INR', description: 'Fest hoodie (navy)', merchant_order_id: 'CM-1012', return_url: ret, expires_in_minutes: 1440 });
  clock.live = true;
  return { ctx, secret: shop.secretKey, publishable: shop.key.publishableKey };
}
