# Development roadmap

## Before first real use (do now)
1. `npm install && npm run check`; fix whatever the first real compile reports; commit `package-lock.json`.
2. Create Firebase project, deploy rules/indexes, grant yourself admin.
3. Click through every screen on desktop and mobile; fix visual issues (UI was never rendered during the build).
4. Run the Emulator Suite flow once; add Playwright e2e tests.
5. Choose a licence (`LICENSE`) and set `package.json` accordingly.

## Before public launch
- Lawyer review of all policies; fill placeholders (company, address, grievance officer, jurisdiction).
- Register a domain (optional), configure Firebase authorized domains and email templates/sender.
- Global rate limiting (Firestore counters or an external store), abuse monitoring, CAPTCHA on registration/contact.
- Data-retention jobs (logs 30 d, deliveries, deleted-account purge), backups/export.
- Independent security review; dependency audit (`npm audit`) and Dependabot.
- Capacity plan for free-tier quotas; status page.

## Product backlog
Durable webhook retries (queue/cron on a paid tier), per-endpoint event filters in UI, webhook test-ping button, richer dashboard charts, team members per project, CSV export, SDK packages (npm/pip), OpenAPI spec, i18n, dark/light themes.

## Phase 2 / 3 (not started)
MONEY Pay (consumer UPI app) in a controlled test environment, then RBI/NPCI authorisations, bank partnerships and audits — all require legal/regulatory work outside this codebase.
