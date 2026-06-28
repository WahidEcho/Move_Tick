/**
 * XPay API client (server-only). Hosted Checkout + Refunds.
 *
 * Gated on XPAY_SECRET_KEY — if absent, isXpayConfigured() is false and the UI
 * hides paid purchase. The secret key never reaches the client.
 *
 * Money note: XPay amounts are in MINOR units (piaster) — EGP * 100.
 */

const XPAY_API_BASE = process.env.XPAY_API_BASE ?? 'https://api.xpay.app';
const secretKey = process.env.XPAY_SECRET_KEY;

export function isXpayConfigured(): boolean {
  return Boolean(secretKey);
}

export interface CreateCheckoutParams {
  productName: string;
  unitAmount: number; // minor units (piaster)
  quantity: number;
  currency: string; // e.g. 'EGP'
  successUrl: string; // may contain {CHECKOUT_SESSION_ID}
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  url: string;
  status: string;
  amountTotal?: number;
  currency?: string;
}

export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<CheckoutSession> {
  if (!secretKey) throw new Error('xpay_not_configured');

  const res = await fetch(`${XPAY_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      afterCompletion: {
        type: 'redirect',
        redirect: { url: params.successUrl },
      },
      lineItems: [
        {
          priceData: {
            currency: params.currency,
            unitAmount: params.unitAmount,
            productData: { name: params.productName },
          },
          quantity: params.quantity,
        },
      ],
      metadata: params.metadata,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`XPay checkout creation failed (${res.status}): ${body}`);
  }
  return (await res.json()) as CheckoutSession;
}

export interface RefundResult {
  id: string;
  status: string;
}

export async function createRefund(paymentIntentId: string): Promise<RefundResult> {
  if (!secretKey) throw new Error('xpay_not_configured');

  const res = await fetch(`${XPAY_API_BASE}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentIntent: paymentIntentId }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`XPay refund failed (${res.status}): ${body}`);
  }
  return (await res.json()) as RefundResult;
}
