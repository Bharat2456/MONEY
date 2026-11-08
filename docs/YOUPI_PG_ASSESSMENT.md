# YouPI-PG assessment (inspection of the supplied archive)

## Licensing — decision
- No `LICENSE` file exists in the archive, although `README.md` ("See `LICENSE`") says one does.
- `package.json` declares `"license": "Commercial"` and `"author": "Antigravity Systems"`; the README credits "Gaurav (gxurav1710)" as original creator and "Zenuxs" as maintainer. **Ownership and permitted use are unclear and inconsistent.**
- Therefore, per the project directive, **no YouPI-PG source was copied, rebranded or redistributed.** MONEY is an independent implementation. Only general architectural ideas (below) informed the design.
- To reuse any code, obtain written permission or a commercial licence from the actual rights holder first. The GitHub URL supplied in the brief could not be fetched from the build sandbox; the supplied ZIP was inspected instead.

## What YouPI-PG is
A **real-money** self-hosted UPI gateway: npm-workspaces monorepo (`apps/payment-api`, `checkout-portal`, `merchant-admin`, `control-center`, observers for Android/SMS/Gmail, `packages/{core,db,common,merchant-sdk,observer-sdk,youpi-mcp}`), Node 24, SQLite (WAL), payment confirmation by parsing **bank SMS/Gmail alerts**, WhatsApp OTP login, Docker/Render/Vercel entrypoints, 53-point auth matrix scripts.

## Why it conflicts with MONEY Phase 1
MONEY Phase 1 must be a pure **simulator** with no real-money or UPI behaviour, on **Next.js + Firebase + Vercel** (serverless, no SQLite file, no long-running observers, no Android app). YouPI-PG's core concept — detecting real bank credits — is explicitly out of scope and its own audit says it is "NOT APPROVED FOR REAL-MONEY PRODUCTION".

## Reusable _concepts_ (not code)
- Merchant API + hosted checkout + signed webhooks as the product surface.
- **Outbox-style webhook durability** (persist the delivery body/ID before sending; replay after crash). MONEY persists delivery records before each attempt and keeps identical body/ID on retry, but lacks a background drain (needs paid/queue infra — documented).
- Merchant-side rules: verify raw-body signatures, check freshness, de-duplicate by delivery ID, never trust browser callbacks.
- Concerns its audit raises that MONEY addresses at sandbox level: SSRF/DNS rebinding, secret hygiene (no default secrets, generated at setup), duplicate handling, timing/race conditions.

## Quality & debt observations (from docs/audit, not a line-by-line code review)
- Heavy script surface (50+ ad-hoc scripts under `scripts/`), mixed `.js/.cjs/.ts`, a TypeScript `^7.0.2` devDependency and `engines.node >=24.22.1` are bleeding-edge. (Observed from file listings, `package.json` and the markdown docs only; the source was not audited line by line.)
- Own audit lists unresolved blockers: settlement not provable by notification parsing, unassessed attribution races, unreviewed SSRF/DNS-rebinding, historical secret exposure review, PII/OTP retention.
- Android observer, SMS/Gmail parsing and WhatsApp integrations carry regulatory and privacy risk irrelevant to a sandbox.

## Dependencies of note
Runtime: `berryprotocol` (WhatsApp auth) and `qrcode` (payment-api); data layer uses `better-sqlite3` (via the `allowScripts` list in the root `package.json`) and `protobufjs`; a Kotlin/Gradle Android observer app. The core package contains modules for bank SMS/email parsing, statement reconciliation, attribution, queue/recovery engines, a QR generator and a webhook engine. None of this is used by MONEY — in particular MONEY must **never** generate payable UPI QR codes or intents.
