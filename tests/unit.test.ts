import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, isTerminal, ORDER_STATUSES, TRANSITIONS } from '@/lib/core/state-machine';
import { classifyKey, generateKeyPair, hashSecret } from '@/lib/core/keys';
import { signPayload, verifySignature } from '@/lib/core/signing';
import { assertPublicHost, isPrivateIp, validateReturnUrl, validateWebhookUrl } from '@/lib/core/ssrf';
import { parseCreateOrder } from '@/lib/core/validation';
import { decryptSecret, encryptSecret } from '@/lib/core/crypto';
import { RateLimiter } from '@/lib/core/ratelimit';
import { toErrorResponse, ApiError } from '@/lib/core/errors';
import { serializeKey, serializeWebhook } from '@/services/serializers';
import { ENC_KEY } from './helpers';

test('state machine: permitted and forbidden transitions', () => {
  assert.ok(canTransition('CREATED', 'PROCESSING'));
  assert.ok(canTransition('PROCESSING', 'SUCCESS'));
  assert.ok(canTransition('SUCCESS', 'REFUNDED'));
  assert.ok(!canTransition('FAILED', 'SUCCESS'));
  assert.ok(!canTransition('CREATED', 'SUCCESS'), 'cannot skip PROCESSING');
  assert.ok(!canTransition('REVERSED', 'SUCCESS'));
  for (const s of ['FAILED', 'CANCELLED', 'EXPIRED', 'REVERSED', 'REFUNDED'] as const) assert.ok(isTerminal(s));
  for (const s of ORDER_STATUSES) for (const t of TRANSITIONS[s]) assert.ok((ORDER_STATUSES as readonly string[]).includes(t));
});

test('api keys: format, hashing, uniqueness, classification', () => {
  const a = generateKeyPair('pep'), b = generateKeyPair('pep');
  assert.match(a.publishableKey, /^money_test_pk_/);
  assert.match(a.secretKey, /^money_test_sk_/);
  assert.notEqual(a.secretKey, b.secretKey);
  assert.equal(a.secretHash, hashSecret(a.secretKey, 'pep'));
  assert.notEqual(a.secretHash, hashSecret(a.secretKey, 'other-pepper'));
  assert.ok(!a.secretHash.includes(a.secretKey));
  assert.equal(classifyKey(a.secretKey), 'secret');
  assert.equal(classifyKey(a.publishableKey), 'publishable');
  assert.equal(classifyKey('sk_live_123'), null);
});

test('serialised keys and webhooks never expose secrets', () => {
  const kp = generateKeyPair();
  const json = JSON.stringify(serializeKey({ id: 'k', uid: 'u', projectId: 'p', label: 'x', publishableKey: kp.publishableKey, secretHash: kp.secretHash, secretLast4: kp.secretLast4, status: 'active', createdAt: 1, lastUsedAt: null, revokedAt: null }));
  assert.ok(!json.includes(kp.secretHash) && !json.includes(kp.secretKey));
  const wh = JSON.stringify(serializeWebhook({ id: 'w', uid: 'u', projectId: 'p', url: 'https://a.example.com', description: '', events: ['*'], status: 'active', secretEnc: 'ENCRYPTED', secretLast4: 'abcd', createdAt: 1 }));
  assert.ok(!wh.includes('ENCRYPTED'));
});

test('webhook signing: valid, tampered, wrong secret, stale timestamp', () => {
  const body = '{"id":"evt_1"}';
  const h = signPayload('whsec_x', body, 1000);
  assert.ok(verifySignature(h, body, 'whsec_x', { nowSec: 1100 }));
  assert.ok(!verifySignature(h, body + ' ', 'whsec_x', { nowSec: 1100 }));
  assert.ok(!verifySignature(h, body, 'whsec_y', { nowSec: 1100 }));
  assert.ok(!verifySignature(h, body, 'whsec_x', { nowSec: 5000 }), 'replay outside tolerance');
  assert.ok(!verifySignature('garbage', body, 'whsec_x'));
  assert.ok(!verifySignature(null, body, 'whsec_x'));
});

