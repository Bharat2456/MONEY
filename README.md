<div align="center">

<img src="docs/media/banner.svg" alt="MONEY — Your money. Your move. Free payment infrastructure for every developer." width="100%" />

<br />

![Phase](https://img.shields.io/badge/PHASE-1%20%C2%B7%20SANDBOX-B28558?style=for-the-badge&labelColor=2C0E11)
![Mode](https://img.shields.io/badge/MODE-TEST%20ONLY%20%C2%B7%20SIMULATED-B28558?style=for-the-badge&labelColor=2C0E11)
![Tests](https://img.shields.io/badge/ENGINE%20TESTS-33%20PASSING-9DB98B?style=for-the-badge&labelColor=2C0E11)

![Next.js](https://img.shields.io/badge/Next.js-15-F1E6D6?style=flat-square&logo=nextdotjs&logoColor=F1E6D6&labelColor=322C25)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-F1E6D6?style=flat-square&logo=typescript&logoColor=F1E6D6&labelColor=322C25)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-F1E6D6?style=flat-square&logo=tailwindcss&logoColor=F1E6D6&labelColor=322C25)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-F1E6D6?style=flat-square&logo=firebase&logoColor=F1E6D6&labelColor=322C25)
![Vercel](https://img.shields.io/badge/Deploy-Vercel%20free%20tier-F1E6D6?style=flat-square&logo=vercel&logoColor=F1E6D6&labelColor=322C25)
![Node](https://img.shields.io/badge/Node-%E2%89%A5%2020.11-F1E6D6?style=flat-square&logo=nodedotjs&logoColor=F1E6D6&labelColor=322C25)

**Modern Online Network Empowering You**

[Walkthrough](#-watch-the-walkthrough) · [Screenshots](#-screenshots) · [Features](#-features) · [How it works](#-how-it-works) · [Quick start](#-quick-start) · [API](#-api-at-a-glance) · [Security](#-security) · [Status](#-project-status--read-this-first) · [Roadmap](#-roadmap)

</div>

---

> [!IMPORTANT]
> **MONEY is a payment *simulator*.** It does not process real payments, move money, settle funds, or connect to UPI, NPCI or any bank. It is not RBI-approved, NPCI-certified, a bank, a payment aggregator or a UPI app. Every transaction, refund, receipt and notification it produces is simulated, and it must never be presented as real. See [`docs/LEGAL_POLICIES.md`](docs/LEGAL_POLICIES.md).

## ✦ What is MONEY?

Most students, hackathon teams and first-time founders can't get a merchant account just to demo a checkout — no registered company, no business documents, no budget. **MONEY removes that barrier for *testing*.**

Register free, create a project, get test API keys, create payment orders from your backend, send customers to a hosted checkout, choose the outcome you want to test (success, failure, pending, timeout, reversal…), receive **signed webhooks**, simulate **refunds**, and inspect everything in a dashboard — all without a single real rupee.

It's **Phase 1** of a three-phase vision:

| Phase | Scope | State |
|---|---|---|
| **1** | Free developer payment-gateway sandbox *(this repository)* | **Built — see [status](#-project-status--read-this-first)** |
| 2 | *MONEY Pay* — consumer UPI app, started in a controlled test environment | Not started |
| 3 | RBI authorisations, NPCI onboarding, banking partnerships, audits | Not started |

---

## ▶ Watch the walkthrough

A ~2-minute captioned tour of the full journey — sign up → project → keys → webhook → order → hosted checkout → dashboard → refund → timeline → docs.

[![MONEY walkthrough — click for the full-quality MP4](docs/media/money-walkthrough.gif)](docs/media/money-walkthrough.mp4)

<sub>Click the animation for the full-quality **[MP4 (≈2.5 MB, no audio, captions on screen)](docs/media/money-walkthrough.mp4)**. The recording starts from a brand-new, empty account.</sub>

---

## 🖼 Screenshots

> [!NOTE]
> **How these were captured — please read.** They are real renders of this repository's actual React pages and stylesheet, driven by the real `MoneyService` (state machine, events, refunds, webhooks) with demo data, in headless Chromium. They are **not** from a deployed instance: Firebase sign-in is replaced by a fixed demo user, the Next.js router is shimmed, and the display typeface is substituted because web fonts weren't available offline. Details in [`tools/media/README.md`](tools/media/README.md).

<table>
<tr>
<td width="50%"><img src="docs/media/screenshots/01-home.png" alt="Landing page with hero, API request card and state machine illustration" /><br /><sub><b>Landing page</b> — headline, request card, one-time state animation</sub></td>
<td width="50%"><img src="docs/media/screenshots/05-dashboard-overview.png" alt="Dashboard overview with statistics and recent activity" /><br /><sub><b>Dashboard overview</b> — statistics computed from real data, recent activity</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/media/screenshots/12-checkout.png" alt="Hosted checkout with simulated outcome options" /><br /><sub><b>Hosted checkout</b> — every option labelled SIMULATED, test-mode banner</sub></td>
<td width="50%"><img src="docs/media/screenshots/14-checkout-success.png" alt="Checkout success screen" /><br /><sub><b>Result screen</b> — reminds merchants a redirect is never proof of payment</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/media/screenshots/08-payment-orders.png" alt="Payment orders table with filters and actions" /><br /><sub><b>Payment orders</b> — filters, statuses, open checkout, simulate, cancel</sub></td>
<td width="50%"><img src="docs/media/screenshots/09-transactions-timeline.png" alt="Transactions with expanded immutable event timeline" /><br /><sub><b>Transactions</b> — immutable event history per transaction</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/media/screenshots/10-webhooks.png" alt="Webhook endpoints and delivery log including a failed delivery with Retry" /><br /><sub><b>Webhooks</b> — signed deliveries, status codes, attempts, manual retry</sub></td>
<td width="50%"><img src="docs/media/screenshots/16-refunds.png" alt="Refund form and refund history" /><br /><sub><b>Refunds</b> — full or partial, success or failure, never above the original amount</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/media/screenshots/17-new-project-keys.png" alt="Newly created project showing publishable and secret test keys once" /><br /><sub><b>API keys</b> — secret shown exactly once, stored only as a hash</sub></td>
<td width="50%"><img src="docs/media/screenshots/03-docs.png" alt="Documentation page with code samples" /><br /><sub><b>Documentation</b> — JS, TS, Node.js, Python, cURL and HTML examples</sub></td>
</tr>
</table>

<details>
<summary><b>More screenshots</b> — features, registration, login, keys, API logs, mobile checkout</summary>
<br />

<table>
<tr>
<td width="50%"><img src="docs/media/screenshots/02-features.png" alt="Features page" /><br /><sub>Features</sub></td>
<td width="50%"><img src="docs/media/screenshots/04-register.png" alt="Registration page" /><br /><sub>Registration</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/media/screenshots/18-login.png" alt="Login page" /><br /><sub>Login</sub></td>
<td width="50%"><img src="docs/media/screenshots/07-api-keys.png" alt="API keys page" /><br /><sub>API keys — rotate &amp; revoke</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/media/screenshots/11-api-logs.png" alt="API logs" /><br /><sub>API logs (metadata only — never bodies or keys)</sub></td>
<td width="50%"><img src="docs/media/screenshots/06-projects.png" alt="Projects" /><br /><sub>Projects</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/media/screenshots/13-checkout-processing.png" alt="Checkout processing state" /><br /><sub>Processing — the backend decides the outcome, the page just polls</sub></td>
<td width="50%" align="center"><img src="docs/media/screenshots/15-checkout-mobile.png" alt="Mobile hosted checkout" width="240" /><br /><sub>Mobile checkout</sub></td>
</tr>
</table>

</details>

---

## ✨ Features

| | |
|---|---|
| 🔐 **Accounts** | Firebase Authentication: email + password, email verification, password reset, protected dashboard, account-deletion workflow. |
| 🗂 **Projects** | Many isolated projects per user — each with its own keys, orders, webhooks and logs. Archive, restore, delete with typed confirmation. **Test mode only.** |
| 🔑 **API keys** | `money_test_pk_…` (publishable) and `money_test_sk_…` (secret). Secret shown **once**, stored only as an HMAC hash, rotatable and revocable, with last-used timestamps. |
| 🧾 **Payment API** | Versioned REST API under `/api/v1` — orders, simulation, cancel, refunds, transactions, webhooks — with validation, idempotency keys and proper status codes. |
| 🎛 **Simulator** | 10 deterministic scenarios: instant success, success after 5 s, pending 30 s, pending until expiry, failure, timeout, cancelled, expired, reversed, duplicate attempt. **The backend owns all timers.** |
| 🧠 **State machine** | Explicit states and permitted transitions; every change appends an **immutable, gapless event**; transactional and safe under concurrency. |
| 🛒 **Hosted checkout** | Unique link per order, no customer account, mobile-friendly, unmistakably sandbox. Never asks for a PIN, CVV, OTP or bank login. |
| 📨 **Webhooks** | HMAC-SHA256 signatures, timestamps, unique event IDs, delivery log, response previews, attempt counts, manual retry, **SSRF-hardened** destinations. |
| ↩️ **Refunds** | Full or partial; cumulative refunds can never exceed the original amount (also under concurrent requests); failed-refund simulation. |
| 📊 **Dashboard** | Overview stats from real data, filters (status, amount, date, merchant ID), transaction timelines, refunds, webhooks, API logs. |
| 📚 **Docs & samples** | In-app docs, copy-paste examples in JS / TS / Node.js / Python / cURL / HTML, and a **runnable sample merchant** website. |
| 🛡 **Admin console** | Server-side role (Firebase custom claim): users, projects, audit log, abuse &amp; support queue, failed deliveries, suspension, deletion processing. |
| ⚖️ **Legal drafts** | Terms, Privacy, Acceptable Use, Simulation Disclaimer, Data Retention, Security Disclosure — flagged for legal review, no invented company details. |

---

## 🧭 How it works

### The integration in one picture

```mermaid
sequenceDiagram
    autonumber
    participant C as Customer
    participant M as Your backend
    participant API as MONEY /api/v1
    participant CO as Hosted checkout
    M->>API: POST /payment-orders (secret key + Idempotency-Key)
    API-->>M: 201 { id, status: CREATED, checkout_url }
    M-->>C: redirect to checkout_url
    C->>CO: opens checkout, picks a SIMULATED outcome
    CO->>API: backend applies the scenario (state machine)
    API-->>M: signed webhook payment.succeeded
    CO-->>C: result screen, then your return_url
    M->>API: GET /payment-orders/:id (server-to-server)
    API-->>M: status SUCCESS, fulfil the order
```

> A browser redirect is **never** proof of payment. Confirm with the signed webhook and/or a server-to-server `GET`.

### Payment state machine

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> PROCESSING
    CREATED --> PENDING
    CREATED --> CANCELLED
    CREATED --> EXPIRED
    PENDING --> PROCESSING
    PENDING --> SUCCESS
    PENDING --> FAILED
    PENDING --> CANCELLED
    PENDING --> EXPIRED
    PROCESSING --> SUCCESS
    PROCESSING --> FAILED
    PROCESSING --> PENDING
    PROCESSING --> CANCELLED
    SUCCESS --> REVERSED
    SUCCESS --> REFUNDED : fully refunded
    FAILED --> [*]
    CANCELLED --> [*]
    EXPIRED --> [*]
    REVERSED --> [*]
    REFUNDED --> [*]
```

Anything not drawn is rejected with `409 invalid_state_transition`. A *partial* refund keeps the order in `SUCCESS` and raises `refunded_amount`.

### Architecture

```mermaid
flowchart LR
    subgraph Browser
      UI["Next.js pages<br/>React + Tailwind"]
    end
    subgraph Vercel["Next.js on Vercel (serverless)"]
      D["/api/dashboard<br/>Firebase ID token"]
      V["/api/v1<br/>secret API key"]
      K["/api/checkout<br/>order token"]
      A["/api/admin<br/>admin claim"]
      S["services/money.ts<br/>MoneyService"]
      CORE["lib/core<br/>state machine, keys, signing,<br/>SSRF, validation"]
    end
    subgraph Firebase["Firebase (free tier)"]
      AUTH[("Authentication")]
      DB[("Firestore<br/>Admin SDK only")]
    end
    MB["Merchant backend"]
    UI --> D
    UI --> K
    UI --> A
    MB --> V
    D --> S
    V --> S
    K --> S
    A --> S
    S --> CORE
    S --> DB
    D -. verify ID token .-> AUTH
    A -. verify ID token .-> AUTH
    S -- signed webhooks --> MB
```

The payment engine is **framework-free** and talks to storage through a tiny `DocStore` interface, so the entire lifecycle is tested without Firebase. Full detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Simulation scenarios

| Scenario ID | What happens |
|---|---|
| `success` | Processing → success immediately |
| `success_after_5s` | Processing, then success once 5 s have elapsed (backend-timed) |
| `pending_30s` | Pending, then delayed confirmation after 30 s |
| `pending_until_expiry` | Stays pending until the order expires |
| `failure` | Declined by the simulator (`SIMULATED_DECLINE`) |
| `timeout` | Processing, then fails with `SIMULATED_TIMEOUT` after 10 s |
| `cancelled` | Customer abandons the payment |
| `expired` | Session expires before completion |
| `reversed` | Succeeds, then is reversed |
| `duplicate` | Succeeds; a second attempt is rejected and recorded (no duplicate financial event) |

> **Free-tier honesty:** there is no background scheduler. Delayed outcomes and expiry are applied the next time the order is *read* (API call, checkout poll or dashboard load), inside a transaction that also writes the event and fires the webhook. Details: [`docs/PAYMENT_LIFECYCLE.md`](docs/PAYMENT_LIFECYCLE.md).

---

## 🚀 Quick start

### Requirements

- **Node.js 20.11+** (22 LTS recommended) and npm
- A free **Firebase** project (Authentication + Firestore) — no credit card. Step-by-step guide: [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md)
- Windows PowerShell, macOS or Linux — no IDE required

### Set up (Windows PowerShell)

```powershell
cd MONEY-Phase-1
npm install
Copy-Item .env.example .env.local

# generate MONEY's two server secrets and paste them into .env.local
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])   # MONEY_ENCRYPTION_KEY
-join ((48..57)+(97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })                 # MONEY_KEY_PEPPER

# add your Firebase values (see docs/FIREBASE_SETUP.md), then:
npm run dev        # -> http://localhost:3000
```

<details>
<summary><b>macOS / Linux equivalents</b></summary>

```bash
cp .env.example .env.local
openssl rand -base64 32     # MONEY_ENCRYPTION_KEY
openssl rand -hex 24        # MONEY_KEY_PEPPER
npm run dev
```
</details>

> Without Firebase values the site still starts: public pages work and sign-in / dashboard pages show a clear setup screen. **MONEY never fakes authentication or storage.**

### Environment variables

| Variable | Purpose | Secret? |
|---|---|:-:|
| `NEXT_PUBLIC_APP_URL` | Base URL used to build checkout links | no |
| `NEXT_PUBLIC_FIREBASE_API_KEY` · `_AUTH_DOMAIN` · `_PROJECT_ID` · `_APP_ID` | Firebase web config | no |
| `FIREBASE_PROJECT_ID` · `FIREBASE_CLIENT_EMAIL` · `FIREBASE_PRIVATE_KEY` | Firebase Admin service account | **yes** |
| `MONEY_ENCRYPTION_KEY` | AES-256-GCM key for stored webhook secrets (32 bytes, base64) | **yes** |
| `MONEY_KEY_PEPPER` | HMAC pepper for API-key hashes | **yes** |
| `*_EMULATOR_*` | Optional Firebase Emulator Suite mode | no |

### Verify the project first

```powershell
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
npm test            # 33 tests - no Firebase needed
npm run build       # production build
npm run check       # all of the above, in order
```

### Try the full flow with the sample merchant

```powershell
# terminal 1
npm run dev
# create a project in the dashboard and copy the secret key (shown once)

# terminal 2
$env:MONEY_SECRET_KEY = "money_test_sk_..."
npm run demo:merchant        # -> http://localhost:4242
```

Click **Buy now**, choose an outcome on the MONEY checkout, and land on a page whose status was fetched **server-to-server**. Webhooks need a public HTTPS URL (MONEY blocks localhost by design) — use Cloudflare Tunnel or ngrok. See [`examples/merchant-demo`](examples/merchant-demo/README.md).

### Make yourself an admin

```powershell
node --env-file=.env.local scripts/grant-admin.mjs you@example.com   # sign out & back in, then open /admin
```

---

## 🔌 API at a glance

Base path `/api/v1` · `Authorization: Bearer money_test_sk_…` · amounts are integers in **paise** (₹500.00 = `50000`).

```bash
curl -X POST http://localhost:3000/api/v1/payment-orders \
  -H "Authorization: Bearer $MONEY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: order-10001-attempt-1" \
  -d '{
    "amount": 50000,
    "currency": "INR",
    "description": "Demo product purchase",
    "merchant_order_id": "ORDER-10001",
    "return_url": "http://localhost:4242/payment-result"
  }'
```

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/payment-orders` | Create an order → `checkout_url` |
| `GET` | `/payment-orders` · `/payment-orders/:id` | List / retrieve (server-to-server truth) |
| `POST` | `/payment-orders/:id/simulate` | Drive an order to a chosen outcome |
| `POST` | `/payment-orders/:id/cancel` | Cancel an open order |
| `POST` · `GET` | `/refunds` · `/refunds/:id` | Create / retrieve a simulated refund |
| `GET` | `/transactions` · `/transactions/:id` | History, with immutable events |
| `POST` · `GET` · `DELETE` | `/webhooks` · `/webhooks/:id` | Manage webhook endpoints |

Errors share one shape — `{ "error": { "code", "message", "details?" } }` — and `Idempotency-Key` makes retries safe. Full reference: [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md).

### Verifying a webhook (TypeScript)

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMoneySignature(header: string | null, rawBody: string, secret: string, toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;          // replay protection
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

Always verify against the **raw** body and de-duplicate on `event.id`. Python, Node/Express and browser (`money.js`, publishable key only) examples are in the in-app docs at `/docs`.

---

## 🛡 Security

Security is mandatory even though every transaction is simulated. **MONEY has not been independently audited or certified.**

| Area | What's implemented |
|---|---|
| Authentication | Firebase Auth; ID token verified server-side on every call; unverified email blocked |
| Authorisation | Data path rooted at the verified `uid`; keys bound to one project; cross-user access tested |
| API keys | 256-bit random; **HMAC hash only**; shown once; rotate / revoke; never returned in lists |
| Webhooks | HMAC-SHA256 + timestamp; secrets AES-256-GCM encrypted at rest; unique event IDs |
| SSRF | https only; port allow-list; private / reserved / mapped IPv4 + IPv6 blocked; DNS checked at creation **and** delivery; connect-time address pinning; no redirects; 4 s timeout |
| Redirects | `return_url` must match the project's allow-list — no open redirects |
| Concurrency | Firestore transactions + idempotency records; tested with parallel requests |
| Transport & browser | CSP, HSTS, `nosniff`, frame-deny, strict referrer policy; React-escaped output |
| Data | Firestore rules deny **all** client access; Admin SDK only; sanitised errors; audit logs |

Known limitations (per-instance rate limits, no durable webhook queue, …) are documented honestly in [`SECURITY.md`](SECURITY.md) and [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md). Report vulnerabilities as described there.

---

## 🧱 Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) · React 19 · TypeScript (strict) |
| Styling | Tailwind CSS 3.4 · palette: **Golden Caramel** `#B28558`, **Smoked Moss** `#322C25`, **Dark Sangria** `#2C0E11` |
| Auth & data | Firebase Authentication · Firestore (Admin SDK, server-only) |
| Hosting | Vercel (serverless) · GitHub |
| Tests | Node's built-in test runner via `tsx` — zero extra test dependencies |

### Project structure

```text
MONEY-Phase-1/
├── app/                    Pages and route handlers (App Router)
│   ├── (site)/             Marketing, docs, legal
│   ├── (auth)/             Login, register, reset
│   ├── dashboard/          Developer dashboard
│   ├── checkout/[orderId]/ Hosted checkout
│   ├── admin/              Admin console
│   └── api/                v1, dashboard, checkout, admin, support, health
├── components/             UI building blocks
├── lib/core/               Framework-free engine: state machine, keys, signing, SSRF, validation
├── lib/server/             Firebase Admin, auth, router, rate limiting
├── services/money.ts       Business logic over the DocStore interface
├── tests/                  Unit + lifecycle tests (scenarios A-H)
├── examples/merchant-demo/ Runnable sample merchant website
├── docs/                   Architecture, schema, API, lifecycle, security, setup, roadmap, media
├── tools/media/            Generator for the screenshots and video above
├── public/money.js         Publishable-key browser helper
└── firestore.rules         Deny-all client rules
```

---

## 🧪 Testing

```powershell
npm test
```

**33 tests pass**, covering the state machine, key handling, webhook signing, SSRF protection, validation, and these end-to-end lifecycle scenarios against the real service:

| | Scenario |
|:-:|---|
| A | Create → checkout → success → signed webhook (verified like a merchant would) → dashboard stats |
| B | Create → failure → webhook → dashboard shows failure |
| C | Pending → delayed success (backend-owned timer) → webhook → dashboard updates |
| D | Partial refund(s) → refund success → transaction and refund history updated |
| E | Another user's project / orders / keys → access denied everywhere |
| F | Duplicate and concurrent requests → no duplicate financial event |
| G | Unsafe webhook destination → rejected (at creation and at delivery) |
| H | Refund above the refundable amount → rejected (also under concurrency) |

Real captured output: [`docs/TEST_RESULTS.md`](docs/TEST_RESULTS.md) · Guide: [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md).

---

## ☁️ Deploying (free tier)

1. `npm run check` locally.
2. Push to GitHub (never commit `.env.local` or service-account JSON — `.gitignore` already blocks them).
3. Import the repo in **Vercel**, add the environment variables from the table above, deploy.
4. Add the Vercel domain to Firebase Authentication → *Authorized domains*.

Complete walkthrough: [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md). "Free" is subject to Vercel's and Firebase's current quotas and terms — it is not unlimited, and quota errors surface as clear `429` / `503` responses.

---

## 📌 Project status — read this first

This repository was built in an environment **without network access**, so the verification story is precise rather than rosy:

| Area | State |
|---|---|
| Payment engine (state machine, keys, signing, SSRF, refunds, idempotency, concurrency) | ✅ **33 / 33 tests pass**; strict type-check clean |
| Sample merchant site | ✅ Run end-to-end against a fake MONEY API (8 / 8 checks) |
| Web UI | ✅ Rendered in headless Chromium through the media harness with **zero browser errors** (screenshots and video above) · ⚠️ not yet compiled by `next build` |
| API route handlers | ⚠️ Written and type-checked against loose stubs; **not run over HTTP**. Business logic behind them is tested |
| Firebase (Auth, Firestore adapter, rules, emulator) | ⚠️ **Not exercised** — needs your Firebase project |
| `npm install` / `npm run lint` / `npm run build` | ⚠️ **Not run** — do `npm install && npm run check` first and expect small fixes |
| `package-lock.json` | Absent — `npm install` creates it; commit it |

Details and the full limitation list: [`docs/STATUS.md`](docs/STATUS.md).

---

## 🗺 Roadmap

- [x] Phase 1 core: accounts, projects, keys, API, simulator, checkout, webhooks, refunds, dashboard, docs, admin, legal drafts
- [ ] First real `npm install && npm run check`, Firebase wiring, Emulator run, Playwright end-to-end tests
- [ ] Lawyer review of the legal drafts; choose a licence
- [ ] Global rate limiting, CAPTCHA, retention jobs, backups
- [ ] Durable webhook retries (queue / cron on a paid tier), webhook test-ping, SDK packages, OpenAPI spec
- [ ] **Phase 2** — MONEY Pay (controlled test environment) · **Phase 3** — RBI / NPCI authorisations and banking partnerships

Full list: [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md).

---

## 📖 Documentation

| Document | What's inside |
|---|---|
| [`docs/STATUS.md`](docs/STATUS.md) | Exactly what is verified, what isn't, known limitations |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Modules, request flow, design decisions |
| [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | Firestore structure and rules of the model |
| [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) | Endpoints, validation, error codes, webhooks |
| [`docs/PAYMENT_LIFECYCLE.md`](docs/PAYMENT_LIFECYCLE.md) | States, transitions, scenarios, concurrency |
| [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md) | Free Firebase project, step by step, plus emulator |
| [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md) | GitHub → Vercel walkthrough and serverless notes |
| [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) | Controls and honest limitations |
| [`docs/LEGAL_POLICIES.md`](docs/LEGAL_POLICIES.md) | Six first-draft policies (require legal review) |
| [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md) · [`docs/TEST_RESULTS.md`](docs/TEST_RESULTS.md) | What the tests cover; real captured output |
| [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md) | Before first use, before launch, backlog, Phases 2–3 |
| [`docs/YOUPI_PG_ASSESSMENT.md`](docs/YOUPI_PG_ASSESSMENT.md) | Review of the reference project and the licensing decision |

---

## ⚖️ Legal &amp; compliance

- MONEY Phase 1 is a software-development and **payment-simulation** platform. It does **not** process real payments, transfer money, collect or settle customer funds, operate as a bank, a licensed Payment Aggregator or a UPI TPAP, or connect to NPCI's live UPI network.
- The legal documents are **first drafts, not legal advice**; they contain labelled placeholders (company name, address, grievance officer, jurisdiction) and must be reviewed by qualified Indian counsel before any public commercial operation.
- Users must not present simulated transactions as real payments or use MONEY to deceive anyone.

## 🤝 Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md). In short: keep payment logic in `lib/core` / `services`, add a test, run `npm run check`, never add real-payment behaviour, and never weaken a safety rule without a test.

## 📄 Licence

No open-source licence has been chosen yet (`"license": "UNLICENSED"`). Decide deliberately before publishing.

## 🙏 Acknowledgements

The *YouPI-PG* project was inspected as architectural reference only. Its licensing was unclear, so **no code from it is used** — MONEY is an independent implementation. See [`docs/YOUPI_PG_ASSESSMENT.md`](docs/YOUPI_PG_ASSESSMENT.md).

<div align="center">

<br />

<img src="docs/media/logo.svg" alt="MONEY" width="56" />

**Your money. Your move.**

<sub>Free payment infrastructure for every developer · Simulated payments only</sub>

</div>
