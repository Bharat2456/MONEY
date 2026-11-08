import test from 'node:test';
import assert from 'node:assert/strict';
import { verifySignature } from '@/lib/core/signing';
import { ApiError } from '@/lib/core/errors';
import { makeHarness, orderBody, setupProject } from './helpers';
import type { EventDoc } from '@/types';

async function withHook(h: ReturnType<typeof makeHarness>, ctx: { uid: string; projectId: string }) {
  const { secret, webhook } = await h.svc.createWebhook(ctx, { url: 'https://hooks.example.com/money', events: ['*'] });
  return { secret, webhook };
}
const sentTypes = (h: ReturnType<typeof makeHarness>) => h.sent.map((r) => JSON.parse(r.body).type as string);
const financialEvents = async (h: ReturnType<typeof makeHarness>, ctx: { uid: string; projectId: string }, txnId: string) =>
  ((await h.svc.getTransaction(ctx, txnId)).events as EventDoc[]).filter((e) => e.type === 'status.changed');

test('API key authentication: valid, revoked, garbage, publishable-as-secret, rotation', async () => {
  const h = makeHarness(); const { ctx, secretKey, publishableKey } = await setupProject(h);
  const auth = await h.svc.authenticateSecretKey(secretKey);
  assert.deepEqual({ uid: auth.uid, projectId: auth.projectId }, ctx);
  await assert.rejects(h.svc.authenticateSecretKey('money_test_sk_' + 'x'.repeat(40)), { code: 'invalid_api_key' });
  await assert.rejects(h.svc.authenticateSecretKey(publishableKey), { code: 'invalid_api_key' });
  await assert.rejects(h.svc.authenticateSecretKey('garbage'), { code: 'invalid_api_key' });
  const rotated = await h.svc.rotateKey(ctx, auth.keyId);
  await assert.rejects(h.svc.authenticateSecretKey(secretKey), { code: 'invalid_api_key' }, 'old key dead after rotation');
  assert.equal((await h.svc.authenticateSecretKey(rotated.secretKey)).projectId, ctx.projectId);
  // plaintext secrets must not be anywhere in the store
  for (const p of h.store.paths()) assert.ok(!JSON.stringify(await h.store.get(p)).includes(rotated.secretKey), p);
});

test('suspended accounts cannot use API keys', async () => {
  const h = makeHarness(); const { ctx, secretKey } = await setupProject(h);
  await h.store.update(`users/${ctx.uid}`, { suspended: true });
  await assert.rejects(h.svc.authenticateSecretKey(secretKey), { code: 'account_suspended' });
});

test('Scenario A: create → checkout → success → webhook → merchant verifies → dashboard shows success', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h);
  const { secret } = await withHook(h, ctx);
  const { order } = await h.svc.createOrder(ctx, orderBody());
  assert.equal(order.status, 'CREATED');
  assert.equal(order.amount, 50000);

  const co = await h.svc.resolveCheckout(order.id, order.checkoutToken);
  assert.equal(co.project.name, 'Demo Shop');
  const done = await h.svc.simulate(ctx, order.id, 'success', 'checkout');
  assert.equal(done.order.status, 'SUCCESS');

  assert.deepEqual(sentTypes(h), ['payment.created', 'payment.succeeded']);
  for (const req of h.sent) {
    assert.ok(verifySignature(req.headers['money-signature'], req.body, secret, { nowSec: Math.floor(h.clock.t / 1000) }), 'merchant can verify signature');
    assert.ok(!req.body.includes('money_test_sk_') && !req.body.includes(secret), 'no secrets in payload');
  }
  const redirect = h.svc.redirectUrlFor(done.order, co.project)!;
  assert.match(redirect, /^https:\/\/shop\.example\.com\/result\?/);
  assert.equal((await h.svc.getOrder(ctx, order.id)).status, 'SUCCESS');   // server-to-server truth
  const stats = await h.svc.stats(ctx.uid);
  assert.equal(stats.total_orders, 1); assert.equal(stats.successful, 1); assert.equal(stats.volume, 50000); assert.equal(stats.success_rate, 100);
  const deliveries = await h.svc.listDeliveries(ctx);
  assert.equal(deliveries.length, 2); assert.ok(deliveries.every((d) => d.status === 'delivered' && d.responseStatus === 200));
});

