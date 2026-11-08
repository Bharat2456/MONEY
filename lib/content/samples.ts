export const BASE = 'http://localhost:3000';

export const createOrder = {
  curl: `curl -X POST ${BASE}/api/v1/payment-orders \\
  -H "Authorization: Bearer $MONEY_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-10001-attempt-1" \\
  -d '{
    "amount": 50000,
    "currency": "INR",
    "description": "Demo product purchase",
    "merchant_order_id": "ORDER-10001",
    "return_url": "http://localhost:4242/payment-result"
  }'`,
  js: `// Run this on YOUR SERVER only — never in the browser.
const res = await fetch("${BASE}/api/v1/payment-orders", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.MONEY_SECRET_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": "order-10001-attempt-1",
  },
  body: JSON.stringify({
    amount: 50000, // ₹500.00 in paise
    currency: "INR",
    description: "Demo product purchase",
    merchant_order_id: "ORDER-10001",
    return_url: "http://localhost:4242/payment-result",
  }),
});
const order = await res.json();
console.log(order.checkout_url); // send the customer here`,
  ts: `interface PaymentOrder {
  id: string; status: "CREATED" | "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED" | "REVERSED" | "REFUNDED";
  amount: number; currency: string; checkout_url: string; merchant_order_id: string;
}

export async function createOrder(amountPaise: number, merchantOrderId: string): Promise<PaymentOrder> {
  const res = await fetch("${BASE}/api/v1/payment-orders", {
    method: "POST",
    headers: { Authorization: \`Bearer \${process.env.MONEY_SECRET_KEY!}\`, "Content-Type": "application/json", "Idempotency-Key": merchantOrderId },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", description: "Demo product purchase", merchant_order_id: merchantOrderId }),
  });
  if (!res.ok) throw new Error((await res.json()).error.message);
  return res.json() as Promise<PaymentOrder>;
}`,
  node: `// Node.js 18+ (CommonJS). Express example
const express = require("express");
const app = express();
app.use(express.json());

app.post("/checkout", async (req, res) => {
  const r = await fetch("${BASE}/api/v1/payment-orders", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.MONEY_SECRET_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 50000, currency: "INR", merchant_order_id: "ORDER-" + Date.now(), description: "Demo" }),
  });
  const order = await r.json();
  res.redirect(order.checkout_url);
});
app.listen(4242);`,
  python: `import os, requests

r = requests.post(
    "${BASE}/api/v1/payment-orders",
    headers={
        "Authorization": f"Bearer {os.environ['MONEY_SECRET_KEY']}",
        "Idempotency-Key": "order-10001-attempt-1",
    },
    json={
        "amount": 50000,  # paise
        "currency": "INR",
        "description": "Demo product purchase",
        "merchant_order_id": "ORDER-10001",
    },
    timeout=10,
)
r.raise_for_status()
print(r.json()["checkout_url"])`,
};

export const getOrder = {
  curl: `curl ${BASE}/api/v1/payment-orders/ord_xxxxxxxx \\
  -H "Authorization: Bearer $MONEY_SECRET_KEY"`,
  js: `const order = await (await fetch(\`${BASE}/api/v1/payment-orders/\${orderId}\`, {
  headers: { Authorization: \`Bearer \${process.env.MONEY_SECRET_KEY}\` },
})).json();
if (order.status === "SUCCESS") fulfil(order.merchant_order_id); // server-to-server truth`,
  python: `order = requests.get(f"${BASE}/api/v1/payment-orders/{order_id}",
    headers={"Authorization": f"Bearer {os.environ['MONEY_SECRET_KEY']}"}, timeout=10).json()
if order["status"] == "SUCCESS":
    fulfil(order["merchant_order_id"])`,
};

export const simulate = `# Drive an order to a chosen outcome from your backend or tests
curl -X POST ${BASE}/api/v1/payment-orders/ord_xxxxxxxx/simulate \\
  -H "Authorization: Bearer $MONEY_SECRET_KEY" -H "Content-Type: application/json" \\
  -d '{"scenario": "pending_30s"}'

# scenarios: success | success_after_5s | pending_30s | pending_until_expiry | failure
#            timeout | cancelled | expired | reversed | duplicate`;

export const refund = `curl -X POST ${BASE}/api/v1/refunds \\
  -H "Authorization: Bearer $MONEY_SECRET_KEY" -H "Content-Type: application/json" \\
  -d '{"payment_order_id": "ord_xxxxxxxx", "amount": 20000, "reason": "Customer request", "outcome": "success"}'
# omit "amount" to refund the remaining balance; "outcome": "failure" simulates a failed refund`;

export const webhookVerifyTs = `import { createHmac, timingSafeEqual } from "node:crypto";

/** Verify a MONEY webhook. Pass the RAW request body string (not re-serialised JSON). */
export function verifyMoneySignature(header: string | null, rawBody: string, secret: string, toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false; // replay protection
  const expected = createHmac("sha256", secret).update(\`\${t}.\${rawBody}\`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Express: use express.raw({ type: "application/json" }) so req.body is a Buffer
app.post("/webhooks/money", express.raw({ type: "application/json" }), (req, res) => {
  const ok = verifyMoneySignature(req.header("money-signature") ?? null, req.body.toString("utf8"), process.env.MONEY_WEBHOOK_SECRET!);
  if (!ok) return res.status(400).send("bad signature");
  const event = JSON.parse(req.body.toString("utf8"));
  // de-duplicate on event.id — deliveries can repeat
  res.sendStatus(200);
});`;

export const webhookVerifyPy = `import hmac, hashlib, time

def verify(header: str, raw_body: bytes, secret: str, tolerance=300) -> bool:
    parts = dict(p.split("=", 1) for p in header.split(","))
    t = int(parts["t"])
    if abs(time.time() - t) > tolerance:
        return False
    expected = hmac.new(secret.encode(), f"{t}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts["v1"])`;

export const htmlCheckout = `<!-- Server creates the order and returns its id; the browser only needs the PUBLISHABLE key. -->
<button id="pay">Pay ₹500 (simulated)</button>
<script src="${BASE}/money.js"></script>
<script>
  document.getElementById("pay").onclick = async () => {
    const { orderId } = await (await fetch("/create-order", { method: "POST" })).json(); // your backend calls MONEY with the SECRET key
    MONEY.checkout({ key: "money_test_pk_xxxxxxxx", orderId });                           // redirects to the hosted checkout
  };
</script>`;

export const webhookPayload = `{
  "id": "evt_9f2c1a7d3b8e4c5f6a0b1c2d",
  "object": "event",
  "type": "payment.succeeded",
  "api_version": "2026-01-01",
  "created": 1790000000,
  "livemode": false,
  "data": {
    "object": {
      "id": "ord_1a2b3c4d5e6f7a8b9c0d1e2f",
      "object": "payment_order",
      "amount": 50000, "currency": "INR", "status": "SUCCESS",
      "merchant_order_id": "ORDER-10001",
      "simulated": true, "livemode": false
    }
  }
}`;
