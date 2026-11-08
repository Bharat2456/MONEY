# MONEY — Legal Policies (first drafts)

> **Launch-readiness notice: these documents are first drafts prepared for a Phase 1 developer sandbox. They are not legal advice and must be reviewed and adapted by qualified Indian legal counsel before any public commercial operation.**

This file is generated from `lib/content/legal.ts` (`npm run docs:legal`). Edit the TypeScript source, not this file.

---

## Terms and Conditions

_The agreement between you and the MONEY operator for using the Phase 1 sandbox._

### 1. Who we are

MONEY (“we”, “us”) is operated by [COMPANY LEGAL NAME — to be completed], [REGISTERED ADDRESS — to be completed]. Contact: [LEGAL/SUPPORT EMAIL — to be completed]. Company registration details (CIN, GSTIN) will be added here once an entity is formed.

### 2. What the service is

MONEY Phase 1 is a software development and payment simulation platform. It is not a payment gateway in the regulated sense.

MONEY does not process real payments, transfer actual money, collect or settle customer funds, operate as a bank, operate as a licensed Payment Aggregator, operate as a UPI Third-Party Application Provider (TPAP), connect to NPCI’s live UPI network, or guarantee any real-world payment outcome.

Every transaction, receipt, payment reference, refund, QR representation and notification generated in the sandbox is simulated. MONEY has not been approved, certified or authorised by the RBI, NPCI or any bank.

### 3. Accounts and your responsibilities

You must provide accurate registration details, verify your email address and keep your credentials safe. You are responsible for activity under your account.

Secret API keys belong on your backend servers only. Never place a secret key in a web page, mobile app or public repository. If a key is exposed, revoke or rotate it immediately.

### 4. Acceptable use

You must follow the Acceptable Use Policy. You may not present simulated transactions as real payments, or use MONEY to deceive customers, merchants, investors or any third party.

### 5. Free plan and availability

The free plan has usage limits (for example numbers of projects, keys and webhook endpoints, and request rates). The service is provided on an “as available” basis, may depend on third-party free tiers that have their own quotas, and may be interrupted, limited or changed.

### 6. Data processing

We process account and project data to operate the sandbox, as described in the Privacy Policy. Do not submit real card numbers, UPI PINs, bank credentials, OTPs or other sensitive financial data; the sandbox neither needs nor protects them.

### 7. Security responsibilities

We apply reasonable technical measures described in our security documentation. No independent security certification has been obtained. You are responsible for securing your own systems, verifying webhook signatures and confirming payment status server-to-server.

### 8. Intellectual property

The MONEY software, name and branding belong to their respective owner. You keep ownership of your own code and project content and grant us the limited right to host and process it to provide the service.

### 9. Suspension and termination

We may suspend or terminate accounts that breach these terms or the Acceptable Use Policy, or that endanger the service. You may request deletion of your account at any time from Settings.

### 10. Liability

The service is a testing tool provided without warranties of fitness for a particular purpose. To the extent permitted by law, we are not liable for indirect or consequential loss arising from use of a simulator. Nothing in these terms limits liability that cannot be limited under applicable law, including for fraud or wilful misconduct.

### 11. Complaints

Send complaints or questions to [LEGAL/SUPPORT EMAIL — to be completed]. We will acknowledge them within a reasonable period and aim to resolve them promptly. [Grievance officer details — to be completed on legal review.]

### 12. Changes to these terms

We may update these terms. We will post the new version with its effective date and, for material changes, notify registered users by email.

### 13. Governing law

These terms are intended to be governed by the laws of India. [Jurisdiction and venue — city and courts to be completed on legal review.]

---

## Privacy Policy

_What data MONEY collects, why, where it is stored and your choices._

### 1. Data we collect

Account data: email address, Firebase user ID and verification status. Project data: project names, descriptions, URLs, API-key hashes (never the plaintext secret), webhook endpoints, simulated orders, transactions, refunds, delivery logs and API request metadata (method, path, status, duration — not request bodies).

Support messages you send us, and standard server logs.

### 2. Why we use it

To authenticate you, run the sandbox, show your dashboard, deliver webhooks you configure, prevent abuse and respond to support requests.

### 3. Where it is stored

Authentication and data are stored with Google Firebase (Authentication and Firestore) and the app is hosted on Vercel. [Data region and sub-processor list — to be confirmed on legal review.]

