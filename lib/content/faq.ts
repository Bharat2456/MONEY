export const FAQ = [
  { q: 'Is MONEY a real payment gateway?', a: 'No. MONEY Phase 1 is a developer sandbox that simulates payments. It does not process real payments, move money, settle funds, or connect to UPI, NPCI or any bank.' },
  { q: 'Is it approved by the RBI or NPCI?', a: 'No. MONEY is not RBI-approved, NPCI-certified, a bank, an authorised payment aggregator or a UPI app. Anyone who needs real payments must use an authorised provider.' },
  { q: 'Is it really free?', a: 'Yes for the sandbox, with fair-use limits (projects, keys, webhook endpoints, request rates). It runs on free-tier infrastructure, so capacity is not unlimited and may be throttled when free quotas are reached.' },
  { q: 'What outcomes can I test?', a: 'Success, failure, pending, cancelled, expired, duplicate attempts, network timeout, delayed confirmation, reversal, and refunds that succeed or fail.' },
  { q: 'Do I need a company, GST number or bank account?', a: 'No. You only need an email address. Nothing in the sandbox involves a real bank or merchant approval.' },
  { q: 'Can I use my secret key in my frontend?', a: 'Never. Secret test keys (money_test_sk_…) belong on your backend. In the browser use the publishable key (money_test_pk_…) with the hosted checkout.' },
  { q: 'How do I know a payment really succeeded?', a: 'Not from the browser redirect. Verify the signed webhook and/or call GET /api/v1/payment-orders/:id from your server.' },
  { q: 'Can I receive webhooks on localhost?', a: 'MONEY blocks private and localhost destinations for safety (SSRF protection). Use a public HTTPS tunnel such as Cloudflare Tunnel or ngrok, or a service like webhook.site, while developing.' },
  { q: 'Will delayed payments still complete if I close the browser?', a: 'Yes — timing is owned by the backend. Because the free tier has no background queue, a due transition is applied the next time the order is read (API call, checkout poll or dashboard load) and its webhook is sent then.' },
  { q: 'What happens to my data?', a: 'See the Privacy Policy and Data Retention Policy. You can delete projects or request account deletion at any time.' },
];
