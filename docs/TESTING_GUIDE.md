# Testing guide

```powershell
npm test            # tsx --test "tests/**/*.test.ts"  (Node's built-in runner; no Firebase needed)
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
npm run build       # next build
npm run check       # all of the above
```
## What the tests cover
`tests/unit.test.ts` — state machine, key generation/hashing/classification, secrets never serialised, webhook signing (valid/tampered/wrong secret/replay), SSRF (IPv4/IPv6 private ranges, mapped addresses, hostile URLs, DNS answers), open-redirect checks, order/amount validation, secret encryption, rate limiter, error sanitisation.
`tests/lifecycle.test.ts` — end-to-end business flows against the real `MoneyService` with an in-memory store, fake clock and fake HTTP transport:
- **A** create → checkout → success → webhook (signature verified like a merchant would) → dashboard stats.
- **B** failure → webhook → stats. **C** pending → delayed success (clock advanced; repeated reads emit nothing new).
- **D** partial refunds → full refund → history and totals. **E** cross-user/cross-project access denied everywhere.
- **F** duplicate requests: idempotent create, 5 concurrent simulations → 1 winner, replay safety, gapless events.
- **G** unsafe webhook destinations rejected (creation and delivery-time DNS). **H** over-refund rejected (incl. concurrent).
- plus: key auth/rotation/revocation, suspension, archived projects, delayed/timeout/cancel/expire/reverse scenarios, manual retry, project deletion cleanup.
`tests/example.test.ts` — the sample merchant's verifier agrees with the platform signer.

## Not covered (yet)
HTTP-layer tests of route handlers, the Firestore adapter (use the emulator), real network calls from `safeTransport`, UI/e2e tests (Playwright suggested). See `docs/STATUS.md`.

## Manual end-to-end
Run MONEY + `examples/merchant-demo`; walk Buy → each checkout scenario → result page → Webhooks log.
