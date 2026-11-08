# Firestore schema

All timestamps are epoch milliseconds (numbers). All monetary values are integers in the currency's smallest unit (paise). Clients cannot read or write any of this directly (`firestore.rules`).

## Hierarchy
```
users/{uid}                                   UserDoc        {email, createdAt, suspended, suspendedReason, deletionRequestedAt}
users/{uid}/projects/{pid}                    ProjectDoc     {name, description, websiteUrl, category, environment:"test", status, allowedReturnOrigins[], createdAt, updatedAt}
  …/apiKeys/{keyId}                           KeyDoc         {label, publishableKey, secretHash, secretLast4, status, createdAt, lastUsedAt, revokedAt}
  …/orders/{orderId}                          OrderDoc       {amount, currency, description, merchantOrderId, returnUrl, status, failureCode, refundedAmount, checkoutToken, scenario, attempts, scheduled{to,at,failureCode?}, metadata, transactionId, createdAt, updatedAt, expiresAt, paidAt}
  …/transactions/{txnId}                      TxnDoc         {orderId, amount, currency, status, scenario, failureCode, refundedAmount, simulatedReference, eventCount, createdAt, updatedAt, paidAt}
  …/transactions/{txnId}/events/{evtId}       EventDoc       IMMUTABLE {seq, type, from, to, at, actor, data}
  …/refunds/{refundId}                        RefundDoc      {orderId, transactionId, amount, currency, reason, status, failureCode, eventCount, createdAt, updatedAt}
  …/refunds/{refundId}/events/{evtId}         EventDoc       IMMUTABLE
  …/webhooks/{whId}                           WebhookDoc     {url, description, events[], status, secretEnc (AES-256-GCM), secretLast4, createdAt}
  …/deliveries/{dlvId}                        DeliveryDoc    {webhookId, url, eventId, eventType, payload, status, attempts, responseStatus, responseBodyPreview, error, createdAt, lastAttemptAt}
  …/idempotency/{sha256(key)}                 {requestHash, kind, id, createdAt}
  …/apiLogs/{logId}                           {at, method, path, status, durationMs, keyId}
apiKeyIndex/{hmac(secret)}                    {uid, projectId, keyId}        removed on revoke/delete
pkIndex/{publishableKey}                      {uid, projectId, keyId}
orderIndex/{orderId}                          {uid, projectId}               for checkout lookup
auditLogs/{auditId}                           {at, actorUid, action, target, meta}
supportRequests/{id}                          {kind: support|abuse, name, email, message, status, createdAt}
```

## Rules of the model
- Events are **append-only**: the service only ever `set`s new event documents with fresh IDs and `seq = eventCount + 1`; nothing updates or deletes them (except whole-project deletion).
- Secret API keys are **never stored**; only `HMAC-SHA256(pepper, key)` and the last 4 characters.
- Webhook signing secrets are stored **encrypted**; never returned after creation.
- Order status and transaction status are updated in the same transaction and always match.

## Indexes
Single-field only (automatic), plus collection-group overrides in `firestore.indexes.json` for `deliveries.status` and `projects.createdAt` (admin views). Deploy with `firebase deploy --only firestore:indexes`.