test('Scenario B: failure → webhook → dashboard shows failure', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h); await withHook(h, ctx);
  const { order } = await h.svc.createOrder(ctx, orderBody());
  const r = await h.svc.simulate(ctx, order.id, 'failure', 'checkout');
  assert.equal(r.order.status, 'FAILED'); assert.equal(r.order.failureCode, 'SIMULATED_DECLINE');
  assert.ok(sentTypes(h).includes('payment.failed'));
  const stats = await h.svc.stats(ctx.uid);
  assert.equal(stats.failed, 1); assert.equal(stats.successful, 0); assert.equal(stats.success_rate, 0);
});

test('Scenario C: pending → delayed success (backend-owned timer) → webhook → dashboard updates', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h); await withHook(h, ctx);
  const { order } = await h.svc.createOrder(ctx, orderBody());
  const r = await h.svc.simulate(ctx, order.id, 'pending_30s', 'checkout');
  assert.equal(r.order.status, 'PENDING');
  h.advance(10_000);
  assert.equal((await h.svc.getOrder(ctx, order.id)).status, 'PENDING', 'not yet due');
  assert.ok(!sentTypes(h).includes('payment.succeeded'));
  h.advance(21_000);
  assert.equal((await h.svc.getOrder(ctx, order.id)).status, 'SUCCESS', 'resolved by backend on read');
  assert.equal(sentTypes(h).filter((t) => t === 'payment.succeeded').length, 1);
  await h.svc.getOrder(ctx, order.id); await h.svc.listOrders(ctx);
  assert.equal(sentTypes(h).filter((t) => t === 'payment.succeeded').length, 1, 'repeated reads emit nothing new');
  assert.equal((await h.svc.stats(ctx.uid)).successful, 1);
});

test('delayed success after 5s and timeout scenarios', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h);
  const a = (await h.svc.createOrder(ctx, orderBody({ merchant_order_id: 'A' }))).order;
  const b = (await h.svc.createOrder(ctx, orderBody({ merchant_order_id: 'B' }))).order;
  assert.equal((await h.svc.simulate(ctx, a.id, 'success_after_5s', 'api')).order.status, 'PROCESSING');
  assert.equal((await h.svc.simulate(ctx, b.id, 'timeout', 'api')).order.status, 'PROCESSING');
  h.advance(6000);
  assert.equal((await h.svc.getOrder(ctx, a.id)).status, 'SUCCESS');
  assert.equal((await h.svc.getOrder(ctx, b.id)).status, 'PROCESSING');
  h.advance(5000);
  const tb = await h.svc.getOrder(ctx, b.id);
  assert.equal(tb.status, 'FAILED'); assert.equal(tb.failureCode, 'SIMULATED_TIMEOUT');
});

test('cancelled, expired, reversed, pending-until-expiry scenarios', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h);
  const mk = async (id: string) => (await h.svc.createOrder(ctx, orderBody({ merchant_order_id: id }))).order;
  assert.equal((await h.svc.simulate(ctx, (await mk('c')).id, 'cancelled', 'checkout')).order.status, 'CANCELLED');
  assert.equal((await h.svc.simulate(ctx, (await mk('e')).id, 'expired', 'checkout')).order.status, 'EXPIRED');
  assert.equal((await h.svc.simulate(ctx, (await mk('r')).id, 'reversed', 'checkout')).order.status, 'REVERSED');
  const p = await mk('p'); await h.svc.simulate(ctx, p.id, 'pending_until_expiry', 'checkout');
  h.advance(31 * 60_000);
  assert.equal((await h.svc.getOrder(ctx, p.id)).status, 'EXPIRED');
  const cancellable = await mk('x');
  assert.equal((await h.svc.cancelOrder(ctx, cancellable.id, 'api')).status, 'CANCELLED');
  await assert.rejects(h.svc.cancelOrder(ctx, cancellable.id, 'api'), { code: 'invalid_state_transition' });
});