### 4. Sharing

We do not sell personal data. Webhook payloads are sent only to endpoints you configure. We may disclose data where required by law.

### 5. Retention

See the Data Retention Policy. You can request deletion of your account and project data from Settings.

### 6. Your rights

Subject to applicable Indian law, including the Digital Personal Data Protection Act, 2023 as it comes into force, you may request access, correction and erasure of your personal data by contacting us.

### 7. Security

Secret keys are stored only as keyed hashes; webhook secrets are encrypted at rest; access is restricted by server-side authorisation. No system is perfectly secure and we cannot guarantee absolute security.

### 8. Contact

[COMPANY LEGAL NAME — to be completed], [REGISTERED ADDRESS — to be completed], [LEGAL/SUPPORT EMAIL — to be completed]. [Data protection / grievance contact — to be completed.]

---

## Acceptable Use Policy

_What you may and may not do with the sandbox._

### You may

Build and test payment flows, demos, hackathon projects, teaching material and prototypes using simulated payments.

### You must not

Present simulated transactions, receipts or refunds as real payments or use them to deceive any customer, merchant, investor or other third party.

Test stolen credentials, commit fraud, attack payment providers or other systems, or perform unauthorised security testing.

Point webhooks at internal networks, localhost, private IP ranges or cloud metadata services, or otherwise attempt server-side request forgery.

Attempt to access other users’ data, bypass rate limits, or overload the service.

Submit real card numbers, UPI PINs, OTPs or bank credentials.

### Enforcement

We may rate-limit, suspend or terminate accounts that breach this policy and may report unlawful activity to the relevant authorities. To report abuse, use the Contact page.

---

## Sandbox and Payment Simulation Disclaimer

_MONEY simulates payments. Nothing here moves real money._

### Simulation only

MONEY Phase 1 is a software development and payment simulation platform. It is not a payment gateway in the regulated sense.

MONEY does not process real payments, transfer actual money, collect or settle customer funds, operate as a bank, operate as a licensed Payment Aggregator, operate as a UPI Third-Party Application Provider (TPAP), connect to NPCI’s live UPI network, or guarantee any real-world payment outcome.

Every transaction, receipt, payment reference, refund, QR representation and notification generated in the sandbox is simulated. MONEY has not been approved, certified or authorised by the RBI, NPCI or any bank.

### No real UPI artefacts

MONEY does not create UPI intent links or payable UPI QR codes, and never asks for a UPI PIN, card CVV, OTP or bank login. Any QR-style representation is an internal sandbox session identifier that cannot start a real transaction.

### Do not mislead others

You must not present MONEY test results as evidence of real payments, settlement, compliance or regulatory approval.

### Verify server-to-server

A browser redirect is never proof of payment. Always confirm status by calling the API from your backend or by verifying signed webhooks.

### Before real payments

Real-money payments require an authorised payment provider and applicable RBI/NPCI arrangements. MONEY is not a substitute for them.

---

## Data Retention Policy

_How long MONEY keeps data. Drafted targets — enforcement jobs are listed as remaining work._

### Account and project data

Kept while your account is active. Deleting a project removes its keys, orders, transactions, refunds, webhooks, deliveries and logs.

### Account deletion

When you request deletion, an administrator reviews and processes it; your Authentication record and all project data are then erased. Audit-log entries that contain only identifiers and action names may be kept for security purposes.

### Logs

API request metadata and webhook delivery records are intended to be kept for a limited period (target: 30 days). Automatic expiry is not implemented in Phase 1 and is listed in the roadmap.

### Support messages

Kept as long as needed to resolve the request and for a reasonable period afterwards.

---

## Security Disclosure Policy

_How to report a vulnerability responsibly._

### Reporting

If you find a vulnerability, email [LEGAL/SUPPORT EMAIL — to be completed] with steps to reproduce. Please do not access other users’ data, degrade the service or publicly disclose the issue before we have had a reasonable chance to fix it.

### What to expect

We will acknowledge reports, investigate and keep you informed. MONEY is a free, early-stage sandbox and does not currently run a paid bounty programme.

### Out of scope

Denial-of-service testing, social engineering, spam, and findings that depend on already-compromised user devices or leaked secret keys.

### Status

MONEY has not been independently security-certified or audited.
