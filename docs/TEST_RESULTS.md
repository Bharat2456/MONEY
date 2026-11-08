# Test results

Captured from a real run of `npm test` (`tsx --test`, Node v22.23.4) on 2026-11-08 in the build environment (no network, no Firebase).

```
✔ sample merchant verifier accepts platform signatures and rejects tampering/replay (1.598642ms)
✔ API key authentication: valid, revoked, garbage, publishable-as-secret, rotation (5.93977ms)
✔ suspended accounts cannot use API keys (0.765999ms)
✔ Scenario A: create → checkout → success → webhook → merchant verifies → dashboard shows success (11.939021ms)
✔ Scenario B: failure → webhook → dashboard shows failure (2.788862ms)
✔ Scenario C: pending → delayed success (backend-owned timer) → webhook → dashboard updates (2.696974ms)
✔ delayed success after 5s and timeout scenarios (2.43614ms)
✔ cancelled, expired, reversed, pending-until-expiry scenarios (4.082864ms)
✔ Scenario D: partial refunds then full refund; history and totals stay consistent (4.000415ms)
✔ refund failure simulation leaves balances unchanged (4.58518ms)
✔ Scenario E: another user cannot access or modify a project, its orders, keys or webhooks (4.536883ms)
✔ checkout requires the correct token (0.883042ms)
✔ Scenario F: duplicate requests produce no duplicate financial events (6.333688ms)
✔ duplicate-attempt scenario records a rejected attempt without a second success (0.897444ms)
✔ concurrent refunds cannot exceed the refundable amount (5.566157ms)
✔ Scenario G: unsafe webhook destinations are rejected (1.070877ms)
✔ webhook whose DNS later resolves to a private address is blocked at delivery time (1.133ms)
✔ Scenario H: refund greater than refundable amount is rejected; ineligible states too (13.674592ms)
✔ invalid requests: bad amounts, unsafe return URL, unknown scenario, archived project (1.161131ms)
✔ manual webhook retry after a failing endpoint recovers; attempts are counted (1.258488ms)
✔ project deletion requires confirmation and removes keys, indexes and data (0.908532ms)
✔ state machine: permitted and forbidden transitions (0.959292ms)
✔ api keys: format, hashing, uniqueness, classification (0.908917ms)
✔ serialised keys and webhooks never expose secrets (0.511322ms)
✔ webhook signing: valid, tampered, wrong secret, stale timestamp (0.561474ms)
✔ SSRF: private/reserved IPs are detected (4.663741ms)
✔ SSRF: unsafe webhook URLs are rejected (1.02724ms)
✔ SSRF: hostnames resolving to private addresses are rejected (0.440803ms)
✔ return URL validation prevents open redirects (0.357662ms)
✔ order validation: amounts and fields (0.644607ms)
✔ secret envelope encrypts and authenticates (0.97293ms)
✔ rate limiter: blocks over limit and recovers after window (0.278271ms)
✔ error responses never leak internals (0.150151ms)
ℹ tests 33
ℹ suites 0
ℹ pass 33
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 765.12474
```

Lint, `next build` and UI tests were **not** run — see STATUS.md.