test('Scenario D: partial refunds then full refund; history and totals stay consistent', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h); await withHook(h, ctx);
  const { order } = await h.svc.createOrder(ctx, orderBody());
  await h.svc.simulate(ctx, order.id, 'success', 'api');
  const r1 = await h.svc.createRefund(ctx, { payment_order_id: order.id, amount: 20000, reason: 'Partial' }, 'api');
  assert.equal(r1.refund.status, 'SUCCEEDED');
  let o = await h.svc.getOrder(ctx, order.id);
  assert.equal(o.refundedAmount, 20000); assert.equal(o.status, 'SUCCESS', 'partial refund keeps SUCCESS');
  assert.ok(sentTypes(h).includes('refund.created') && sentTypes(h).includes('refund.succeeded'));
  const r2 = await h.svc.createRefund(ctx, { payment_order_id: order.id }, 'api');   // defaults to remaining balance
  assert.equal(r2.refund.amount, 30000);
  o = await h.svc.getOrder(ctx, order.id);
  assert.equal(o.status, 'REFUNDED'); assert.equal(o.refundedAmount, 50000);
  assert.equal((await h.svc.listRefunds(ctx)).length, 2);
  const ev = await h.svc.getRefundEvents(ctx, r1.refund.id);
  assert.deepEqual(ev.map((e) => e.type), ['refund.created', 'refund.succeeded']);
  assert.equal((await h.svc.stats(ctx.uid)).refunded, 50000);
});

test('refund failure simulation leaves balances unchanged', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h);
  const { order } = await h.svc.createOrder(ctx, orderBody()); await h.svc.simulate(ctx, order.id, 'success', 'api');
  const r = await h.svc.createRefund(ctx, { payment_order_id: order.id, amount: 1000, outcome: 'failure' }, 'api');
  assert.equal(r.refund.status, 'FAILED');
  const o = await h.svc.getOrder(ctx, order.id);
  assert.equal(o.refundedAmount, 0); assert.equal(o.status, 'SUCCESS');
});

test('Scenario E: another user cannot access or modify a project, its orders, keys or webhooks', async () => {
  const h = makeHarness(); const a = await setupProject(h, 'user_a'); const b = await setupProject(h, 'user_b');
  const { order } = await h.svc.createOrder(a.ctx, orderBody());
  const hijack = { uid: 'user_b', projectId: a.ctx.projectId };   // B pretends to own A's project id
  await assert.rejects(h.svc.getProject('user_b', a.ctx.projectId), { code: 'not_found' });
  await assert.rejects(h.svc.getOrder(hijack, order.id), { code: 'not_found' });
  await assert.rejects(h.svc.simulate(hijack, order.id, 'success', 'api'), { code: 'not_found' });
  await assert.rejects(h.svc.createRefund(hijack, { payment_order_id: order.id }, 'api'), { code: 'not_found' });
  await assert.rejects(h.svc.createKeyPair(hijack), { code: 'not_found' });
  await assert.rejects(h.svc.updateProject('user_b', a.ctx.projectId, { name: 'pwned' }), { code: 'not_found' });
  await assert.rejects(h.svc.deleteProject('user_b', a.ctx.projectId, 'Demo Shop'), { code: 'not_found' });
  assert.deepEqual(await h.svc.listProjects('user_b').then((l) => l.map((p) => p.id)), [b.ctx.projectId]);
  // project B's secret key is bound to project B only
  const authB = await h.svc.authenticateSecretKey(b.secretKey);
  await assert.rejects(h.svc.getOrder({ uid: authB.uid, projectId: authB.projectId }, order.id), { code: 'not_found' });
  assert.equal((await h.svc.getOrder(a.ctx, order.id)).status, 'CREATED', 'untouched');
});

test('checkout requires the correct token', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h);
  const { order } = await h.svc.createOrder(ctx, orderBody());
  await assert.rejects(h.svc.resolveCheckout(order.id, 'wrong'), { code: 'not_found' });
  await assert.rejects(h.svc.resolveCheckout(order.id, ''), { code: 'not_found' });
  await assert.rejects(h.svc.resolveCheckout('ord_nope', order.checkoutToken), { code: 'not_found' });
});

