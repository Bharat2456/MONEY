/** Static illustration of the product's core loop: request → state machine → signed webhook. One-time sequential reveal. */
export function HeroTicket() {
  const steps = ['Created', 'Processing', 'Success'];
  return (
    <div className="relative">
      <div className="rounded-2xl bg-sangria-950 shadow-ticket">
        <div className="flex items-center justify-between border-b border-moss-800 px-5 py-3 text-xs text-moss-500">
          <span className="font-mono">POST /api/v1/payment-orders</span><span className="rounded-full bg-caramel-500 px-2.5 py-0.5 font-medium text-sangria-900">Test mode</span>
        </div>
        <pre className="overflow-x-auto px-5 pt-4 font-mono text-[12.5px] leading-relaxed text-caramel-200">{`{
  "amount": 50000,
  "currency": "INR",
  "merchant_order_id": "ORDER-10001"
}`}</pre>
        <div className="mx-5 my-4 border-t border-dashed border-moss-700" />
        <div className="px-5 pb-2">
          <p className="mb-3 text-xs text-moss-500">The backend owns the state machine</p>
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <span key={s} style={{ animationDelay: `${0.6 + i * 0.7}s` }} className="lit rounded-full bg-moss-700 px-3 py-1.5 text-xs font-medium text-moss-500 opacity-100 [animation-fill-mode:both]">{s}</span>
            ))}
          </div>
        </div>
        <div className="m-5 rounded-lg border border-moss-800 bg-moss-950/60 p-3 font-mono text-[11.5px] leading-relaxed text-caramel-200/80">
          <span className="text-ok">→ webhook</span> payment.succeeded<br />money-signature: t=1790000000,v1=9c1e…b7
        </div>
      </div>
      <p className="display mt-4 text-right text-xl text-caramel-300">₹500.00 — simulated, never real.</p>
    </div>
  );
}
