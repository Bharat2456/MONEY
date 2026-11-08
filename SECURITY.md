# Security

MONEY Phase 1 is a payment **simulator**; it handles developer accounts, API keys and webhook endpoints but no real financial data. It has **not** been independently audited or certified.

## Reporting a vulnerability
Email **[SECURITY CONTACT — to be completed]** with reproduction steps. Please do not access other users' data, degrade the service, or disclose publicly before we've had a reasonable time to fix. See the in-app Security Disclosure Policy (`/legal/security-disclosure`).

## Summary of protections
Server-side token verification, path-rooted ownership, hashed secret keys (shown once), encrypted webhook secrets, HMAC-signed webhooks, SSRF defences (URL, DNS, connect-time and no-redirect checks), return-URL allow-listing, idempotency + transactional state changes, strict validation and body limits, CSP/security headers, deny-all Firestore rules, sanitised errors, audit logs. Full detail and **known limitations** (per-instance rate limiting, no durable webhook queue, client-side page guards, etc.) are in [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md).

## Operator checklist
- Never commit `.env*` or service-account JSON; rotate immediately if exposed.
- Keep `MONEY_ENCRYPTION_KEY` and `MONEY_KEY_PEPPER` secret and backed up.
- Grant admin only via `scripts/grant-admin.mjs`; review `/admin → audit` regularly.
- Run `npm audit` and keep dependencies current.
