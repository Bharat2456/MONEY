# MONEY — Phase 1: Free Developer Payment Gateway Sandbox

**Modern Online Network Empowering You** · _Your money. Your move._ · Free Payment Infrastructure for Every Developer.

MONEY Phase 1 lets a developer register free, create a project, get test API keys, create payment orders, show a hosted checkout, simulate success / failure / pending / timeout / reversal / refund outcomes, receive signed webhooks and inspect everything in a dashboard.

> **It is a simulator.** No real payments, no real money, no UPI/NPCI/bank connection. It is not RBI-approved, NPCI-certified, a bank, a payment aggregator or a UPI app. See `docs/LEGAL_POLICIES.md`.

**Status honesty:** read [`docs/STATUS.md`](docs/STATUS.md) for exactly what has been tested and what has not. In short: the payment engine is covered by 33 passing automated tests; the Next.js UI/API layer was written and syntax/type-checked offline but has **not yet been built or run** — run `npm run check` first (below).

## Requirements
- **Node.js 20.11+** (22 LTS recommended) and npm — https://nodejs.org
- A free **Firebase** project (Authentication + Firestore) — no credit card. Guide: [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md)
- Windows PowerShell works; no VS Code needed.

## Quick start (Windows PowerShell)
```powershell
cd MONEY-Phase-1
npm install
Copy-Item .env.example .env.local

# Generate the two MONEY secrets and paste them into .env.local
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])   # → MONEY_ENCRYPTION_KEY
-join ((48..57)+(97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })                 # → MONEY_KEY_PEPPER

# Fill the Firebase values in .env.local (docs/FIREBASE_SETUP.md), then:
npm run dev        # http://localhost:3000
```
Without Firebase values the site still starts: public pages work, and sign-in/dashboard pages show a clear setup message. **MONEY never fakes authentication or storage.**

## Verify the project (do this first)
```powershell
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
npm test            # 33 tests: unit + lifecycle scenarios A–H (runs without Firebase)
npm run build       # production build
npm run check       # all four in order
```
`npm test` needs only Node and `tsx`; it uses an in-memory store, never touches Firebase.

## Try the full flow
1. `npm run dev`, register at `/register`, click the emailed verification link.
2. **Projects → New project** and copy the secret key (shown once).
3. In another terminal run the sample merchant: see [`examples/merchant-demo/README.md`](examples/merchant-demo/README.md).
4. Or create orders from the dashboard (**Payment Orders → New test order → Open checkout**).

## First administrator
Admin role is a Firebase **custom claim** set server-side only:
```powershell
node --env-file=.env.local scripts/grant-admin.mjs you@example.com   # then sign out and in again
```
Then open `/admin`. The script refuses unverified accounts. See `docs/SECURITY_MODEL.md`.

## Layout
`app/` pages and route handlers · `components/` UI · `lib/core/` framework-free engine primitives (state machine, keys, signing, SSRF guard, validation) · `services/money.ts` business logic over a `DocStore` interface · `lib/server/` Firebase Admin + routing · `tests/` · `examples/merchant-demo/` · `docs/`.

## Documentation
[STATUS](docs/STATUS.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [DATABASE_SCHEMA](docs/DATABASE_SCHEMA.md) · [API_REFERENCE](docs/API_REFERENCE.md) · [PAYMENT_LIFECYCLE](docs/PAYMENT_LIFECYCLE.md) · [FIREBASE_SETUP](docs/FIREBASE_SETUP.md) · [VERCEL_DEPLOYMENT](docs/VERCEL_DEPLOYMENT.md) · [SECURITY_MODEL](docs/SECURITY_MODEL.md) · [LEGAL_POLICIES](docs/LEGAL_POLICIES.md) · [TESTING_GUIDE](docs/TESTING_GUIDE.md) · [DEVELOPMENT_ROADMAP](docs/DEVELOPMENT_ROADMAP.md) · [YOUPI_PG_ASSESSMENT](docs/YOUPI_PG_ASSESSMENT.md)

## Licence
No open-source licence has been chosen yet (`"license": "UNLICENSED"`). Choose one deliberately before publishing the repository; see the roadmap.