test('Scenario F: duplicate requests produce no duplicate financial events', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h); await withHook(h, ctx);
  // idempotent order creation
  const k = 'idem-key-1';
  const [o1, o2] = await Promise.all([h.svc.createOrder(ctx, orderBody(), k), h.svc.createOrder(ctx, orderBody(), k)]);
  assert.equal(o1.order.id, o2.order.id);
  assert.equal((await h.svc.listOrders(ctx)).length, 1);
  await assert.rejects(h.svc.createOrder(ctx, orderBody({ amount: 99999 }), k), { code: 'idempotency_key_reuse' });
  // concurrent simulate: exactly one wins
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => h.svc.simulate(ctx, o1.order.id, 'success', 'checkout')));
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  for (const r of results) if (r.status === 'rejected') assert.ok(r.reason instanceof ApiError && r.reason.status === 409);
  const events = await financialEvents(h, ctx, o1.order.transactionId);
  assert.deepEqual(events.map((e) => e.to), ['PROCESSING', 'SUCCESS']);
  assert.equal(sentTypes(h).filter((t) => t === 'payment.succeeded').length, 1);
  // sequential duplicate after completion is rejected and only recorded as a non-financial event
  await assert.rejects(h.svc.simulate(ctx, o1.order.id, 'failure', 'checkout'), { code: 'payment_already_processed' });
  assert.equal((await h.svc.getOrder(ctx, o1.order.id)).status, 'SUCCESS');
  assert.equal((await financialEvents(h, ctx, o1.order.transactionId)).length, 2);
  // idempotent simulate replay
  const o3 = (await h.svc.createOrder(ctx, orderBody({ merchant_order_id: 'Z' }))).order;
  await h.svc.simulate(ctx, o3.id, 'success', 'api', 'sim-1');
  const replay = await h.svc.simulate(ctx, o3.id, 'success', 'api', 'sim-1');
  assert.ok(replay.replayed);
  assert.equal((await financialEvents(h, ctx, o3.transactionId)).length, 2);
});

test('duplicate-attempt scenario records a rejected attempt without a second success', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h);
  const { order } = await h.svc.createOrder(ctx, orderBody());
  const r = await h.svc.simulate(ctx, order.id, 'duplicate', 'checkout');
  assert.equal(r.order.status, 'SUCCESS');
  const { events } = await h.svc.getTransaction(ctx, order.transactionId);
  assert.equal(events.filter((e) => e.type === 'attempt.rejected').length, 1);
  assert.equal(events.filter((e) => e.to === 'SUCCESS').length, 1);
  assert.deepEqual(events.map((e) => e.seq), events.map((_, i) => i + 1), 'event sequence is gapless');
});

test('concurrent refunds cannot exceed the refundable amount', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h);
  const { order } = await h.svc.createOrder(ctx, orderBody()); await h.svc.simulate(ctx, order.id, 'success', 'api');
  const res = await Promise.allSettled(Array.from({ length: 4 }, () => h.svc.createRefund(ctx, { payment_order_id: order.id, amount: 20000 }, 'api')));
  assert.equal(res.filter((r) => r.status === 'fulfilled').length, 2, '2 × 20000 fit in 50000; the rest are rejected');
  assert.equal((await h.svc.getOrder(ctx, order.id)).refundedAmount, 40000);
});

test('Scenario G: unsafe webhook destinations are rejected', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h);
  for (const url of ['http://hooks.example.com/x', 'https://localhost/x', 'https://127.0.0.1/x', 'https://169.254.169.254/latest', 'https://[::1]/x', 'https://evil.example.com/x']) {
    await assert.rejects(h.svc.createWebhook(ctx, { url }), ApiError, url);
  }
  assert.equal((await h.svc.listWebhooks(ctx)).length, 0);
});

test('webhook whose DNS later resolves to a private address is blocked at delivery time', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h);
  await withHook(h, ctx);
  const store = h.store; const hook = (await h.svc.listWebhooks(ctx))[0];
  await store.update(`users/${ctx.uid}/projects/${ctx.projectId}/webhooks/${hook.id}`, { url: 'https://evil.example.com/hook' });
  await h.svc.createOrder(ctx, orderBody());
  assert.equal(h.sent.length, 0, 'nothing sent to the internal destination');
  const d = (await h.svc.listDeliveries(ctx))[0];
  assert.equal(d.status, 'failed'); assert.match(d.error ?? '', /non-public/);
});

