import type { DeliveryDoc, EventDoc, KeyDoc, OrderDoc, ProjectDoc, RefundDoc, TxnDoc, WebhookDoc } from '@/types';

const iso = (ms: number | null | undefined): string | null => (ms ? new Date(ms).toISOString() : null);

export const checkoutUrl = (appUrl: string, o: Pick<OrderDoc, 'id' | 'checkoutToken'>): string =>
  `${appUrl}/checkout/${o.id}?t=${o.checkoutToken}`;

export const serializeOrder = (o: OrderDoc, appUrl: string) => ({
  id: o.id, object: 'payment_order', amount: o.amount, currency: o.currency, description: o.description,
  merchant_order_id: o.merchantOrderId, status: o.status, failure_code: o.failureCode, refunded_amount: o.refundedAmount,
  transaction_id: o.transactionId, scenario: o.scenario, metadata: o.metadata, return_url: o.returnUrl,
  checkout_url: checkoutUrl(appUrl, o), created_at: iso(o.createdAt), expires_at: iso(o.expiresAt), paid_at: iso(o.paidAt),
  simulated: true, livemode: false,
});

export const serializeTxn = (t: TxnDoc) => ({
  id: t.id, object: 'transaction', payment_order_id: t.orderId, amount: t.amount, currency: t.currency, status: t.status,
  scenario: t.scenario, failure_code: t.failureCode, refunded_amount: t.refundedAmount, simulated_reference: t.simulatedReference,
  created_at: iso(t.createdAt), updated_at: iso(t.updatedAt), paid_at: iso(t.paidAt), simulated: true, livemode: false,
});

export const serializeEvent = (e: EventDoc) => ({ id: e.id, seq: e.seq, type: e.type, from: e.from, to: e.to, actor: e.actor, data: e.data, created_at: iso(e.at) });

export const serializeRefund = (r: RefundDoc) => ({
  id: r.id, object: 'refund', payment_order_id: r.orderId, transaction_id: r.transactionId, amount: r.amount, currency: r.currency,
  reason: r.reason, status: r.status, failure_code: r.failureCode, created_at: iso(r.createdAt), simulated: true, livemode: false,
});

export const serializeProject = (p: ProjectDoc) => ({
  id: p.id, name: p.name, description: p.description, website_url: p.websiteUrl, category: p.category, environment: p.environment,
  status: p.status, allowed_return_origins: p.allowedReturnOrigins, created_at: iso(p.createdAt), updated_at: iso(p.updatedAt),
});

/** Never includes the secret hash or the secret key. */
export const serializeKey = (k: KeyDoc) => ({
  id: k.id, label: k.label, publishable_key: k.publishableKey, secret_key_hint: `money_test_sk_…${k.secretLast4}`, status: k.status,
  created_at: iso(k.createdAt), last_used_at: iso(k.lastUsedAt), revoked_at: iso(k.revokedAt),
});

/** Never includes the signing secret. */
export const serializeWebhook = (w: WebhookDoc) => ({
  id: w.id, url: w.url, description: w.description, events: w.events, status: w.status, secret_hint: `whsec_…${w.secretLast4}`, created_at: iso(w.createdAt),
});

export const serializeDelivery = (d: DeliveryDoc) => ({
  id: d.id, webhook_id: d.webhookId, url: d.url, event_id: d.eventId, event_type: d.eventType, status: d.status, attempts: d.attempts,
  response_status: d.responseStatus, response_body_preview: d.responseBodyPreview, error: d.error, created_at: iso(d.createdAt), last_attempt_at: iso(d.lastAttemptAt),
});
