export interface LegalDoc { slug: string; title: string; summary: string; sections: Array<{ h: string; p: string[] }> }

export const LAUNCH_NOTICE =
  'Launch-readiness notice: these documents are first drafts prepared for a Phase 1 developer sandbox. They are not legal advice and must be reviewed and adapted by qualified Indian legal counsel before any public commercial operation.';

const CO = '[COMPANY LEGAL NAME — to be completed]';
const ADDR = '[REGISTERED ADDRESS — to be completed]';
const EMAIL = '[LEGAL/SUPPORT EMAIL — to be completed]';

export const SIMULATION_STATEMENT = [
  'MONEY Phase 1 is a software development and payment simulation platform. It is not a payment gateway in the regulated sense.',
  'MONEY does not process real payments, transfer actual money, collect or settle customer funds, operate as a bank, operate as a licensed Payment Aggregator, operate as a UPI Third-Party Application Provider (TPAP), connect to NPCI’s live UPI network, or guarantee any real-world payment outcome.',
  'Every transaction, receipt, payment reference, refund, QR representation and notification generated in the sandbox is simulated. MONEY has not been approved, certified or authorised by the RBI, NPCI or any bank.',
];

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: 'terms', title: 'Terms and Conditions', summary: 'The agreement between you and the MONEY operator for using the Phase 1 sandbox.',
    sections: [
      { h: '1. Who we are', p: [`MONEY (“we”, “us”) is operated by ${CO}, ${ADDR}. Contact: ${EMAIL}. Company registration details (CIN, GSTIN) will be added here once an entity is formed.`] },
      { h: '2. What the service is', p: SIMULATION_STATEMENT },
      { h: '3. Accounts and your responsibilities', p: ['You must provide accurate registration details, verify your email address and keep your credentials safe. You are responsible for activity under your account.', 'Secret API keys belong on your backend servers only. Never place a secret key in a web page, mobile app or public repository. If a key is exposed, revoke or rotate it immediately.'] },
      { h: '4. Acceptable use', p: ['You must follow the Acceptable Use Policy. You may not present simulated transactions as real payments, or use MONEY to deceive customers, merchants, investors or any third party.'] },
      { h: '5. Free plan and availability', p: ['The free plan has usage limits (for example numbers of projects, keys and webhook endpoints, and request rates). The service is provided on an “as available” basis, may depend on third-party free tiers that have their own quotas, and may be interrupted, limited or changed.'] },
      { h: '6. Data processing', p: ['We process account and project data to operate the sandbox, as described in the Privacy Policy. Do not submit real card numbers, UPI PINs, bank credentials, OTPs or other sensitive financial data; the sandbox neither needs nor protects them.'] },
      { h: '7. Security responsibilities', p: ['We apply reasonable technical measures described in our security documentation. No independent security certification has been obtained. You are responsible for securing your own systems, verifying webhook signatures and confirming payment status server-to-server.'] },
      { h: '8. Intellectual property', p: ['The MONEY software, name and branding belong to their respective owner. You keep ownership of your own code and project content and grant us the limited right to host and process it to provide the service.'] },
      { h: '9. Suspension and termination', p: ['We may suspend or terminate accounts that breach these terms or the Acceptable Use Policy, or that endanger the service. You may request deletion of your account at any time from Settings.'] },
      { h: '10. Liability', p: ['The service is a testing tool provided without warranties of fitness for a particular purpose. To the extent permitted by law, we are not liable for indirect or consequential loss arising from use of a simulator. Nothing in these terms limits liability that cannot be limited under applicable law, including for fraud or wilful misconduct.'] },
      { h: '11. Complaints', p: [`Send complaints or questions to ${EMAIL}. We will acknowledge them within a reasonable period and aim to resolve them promptly. [Grievance officer details — to be completed on legal review.]`] },
      { h: '12. Changes to these terms', p: ['We may update these terms. We will post the new version with its effective date and, for material changes, notify registered users by email.'] },
      { h: '13. Governing law', p: ['These terms are intended to be governed by the laws of India. [Jurisdiction and venue — city and courts to be completed on legal review.]'] },
    ],
  },
  {
    slug: 'privacy', title: 'Privacy Policy', summary: 'What data MONEY collects, why, where it is stored and your choices.',
    sections: [
      { h: '1. Data we collect', p: ['Account data: email address, Firebase user ID and verification status. Project data: project names, descriptions, URLs, API-key hashes (never the plaintext secret), webhook endpoints, simulated orders, transactions, refunds, delivery logs and API request metadata (method, path, status, duration — not request bodies).', 'Support messages you send us, and standard server logs.'] },
      { h: '2. Why we use it', p: ['To authenticate you, run the sandbox, show your dashboard, deliver webhooks you configure, prevent abuse and respond to support requests.'] },
      { h: '3. Where it is stored', p: ['Authentication and data are stored with Google Firebase (Authentication and Firestore) and the app is hosted on Vercel. [Data region and sub-processor list — to be confirmed on legal review.]'] },
      { h: '4. Sharing', p: ['We do not sell personal data. Webhook payloads are sent only to endpoints you configure. We may disclose data where required by law.'] },
      { h: '5. Retention', p: ['See the Data Retention Policy. You can request deletion of your account and project data from Settings.'] },
      { h: '6. Your rights', p: ['Subject to applicable Indian law, including the Digital Personal Data Protection Act, 2023 as it comes into force, you may request access, correction and erasure of your personal data by contacting us.'] },
      { h: '7. Security', p: ['Secret keys are stored only as keyed hashes; webhook secrets are encrypted at rest; access is restricted by server-side authorisation. No system is perfectly secure and we cannot guarantee absolute security.'] },
      { h: '8. Contact', p: [`${CO}, ${ADDR}, ${EMAIL}. [Data protection / grievance contact — to be completed.]`] },
    ],
  },
  {
    slug: 'acceptable-use', title: 'Acceptable Use Policy', summary: 'What you may and may not do with the sandbox.',
    sections: [
      { h: 'You may', p: ['Build and test payment flows, demos, hackathon projects, teaching material and prototypes using simulated payments.'] },
      { h: 'You must not', p: ['Present simulated transactions, receipts or refunds as real payments or use them to deceive any customer, merchant, investor or other third party.', 'Test stolen credentials, commit fraud, attack payment providers or other systems, or perform unauthorised security testing.', 'Point webhooks at internal networks, localhost, private IP ranges or cloud metadata services, or otherwise attempt server-side request forgery.', 'Attempt to access other users’ data, bypass rate limits, or overload the service.', 'Submit real card numbers, UPI PINs, OTPs or bank credentials.'] },
      { h: 'Enforcement', p: ['We may rate-limit, suspend or terminate accounts that breach this policy and may report unlawful activity to the relevant authorities. To report abuse, use the Contact page.'] },
    ],
  },
  {
    slug: 'disclaimer', title: 'Sandbox and Payment Simulation Disclaimer', summary: 'MONEY simulates payments. Nothing here moves real money.',
    sections: [
      { h: 'Simulation only', p: SIMULATION_STATEMENT },
      { h: 'No real UPI artefacts', p: ['MONEY does not create UPI intent links or payable UPI QR codes, and never asks for a UPI PIN, card CVV, OTP or bank login. Any QR-style representation is an internal sandbox session identifier that cannot start a real transaction.'] },
      { h: 'Do not mislead others', p: ['You must not present MONEY test results as evidence of real payments, settlement, compliance or regulatory approval.'] },
      { h: 'Verify server-to-server', p: ['A browser redirect is never proof of payment. Always confirm status by calling the API from your backend or by verifying signed webhooks.'] },
      { h: 'Before real payments', p: ['Real-money payments require an authorised payment provider and applicable RBI/NPCI arrangements. MONEY is not a substitute for them.'] },
    ],
  },
  {
    slug: 'data-retention', title: 'Data Retention Policy', summary: 'How long MONEY keeps data. Drafted targets — enforcement jobs are listed as remaining work.',
    sections: [
      { h: 'Account and project data', p: ['Kept while your account is active. Deleting a project removes its keys, orders, transactions, refunds, webhooks, deliveries and logs.'] },
      { h: 'Account deletion', p: ['When you request deletion, an administrator reviews and processes it; your Authentication record and all project data are then erased. Audit-log entries that contain only identifiers and action names may be kept for security purposes.'] },
      { h: 'Logs', p: ['API request metadata and webhook delivery records are intended to be kept for a limited period (target: 30 days). Automatic expiry is not implemented in Phase 1 and is listed in the roadmap.'] },
      { h: 'Support messages', p: ['Kept as long as needed to resolve the request and for a reasonable period afterwards.'] },
    ],
  },
  {
    slug: 'security-disclosure', title: 'Security Disclosure Policy', summary: 'How to report a vulnerability responsibly.',
    sections: [
      { h: 'Reporting', p: [`If you find a vulnerability, email ${EMAIL} with steps to reproduce. Please do not access other users’ data, degrade the service or publicly disclose the issue before we have had a reasonable chance to fix it.`] },
      { h: 'What to expect', p: ['We will acknowledge reports, investigate and keep you informed. MONEY is a free, early-stage sandbox and does not currently run a paid bounty programme.'] },
      { h: 'Out of scope', p: ['Denial-of-service testing, social engineering, spam, and findings that depend on already-compromised user devices or leaked secret keys.'] },
      { h: 'Status', p: ['MONEY has not been independently security-certified or audited.'] },
    ],
  },
];

export const getLegal = (slug: string) => LEGAL_DOCS.find((d) => d.slug === slug);
