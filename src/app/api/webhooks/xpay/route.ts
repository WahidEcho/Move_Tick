import { NextRequest, NextResponse } from 'next/server';
import { verifyXpaySignature } from '@/lib/xpay/webhook';
import { fulfillCheckoutCompleted } from '@/services/payments.service';

// crypto + raw body require the Node runtime (not edge).
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secret = process.env.XPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhooks not configured' }, { status: 501 });
  }

  // Read the RAW body before any parsing — required for signature verification.
  const rawBody = await req.text();
  const signature = req.headers.get('XPay-Signature');

  if (!verifyXpaySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    if (
      event.type === 'checkout.session.completed' &&
      event.data?.object?.status === 'complete'
    ) {
      await fulfillCheckoutCompleted(
        event.data.object as unknown as { id: string; paymentIntent?: { id?: string } | null }
      );
    }
  } catch (e) {
    // Return 5xx so XPay retries (idempotent fulfillment makes retries safe).
    console.error('[xpay webhook] fulfillment error:', e);
    return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