test('SSRF: private/reserved IPs are detected', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:10.0.0.1', '2002::1', '64:ff9b::1'])
    assert.ok(isPrivateIp(ip), `${ip} should be private`);
  for (const ip of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:4700:4700::1111']) assert.ok(!isPrivateIp(ip), `${ip} should be public`);
});

test('SSRF: unsafe webhook URLs are rejected', () => {
  const bad = ['http://example.com/hook', 'https://localhost/hook', 'https://127.0.0.1/hook', 'https://[::1]/hook', 'https://169.254.169.254/latest/meta-data',
    'https://metadata.google.internal/x', 'https://user:pw@example.com/', 'https://example.com:22/', 'https://intranet/hook', 'https://printer.local/x',
    'https://0x7f.1/', 'https://2130706433/', 'https://service.internal/', 'ftp://example.com/', 'not a url'];
  for (const u of bad) assert.throws(() => validateWebhookUrl(u), ApiError, u);
  assert.equal(validateWebhookUrl('https://hooks.example.com/money').hostname, 'hooks.example.com');
});

test('SSRF: hostnames resolving to private addresses are rejected', async () => {
  await assert.rejects(assertPublicHost('rebind.example.com', async () => ['93.184.216.34', '127.0.0.1']));
  await assert.rejects(assertPublicHost('x.example.com', async () => []));
  await assert.doesNotReject(assertPublicHost('ok.example.com', async () => ['93.184.216.34']));
});

test('return URL validation prevents open redirects', () => {
  const allowed = ['https://shop.example.com'];
  assert.doesNotThrow(() => validateReturnUrl('https://shop.example.com/done', allowed));
  assert.doesNotThrow(() => validateReturnUrl('http://localhost:3000/done', allowed));
  for (const u of ['https://evil.com/phish', 'https://shop.example.com.evil.com/', 'javascript:alert(1)', 'http://shop.example.com/', 'https://u:p@shop.example.com/'])
    assert.throws(() => validateReturnUrl(u, allowed), ApiError, u);
});

test('order validation: amounts and fields', () => {
  const ok = parseCreateOrder({ amount: 50000, currency: 'inr', description: 'x', merchant_order_id: 'A-1' });
  assert.equal(ok.currency, 'INR');
  const bad: Array<Record<string, unknown>> = [
    { amount: 0 }, { amount: -5 }, { amount: 99 }, { amount: 10.5 }, { amount: '500' }, { amount: 10_000_001 }, { amount: 5000, currency: 'JPY' },
    { amount: 5000, merchant_order_id: '' }, { amount: 5000, merchant_order_id: 'bad id!' }, { amount: 5000, description: 'x'.repeat(256) },
  ];
  for (const b of bad) assert.throws(() => parseCreateOrder({ merchant_order_id: 'A-1', description: 'd', ...b }), ApiError, JSON.stringify(b));
  assert.throws(() => parseCreateOrder('nope'));
});

test('secret envelope encrypts and authenticates', () => {
  const env = encryptSecret('whsec_abc', ENC_KEY);
  assert.ok(!env.includes('whsec_abc'));
  assert.equal(decryptSecret(env, ENC_KEY), 'whsec_abc');
  const tampered = env.slice(0, -2) + (env.endsWith('A') ? 'B' : 'A') + env.slice(-1);
  assert.throws(() => decryptSecret(tampered, ENC_KEY));
});

test('rate limiter: blocks over limit and recovers after window', () => {
  let t = 0; const rl = new RateLimiter(() => t);
  for (let i = 0; i < 3; i++) assert.ok(rl.check('k', 3, 1000).allowed);
  assert.ok(!rl.check('k', 3, 1000).allowed);
  assert.ok(rl.check('other', 3, 1000).allowed);
  t = 1001; assert.ok(rl.check('k', 3, 1000).allowed);
});

test('error responses never leak internals', () => {
  const r = toErrorResponse(new Error('secret db password at /srv/app.js:12'));
  assert.equal(r.status, 500);
  assert.ok(!JSON.stringify(r.body).includes('password'));
  assert.equal(toErrorResponse({ code: 8 }).status, 429);
  assert.equal(toErrorResponse({ code: 14 }).status, 503);
});
