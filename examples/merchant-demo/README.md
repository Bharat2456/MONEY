# Sample merchant — MONEY integration demo

A dependency-free Node.js (18+) website that shows the complete integration: create order → hosted checkout → server-side verification → signed webhooks.

```powershell
# Terminal 1 — MONEY itself (project root)
npm run dev

# In the MONEY dashboard: create a project and copy the secret key (shown once).
# Terminal 2 — the demo merchant (project root)
$env:MONEY_SECRET_KEY = "money_test_sk_..."
node examples/merchant-demo/server.mjs      # http://localhost:4242
```

Open http://localhost:4242, click **Buy now**, choose an outcome on the MONEY checkout, and you return to a page whose status was fetched **server-to-server**.

## Webhooks while developing
MONEY refuses to deliver to `localhost`/private addresses (SSRF protection), so expose port 4242 over a public https tunnel (Cloudflare Tunnel, ngrok, …), then register `https://<tunnel>/webhooks/money` on the dashboard's Webhooks page and run:

```powershell
$env:MONEY_WEBHOOK_SECRET = "whsec_..."   # shown once when you add the endpoint
```

`verify.mjs` is the signature check; `server.mjs` also de-duplicates by `event.id`.
