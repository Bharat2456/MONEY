# Payment lifecycle

## States
`CREATED · PENDING · PROCESSING · SUCCESS · FAILED · CANCELLED · EXPIRED · REVERSED · REFUNDED`

## Permitted transitions (enforced in `lib/core/state-machine.ts`)
| From | To |
|---|---|
| CREATED | PROCESSING, PENDING, CANCELLED, EXPIRED |
| PENDING | PROCESSING, SUCCESS, FAILED, CANCELLED, EXPIRED |
| PROCESSING | SUCCESS, FAILED, PENDING, CANCELLED |
| SUCCESS | REVERSED, REFUNDED (only when fully refunded) |
| FAILED, CANCELLED, EXPIRED, REVERSED, REFUNDED | — terminal |

Anything else → `409 invalid_state_transition`. A **partial** refund leaves the order `SUCCESS` with `refunded_amount` increased.

## Scenarios
| id | Immediate | Later (backend-owned) |
|---|---|---|
| success | PROCESSING → SUCCESS | |
| success_after_5s | PROCESSING | SUCCESS at +5 s |
| pending_30s | PENDING | SUCCESS at +30 s |
| pending_until_expiry | PENDING | EXPIRED at `expires_at` |
| failure | PROCESSING → FAILED (`SIMULATED_DECLINE`) | |
| timeout | PROCESSING | FAILED (`SIMULATED_TIMEOUT`) at +10 s |
| cancelled | CANCELLED | |
| expired | EXPIRED | |
| reversed | PROCESSING → SUCCESS → REVERSED | |
| duplicate | PROCESSING → SUCCESS, then a 2nd attempt is rejected and logged | |

Max simulated delay is capped at 60 s (`MAX_SIMULATED_DELAY_MS`).

## Duplicate, concurrent and repeated requests
- `Idempotency-Key` on order create / simulate / refund: same key + same body returns the original; different body → `422 idempotency_key_reuse`.
- Every state change runs in a Firestore transaction that re-reads the order. Concurrent simulate calls: exactly one wins; others get `409 payment_already_processed` / `payment_in_progress` and produce only a non-financial `attempt.rejected` event.
- Refunds re-read `refundedAmount` inside the transaction, so concurrent refunds can never exceed the original amount.

## Lazy reconciliation (important)
Delayed transitions and expiry are applied when the order is next read — `GET` order/list/transaction, checkout poll, dashboard load — inside a transaction that also writes the event and triggers the webhook. This is the zero-cost substitute for a scheduler. If nothing reads the order, nothing happens until something does.

## Events and webhooks
Every transition appends an immutable event with a gapless `seq`. Webhook event types: `payment.created|pending|succeeded|failed|cancelled|expired|reversed`, `refund.created|succeeded|failed`. `PROCESSING` and `REFUNDED` have no payment event (refund events cover refunds).