test('Scenario H: refund greater than refundable amount is rejected; ineligible states too', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h);
  const { order } = await h.svc.createOrder(ctx, orderBody());
  await assert.rejects(h.svc.createRefund(ctx, { payment_order_id: order.id, amount: 100 }, 'api'), { code: 'refund_not_allowed' });
  await h.svc.simulate(ctx, order.id, 'success', 'api');
  await assert.rejects(h.svc.createRefund(ctx, { payment_order_id: order.id, amount: 50001 }, 'api'), { code: 'refund_exceeds_available' });
  await h.svc.createRefund(ctx, { payment_order_id: order.id, amount: 30000 }, 'api');
  await assert.rejects(h.svc.createRefund(ctx, { payment_order_id: order.id, amount: 20001 }, 'api'), { code: 'refund_exceeds_available' });
  await assert.rejects(h.svc.createRefund(ctx, { payment_order_id: order.id, amount: 0 }, 'api'), ApiError);
  assert.equal((await h.svc.getOrder(ctx, order.id)).refundedAmount, 30000);
});

test('invalid requests: bad amounts, unsafe return URL, unknown scenario, archived project', async () => {
  const h = makeHarness(); const { ctx, secretKey } = await setupProject(h);
  await assert.rejects(h.svc.createOrder(ctx, orderBody({ amount: -1 })), { code: 'invalid_request' });
  await assert.rejects(h.svc.createOrder(ctx, orderBody({ return_url: 'https://evil.com/steal' })), { code: 'return_url_not_allowed' });
  const { order } = await h.svc.createOrder(ctx, orderBody());
  await assert.rejects(h.svc.simulate(ctx, order.id, 'make_me_rich', 'api'), { code: 'invalid_scenario' });
  await assert.rejects(h.svc.simulate(ctx, order.id, '__proto__', 'api'), { code: 'invalid_scenario' });
  await h.svc.setProjectStatus(ctx.uid, ctx.projectId, 'archived');
  await assert.rejects(h.svc.authenticateSecretKey(secretKey), { code: 'project_archived' });
  await assert.rejects(h.svc.createOrder(ctx, orderBody()), { code: 'project_archived' });
});

test('manual webhook retry after a failing endpoint recovers; attempts are counted', async () => {
  const h = makeHarness(); const { ctx } = await setupProject(h); await withHook(h, ctx);
  h.respond.status = 500; h.respond.body = 'boom';
  await h.svc.createOrder(ctx, orderBody());
  let d = (await h.svc.listDeliveries(ctx))[0];
  assert.equal(d.status, 'failed'); assert.equal(d.attempts, 1); assert.equal(d.responseStatus, 500);
  h.respond.status = 200; h.respond.body = 'ok';
  const retried = await h.svc.retryDelivery(ctx, d.id);
  assert.equal(retried.status, 'delivered'); assert.equal(retried.attempts, 2);
  assert.equal(h.sent[0].body, h.sent[1].body, 'same event body and id on retry');
  assert.equal(h.sent[0].headers['money-event-id'], h.sent[1].headers['money-event-id']);
});

test('project deletion requires confirmation and removes keys, indexes and data', async () => {
  const h = makeHarness(); const { ctx, secretKey } = await setupProject(h);
  const { order } = await h.svc.createOrder(ctx, orderBody());
  await assert.rejects(h.svc.deleteProject(ctx.uid, ctx.projectId, 'wrong'), { code: 'confirmation_mismatch' });
  await h.svc.deleteProject(ctx.uid, ctx.projectId, 'Demo Shop');
  await assert.rejects(h.svc.authenticateSecretKey(secretKey), { code: 'invalid_api_key' });
  await assert.rejects(h.svc.resolveCheckout(order.id, order.checkoutToken), { code: 'not_found' });
  assert.equal((await h.svc.listProjects(ctx.uid)).length, 0);
});
