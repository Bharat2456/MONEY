# API reference — `/api/v1`

Test mode only. Base URL: your deployment (`http://localhost:3000` locally). All bodies are JSON (max 64 KB). Amounts are integers in paise.

## Authentication
`Authorization: Bearer money_test_sk_…` (secret key, backend only). Missing/invalid → `401 missing_api_key | invalid_api_key`. Archived project → `403 project_archived`; suspended account → `403 account_suspended`. Limit ≈ 120 requests/min per key (`429 rate_limited`, `Retry-After`).
`Idempotency-Key: <≤255 chars>` is honoured on `POST /payment-orders`, `/payment-orders/:id/simulate`, `/refunds`. Replays return the original with `Idempotent-Replayed: true` (orders) — different body → `422 idempotency_key_reuse`.

## Errors
```json
{ "error": { "code": "invalid_request", "message": "amount must be an integer…", "details": { "field": "amount" } } }
```
| HTTP | codes |
|---|---|
| 400 | invalid_request, invalid_json, invalid_scenario, invalid_webhook_url, unsafe_webhook_destination, return_url_not_allowed, confirmation_mismatch |
| 401 | missing_api_key, invalid_api_key |
| 403 | project_archived, account_suspended, forbidden |
| 404 | not_found |
| 409 | invalid_state_transition, payment_already_processed, payment_in_progress, refund_not_allowed, key/webhook/project limit codes |
| 413 | payload_too_large |
| 422 | idempotency_key_reuse, refund_exceeds_available |
| 429 | rate_limited, quota_exceeded |
| 503 | service_unavailable, not_configured |

## Payment orders
**POST `/payment-orders`** → `201` (`200` on idempotent replay)
```json
{ "amount": 50000, "currency": "INR", "description": "Demo product purchase", "merchant_order_id": "ORDER-10001",
  "return_url": "https://example.com/payment-result", "expires_in_minutes": 30, "metadata": { "cart": "abc" } }
```
Validation: `amount` integer 100–10,000,000; `currency` INR/USD/EUR; `description` ≤255; `merchant_order_id` 1–64 chars `[A-Za-z0-9_.:-]`; `return_url` https (or http localhost) whose origin is the project website, an allowed return origin, or localhost; `expires_in_minutes` 1–1440 (default 30). Merchants can never set status.
Response: `{ id, object:"payment_order", amount, currency, description, merchant_order_id, status:"CREATED", failure_code, refunded_amount, transaction_id, scenario, metadata, return_url, checkout_url, created_at, expires_at, paid_at, simulated:true, livemode:false }`

**GET `/payment-orders/:id`** — current state (applies any due scheduled transition first).
**GET `/payment-orders`** — `?status=&merchant_order_id=&limit=` → `{object:"list", data:[…], has_more:false}`.
**POST `/payment-orders/:id/simulate`** `{ "scenario": "success" }` → order. Scenarios: see PAYMENT_LIFECYCLE.md.
**POST `/payment-orders/:id/cancel`** → order, or `409 invalid_state_transition`.

## Refunds
**POST `/refunds`** → `201`
```json
{ "payment_order_id": "ord_…", "amount": 20000, "reason": "Customer request", "outcome": "success" }
```
`transaction_id` may replace `payment_order_id`; omit `amount` for the remaining balance; `outcome`: `success` | `failure`. Errors: `409 refund_not_allowed` (order not SUCCESS), `422 refund_exceeds_available`.
**GET `/refunds/:id`** — refund plus its immutable `events`.

## Transactions
**GET `/transactions`**, **GET `/transactions/:id`** (includes `events`: `{id, seq, type, from, to, actor, data, created_at}`).

## Webhooks
**POST `/webhooks`** `{ "url": "https://…", "events": ["*"] , "description": "" }` → `201` including `secret` (**shown once**).
URL rules: https only; port 443/8443; no credentials; no localhost/`.local`/`.internal`/IP literals in private or reserved ranges; hostname must resolve only to public addresses (re-checked at delivery).
**GET `/webhooks`**, **DELETE `/webhooks/:id`**, **GET `/webhook-deliveries`**.

### Webhook delivery
`POST` with headers `content-type: application/json`, `money-signature: t=<unix>,v1=<hex>`, `money-event-id`, `money-delivery-id`, `money-event-type`. Signature = `HMAC-SHA256(secret, "<t>.<raw body>")`. Respond `2xx` to acknowledge. See docs site `/docs#webhooks` for TypeScript/Python verifiers.

## Browser-safe lookup (publishable key)
**GET `/public/orders/:id?key=money_test_pk_…`** → `{id, status, amount, currency, checkout_url}` for orders in the key's project only. Used by `/money.js` (`MONEY.checkout({ key, orderId })`).

## Dashboard & admin APIs
`/api/dashboard/*` (Firebase ID token; email must be verified) and `/api/admin/*` (custom claim `admin`) are internal to the UI and not a stable public contract.
