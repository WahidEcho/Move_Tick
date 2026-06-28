# XPay payments — setup

The paid-ticket flow is fully built and gated. Until the env vars below are set,
"Buy" shows a friendly "payments not available yet" message and the webhook
endpoint returns `501`. Once set, paid checkout works with no code changes.

## 1. Get your keys (XPay dashboard, Test mode first)
- **Secret key**: API keys → copy the `sk_test_…` key → `XPAY_SECRET_KEY`.
- **Webhook signing secret**: Webhooks → Add endpoint:
  - URL: `https://<your-domain>/api/webhooks/xpay`
  - Subscribe to **`checkout.session.completed`** (at minimum).
  - Copy the endpoint's **signing secret** → `XPAY_WEBHOOK_SECRET`.

## 2. Put them in `Move-Tick/.env.local` (gitignored)
```
XPAY_SECRET_KEY=sk_test_xxxxxxxx
XPAY_WEBHOOK_SECRET=whsec_xxxxxxxx
# optional override (defaults to https://api.xpay.app):
# XPAY_API_BASE=https://api.xpay.app
```

## 3. Local testing
XPay can't reach `localhost`, so for webhooks either:
- Run a tunnel: `ngrok http 3000`, then use the public URL as the webhook endpoint, **or**
- Test on a deployed preview/staging URL.

Test card (from XPay quickstart): `5123 4500 0000 0008`, exp `01/39`, CVV `100`.

## 4. Go live
Swap to `sk_live_…` + a live-mode webhook endpoint/secret before the real event.

---

## How it works (for reference)
- **Buy** (paid ticket type) → `startTicketPurchase` → `createCheckoutForTickets`
  validates availability + promo code, writes a `pending` `payments` row, creates
  an XPay Hosted Checkout session, redirects the buyer to XPay.
- Buyer pays on XPay's hosted page (no card data touches us — minimal PCI scope).
- XPay calls `POST /api/webhooks/xpay`. We **verify the signature**
  (`HMAC-SHA256("{t}.{rawBody}", secret)`, 300s replay window, constant-time),
  then **idempotently** fulfill: an atomic `pending → paid` claim ensures retries
  never double-issue. Tickets are issued (atomic `issue_ticket` ×qty), one
  purchase registration is recorded, the coupon counter increments, and each
  ticket email (with QR + wallet buttons) is sent.
- Buyer lands on `/tickets/purchase/complete?payment=…` which polls until the
  webhook confirms.

## Promo codes / discounts
Built **in-platform** (XPay has no native coupon object). Organizers manage codes
under **Event → Promo Codes**: percent or fixed (EGP) off, optional max-uses and
expiry. Buyers apply a code in the buy dialog; the discount is applied to the
price sent to XPay. Per-event, organizer-owned.

## Refunds
`refundPayment(paymentId)` calls XPay `POST /refunds` and marks the payment
`refunded` — wire this into event cancellation when ready.

## Fees
Organizer absorbs the XPay fee (buyer pays the listed ticket price). No extra
fee line is added at checkout.
