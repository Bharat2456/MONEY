# Contributing

1. `npm install`, then make your change on a branch.
2. Keep payment logic in `lib/core` / `services/money.ts` (framework-free) and add a test in `tests/`.
3. Run `npm run check` (lint, typecheck, tests, build) — all must pass.
4. Never weaken a safety rule (SSRF, idempotency, state-machine, secret handling) without a test and a note in `docs/SECURITY_MODEL.md`.
5. Do not add real-payment behaviour: no UPI intents/QR, no collection of PINs/OTPs/CVVs, no claims of regulatory approval.
6. Do not copy code from third-party projects without a compatible licence (see `docs/YOUPI_PG_ASSESSMENT.md`).
