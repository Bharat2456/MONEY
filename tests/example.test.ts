import test from 'node:test';
import assert from 'node:assert/strict';
import { signPayload } from '@/lib/core/signing';
import { verifyMoneySignature } from '../examples/merchant-demo/verify.mjs';

test('sample merchant verifier accepts platform signatures and rejects tampering/replay', () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'payment.succeeded' });
  const header = signPayload('whsec_demo', body, 5000);
  assert.ok(verifyMoneySignature(header, body, 'whsec_demo', 300, 5100));
  assert.ok(!verifyMoneySignature(header, body + ' ', 'whsec_demo', 300, 5100));
  assert.ok(!verifyMoneySignature(header, body, 'whsec_other', 300, 5100));
  assert.ok(!verifyMoneySignature(header, body, 'whsec_demo', 300, 9999), 'replay window enforced');
  assert.ok(!verifyMoneySignature(undefined, body, 'whsec_demo'));
});
