# Architecture

A **modular monolith**: one Next.js app (App Router, TypeScript) deployed as Vercel serverless functions, with Firebase Authentication and Firestore. No microservices, queues or paid infrastructure.

```
Browser ──► Next.js pages (React, Tailwind)
   │             │ Firebase ID token (Authorization: Bearer)
   ▼             ▼
 /api/dashboard/*   /api/v1/* (secret key)   /api/checkout/* (order token)   /api/admin/* (admin claim)
        └──────────────┬──────────────────────────────┘
                lib/server (router, auth, rate limit)
                       │
                services/money.ts  ── MoneyService (all business rules)
                       │
        lib/core (pure: state machine, keys, signing, SSRF, validation, simulation)
                       │
                  DocStore interface ──► FirestoreStore (prod, Admin SDK)
                                    └──► MemoryStore    (tests)
```

## Key decisions
- **Core is framework-free.** Everything that matters for correctness (state machine, idempotency, refunds, key handling, SSRF, signing) lives in `lib/core` + `services/money.ts` behind a tiny `DocStore` interface, so it is tested without Firebase.
- **Ownership by path.** Every document lives under `users/{uid}/projects/{pid}/…`; `uid` always comes from the verified Firebase ID token (dashboard) or the API-key index (v1), never from client input. Cross-user access is structurally impossible and tested (Scenario E).
- **Backend owns time.** Delayed outcomes store `scheduled: {to, at}` on the order. Any read reconciles due transitions inside a transaction. Browsers only poll.
- **Atomicity.** State changes, event writes, refund balances and idempotency records commit in one Firestore transaction. Webhook dispatch happens after commit.
- **Two auth schemes + one public token:** Firebase ID token (dashboard/admin), secret API key (v1), per-order checkout token (customer).
- **Firestore is closed to browsers** (`allow read, write: if false`); only the Admin SDK touches data.
- **Top-level index docs** make lookups O(1): `apiKeyIndex/{hmac}`, `pkIndex/{pk}`, `orderIndex/{orderId}`.

## Request flow: hosted payment
1. Merchant server `POST /api/v1/payment-orders` (secret key) → order `CREATED`, `payment.created` webhook.
2. Customer opens `checkout_url` (`/checkout/{id}?t=token`).
3. Customer picks a simulated outcome → `POST /api/checkout/{id}` → `MoneyService.simulate` → transitions + events + webhooks.
4. Customer is offered the validated `return_url`; merchant confirms via `GET /api/v1/payment-orders/:id` or the signed webhook.

## Free-tier constraints
See `docs/STATUS.md` (no durable queue, per-instance rate limits, quotas).
