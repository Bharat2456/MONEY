# Implementation & verification status

Written honestly. "Tested" means a command actually ran and passed in the build environment.

## Verified by execution
| Check | Result |
|---|---|
| `tsx --test "tests/**/*.test.ts"` | **33 / 33 pass** (see `TEST_RESULTS.md`) |
| `tsc` strict type-check of `lib/core`, `services`, `types`, `tests` against real `@types/node` | clean |
| Syntax check (TypeScript parser) of all 76 `.ts/.tsx` files | clean |
| Type-check of UI + route handlers using **loose stubs** for next/react/firebase | no errors in project code (only artefacts of the stubs) |
| Sample merchant (`examples/merchant-demo`) run against a fake MONEY API | 8/8 checks pass (order redirect, server-to-server verification, signed webhook, dedupe, bad signature) |
| UI pages rendered in headless Chromium (real components + real stylesheet, driven by the real engine via `tools/media`) | 18 screenshots + a ~2-minute walkthrough recorded with **zero browser errors**; a full new-user journey (register → project → keys → webhook → order → checkout → refund → timeline) completed against the preview backend |
| ZIP extracted into a clean directory, then `tsx --test` | 33 / 33 pass; secret scan (private keys, Firebase keys, `money_test_sk_`, `whsec_`) found nothing; no `.env`, `node_modules` or `.next` inside |

## NOT verified (the build sandbox had no network, so `npm install` was impossible)
- `npm install`, `npm run lint`, `npm run typecheck` (with real React/Next types), `npm run build`, `npm run dev`.
- Anything that talks to **Firebase**: `FirestoreStore`, token verification, Firebase Auth screens, security-rule deployment, the emulator mode.
- The UI **has not been compiled by `next build`** and has not been seen with the production toolchain. The screenshots/video come from a preview harness that uses the Tailwind 4 engine (production pins 3.4), stubs Firebase sign-in and the Next router, and substitutes the display font (Lora for Cormorant Garamond). Small visual differences are possible. Admin console and the Firebase-backed auth screens' real behaviour were not captured.
- `safeTransport` (the SSRF-pinned HTTPS client) is written but unit-tested only through an injected fake transport; its real network behaviour is unverified.
- HTTP-level behaviour of the API routes (status codes, headers). Business logic behind them _is_ tested.
- `package-lock.json` does not exist yet — `npm install` creates it; commit it afterwards.

**First thing to do:** `npm install && npm run check`. Expect that a first real compile may surface small type/lint fixes in the unverified UI layer.

## Implemented
Accounts (Firebase Auth: register, verify email, login, logout, reset), projects (create/edit/archive/delete with confirmation, multi-project, isolation), API keys (secret hashed, shown once, rotate, revoke, last-used), versioned REST API `/api/v1` (all required endpoints), payment simulator with 10 scenarios, explicit state machine with immutable events, hosted checkout, signed webhooks with delivery log + manual retry + SSRF protection, full/partial refund simulation, dashboard (overview stats from real data, filters, orders, transactions timeline, refunds, webhooks, logs, settings), docs site with JS/TS/Node/Python/cURL/HTML samples, six legal drafts, admin console (users, projects, audit, support/abuse, webhook errors, health, suspend, deletion processing), sample merchant, Firestore rules (deny-all to clients), premium UI in the supplied palette.

## Known limitations
1. **No durable queue.** Webhooks are attempted once inline (4 s timeout); retry is manual (≤10 attempts). Delayed scenarios resolve on the next read (API call, checkout poll, dashboard load), not on a timer — if nobody reads the order, its webhook waits.
2. **Rate limiting is per serverless instance** (in-memory); not global. Firestore-backed counters are a roadmap item.
3. **Free-tier quotas:** Firestore daily reads/writes and Vercel limits apply; quota errors map to HTTP 429/503 with clear messages.
4. Dashboard filtering is in memory over the latest 500 orders per project.
5. Dashboard auth is client-guarded (Firebase ID token verified on every API call); there is no server-side session cookie, so protected _pages_ render their shell before redirecting — data is never exposed without a valid token.
6. API-log and delivery retention windows are documented but no expiry job exists.
7. Webhook destinations must be public https (localhost blocked by design).
8. Email verification and password-reset emails use Firebase's default templates.
9. Admin overview counts are capped at 500 rows.
10. Legal documents are unreviewed drafts with placeholders (company name, address, grievance officer, jurisdiction).
