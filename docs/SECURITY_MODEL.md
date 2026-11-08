# Security model

MONEY is a simulator, but it holds developer accounts, API keys and webhook endpoints, so it is built defensively. **It has not been independently audited or certified.**

| Control | Implementation |
|---|---|
| Authentication | Firebase Auth (email/password, verification, reset). No custom password storage. ID token verified server-side on every dashboard/admin call; unverified emails get `403 email_not_verified`. |
| Authorisation | Data path is rooted at the verified `uid`; project IDs from clients are only ever looked up beneath that `uid`. API keys resolve to exactly one project. Tested cross-project/cross-user (Scenario E). |
| Admin | Firebase custom claim `admin: true`, set only by `scripts/grant-admin.mjs` with service-account credentials; never derived from an email or client input. Admin actions are audit-logged. Admin APIs cannot return key secrets (only hashes exist) or webhook secrets/payloads. |
| API keys | 256-bit random secret; stored as HMAC-SHA256(pepper); shown once; rotate/revoke; never returned by list endpoints; publishable key can only look up checkout URLs for its own project. |
| Webhook secrets | AES-256-GCM at rest with `MONEY_ENCRYPTION_KEY`; shown once. |
| Webhook signing | HMAC-SHA256 over `"<t>.<raw body>"`, timestamp tolerance 300 s, unique event IDs. |
| SSRF | https only; port 443/8443; no credentials; blocked hostnames/suffixes; private/reserved/mapped IPv4+IPv6 ranges rejected; DNS resolved and checked at creation **and** delivery; HTTPS client re-validates addresses at connect time (anti DNS-rebinding); redirects never followed; 4 s timeout; response preview ≤500 chars. |
| Open redirects | `return_url` must match the project's allow-list (or localhost); re-validated at redirect time. |
| Idempotency & concurrency | Idempotency records + Firestore transactions; tested with concurrent requests. |
| Input validation | Hand-written strict validators; control characters stripped; size limits (64 KB bodies, field lengths). |
| XSS | React escapes output; no `dangerouslySetInnerHTML`; strict CSP + `nosniff`, `X-Frame-Options: DENY`, HSTS, Referrer-Policy, Permissions-Policy. |
| CSRF | State-changing calls use a bearer token header, not cookies, so ambient-cookie CSRF does not apply. |
| Error hygiene | Unknown errors return a generic 500; stack traces and internal messages never leave the server. |
| Rate limiting | Fixed-window in-memory limiter (per user, per key, per IP/order, per publishable key, contact form). |
| Firestore rules | Deny-all for clients. |
| Checkout safety | No UPI intents/QR, no PIN/OTP/CVV/bank-login fields; every method labelled SIMULATED; test-mode banner. |

## Known limitations
- Rate limits are **per serverless instance**, not global — a determined attacker spreading load across instances can exceed them. A Firestore- or Redis-backed limiter is on the roadmap.
- **No durable webhook queue**: a delivery is attempted once; if the endpoint is down, the merchant must retry manually.
- Dashboard pages are guarded client-side; data endpoints are guarded server-side.
- No server-side session revocation check (`verifyIdToken` without `checkRevoked`); suspended users are blocked via a user-document flag instead.
- CSP allows inline scripts/styles (needed by Next.js hydration without nonce plumbing).
- Checkout tokens are bearer secrets in the URL; anyone with the link can complete or cancel that sandbox payment.
- No automatic data-expiry job.
- Secret rotation of `MONEY_ENCRYPTION_KEY` / `MONEY_KEY_PEPPER` is not automated.
