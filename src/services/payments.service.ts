import { createServiceClient } from '@/lib/supabase-server';
import { createCheckoutSession, createRefund, retrieveCheckoutSession } from '@/lib/xpay/client';
import { validateCoupon } from './coupons.service';
import * as ticketsService from './tickets.service';
import { sendTicketEmail } from './email.service';
import { getAppUrl as appUrl } from '@/lib/app-url';
import { createNotification } from './notifications.service';

export interface CreateCheckoutInput {
  eventId: string;
  ticketTypeId: string;
  userId: string;
  quantity: number;
  couponCode?: string | null;
}

export type CreateCheckoutResult =
  | { success: true; url: string; paymentId: string }
  | { success: false; message: string };

/**
 * Create an XPay Hosted Checkout for a PAID ticket type. Validates availability
 * and an optional promo code, records a pending payment row, then returns the
 * XPay redirect URL. Free ticket types must use the separate free flow.
 */
export async function createCheckoutForTickets(
  input: CreateCheckoutInput
): Promise<CreateCheckoutResult> {
  const supabase = createServiceClient();
  const { eventId, ticketTypeId, userId, quantity, couponCode } = input;

  if (quantity < 1) return { success: false, message: 'Invalid quantity' };

  const { data: tt } = await supabase
    .from('ticket_types')
    .select('id, name, price, is_active, capacity, sold_count')
    .eq('id', ticketTypeId)
    .eq('event_id', eventId)
    .single();
  if (!tt) return { success: false, message: 'Ticket type not found' };
  if (!tt.is_active) return { success: false, message: 'This ticket type is not on sale' };

  const priceMajor = Number(tt.price ?? 0);
  if (priceMajor <= 0) {
    return { success: false, message: 'This is a free ticket — use the free registration flow' };
  }

  // Availability
  const capacity = tt.capacity as number | null;
  const sold = (tt.sold_count as number) ?? 0;
  if (capacity != null && sold + quantity > capacity) {
    return { success: false, message: 'Not enough tickets remaining' };
  }

  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', eventId)
    .single();
  const eventTitle = (event?.title as string) ?? 'Event';

  // Pricing (+ optional coupon)
  let unitMinor = Math.round(priceMajor * 100);
  let couponId: string | null = null;
  if (couponCode && couponCode.trim()) {
    const v = await validateCoupon(eventId, ticketTypeId, couponCode);
    if (!v.valid) return { success: false, message: v.reason ?? 'Invalid coupon' };
    unitMinor = v.discountedUnitMinor!;
    couponId = v.couponId!;
  }
  const amountTotal = unitMinor * quantity;

  // Record a pending payment first (so the webhook can find it by session id).
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .insert({
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      user_id: userId,
      quantity,
      coupon_id: couponId,
      unit_amount: unitMinor,
      amount_total: amountTotal,
      currency: 'EGP',
      provider: 'xpay',
      status: 'pending',
    })
    .select('id')
    .single();
  if (payErr || !payment) {
    return { success: false, message: `Could not start checkout: ${payErr?.message ?? 'unknown'}` };
  }

  try {
    const session = await createCheckoutSession({
      productName: `${eventTitle} — ${tt.name}`,
      unitAmount: unitMinor,
      quantity,
      currency: 'EGP',
      successUrl: `${appUrl()}/tickets/purchase/complete?payment=${payment.id}`,
      metadata: { payment_id: payment.id as string, event_id: eventId, user_id: userId },
    });

    await supabase
      .from('payments')
      .update({ xpay_session_id: session.id })
      .eq('id', payment.id);

    return { success: true, url: session.url, paymentId: payment.id as string };
  } catch (e) {
    await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id);
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Checkout could not be created',
    };
  }
}

/**
 * Idempotently fulfill a completed XPay checkout: issue the paid tickets, create
 * confirmed registrations, record coupon redemption, and email each ticket.
 *
 * Idempotency: an atomic conditional UPDATE flips the payment pending -> paid
 * and only the winning caller proceeds. On failure mid-fulfillment we revert to
 * pending so XPay's retry can re-attempt.
 */
export async function fulfillCheckoutCompleted(session: {
  id: string;
  paymentIntent?: { id?: string } | null;
}): Promise<void> {
  const supabase = createServiceClient();
  const paymentIntentId = session.paymentIntent?.id ?? null;

  // Atomic claim: only one delivery transitions pending -> paid.
  const { data: claimed } = await supabase
    .from('payments')
    .update({ status: 'paid', xpay_payment_intent_id: paymentIntentId })
    .eq('xpay_session_id', session.id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();

  if (!claimed) return; // already processed (or unknown session) — idempotent no-op

  try {
    const qty = claimed.quantity as number;
    // N tickets (independent entry passes), 1 purchase registration. A second
    // registration for the same (event,user,type) would violate the unique
    // constraint, so we upsert one record and let the tickets carry the count.
    const ticketIds: string[] = [];
    for (let i = 0; i < qty; i++) {
      const ticket = await ticketsService.issueTicket(
        claimed.event_id as string,
        claimed.ticket_type_id as string,
        claimed.user_id as string
      );
      ticketIds.push(ticket.id);
      const emailResult = await sendTicketEmail(ticket.id); // best-effort
      if (!emailResult.ok) {
        console.warn(`[xpay] ticket email failed for ${ticket.id}: ${emailResult.error}`);
      }
    }

    await supabase.from('registrations').upsert(
      {
        event_id: claimed.event_id,
        user_id: claimed.user_id,
        ticket_type_id: claimed.ticket_type_id,
        status: 'confirmed',
        ticket_id: ticketIds[0],
        source: 'direct',
        payment_id: claimed.id,
      },
      { onConflict: 'event_id,user_id,ticket_type_id' }
    );

    await supabase.from('payments').update({ tickets_issued: qty }).eq('id', claimed.id);

    const { data: eventRow } = await supabase
      .from('events')
      .select('title')
      .eq('id', claimed.event_id as string)
      .maybeSingle();
    await createNotification({
      userId: claimed.user_id as string,
      type: 'ticket_issued',
      title: 'Your ticket is ready',
      message: `Your payment was confirmed and your ticket${qty > 1 ? 's are' : ' is'} ready for ${eventRow?.title ?? 'your event'}.`,
      relatedEntityType: 'ticket',
      relatedEntityId: ticketIds[0],
    });

    if (claimed.coupon_id) {
      await supabase.rpc('increment_coupon_redemption', { p_coupon_id: claimed.coupon_id });
      await supabase.from('coupon_redemptions').insert({
        coupon_id: claimed.coupon_id,
        user_id: claimed.user_id,
        payment_id: claimed.id,
      });
    }
  } catch (e) {
    // Revert so XPay retries the webhook and we can finish issuance.
    await supabase.from('payments').update({ status: 'pending' }).eq('id', claimed.id);
    throw e;
  }
}

export type ReconcileStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'unknown';

/**
 * Reconcile a pending payment against XPay directly (webhook-independent).
 *
 * The confirmation page calls this so a buyer is never stuck on "Confirming…"
 * when the webhook is delayed or misconfigured. If the XPay session is
 * `complete` we fulfill (idempotently — the atomic claim in
 * fulfillCheckoutCompleted guarantees no double issuance even if the webhook
 * also fires); if it has `expired`, we mark the payment failed. Only the owner
 * may reconcile their own payment.
 */
export async function reconcilePaymentStatus(
  paymentId: string,
  userId: string
): Promise<ReconcileStatus> {
  const supabase = createServiceClient();

  const { data: payment } = await supabase
    .from('payments')
    .select('status, user_id, xpay_session_id')
    .eq('id', paymentId)
    .maybeSingle();

  if (!payment || payment.user_id !== userId) return 'unknown';

  const current = payment.status as ReconcileStatus;
  if (current !== 'pending') return current;

  const sessionId = payment.xpay_session_id as string | null;
  if (!sessionId) return 'pending';

  let session: Awaited<ReturnType<typeof retrieveCheckoutSession>> = null;
  try {
    session = await retrieveCheckoutSession(sessionId);
  } catch {
    return 'pending'; // config/transient issue — keep waiting
  }
  if (!session) return 'pending';

  if (session.status === 'complete') {
    try {
      await fulfillCheckoutCompleted({ id: session.id, paymentIntent: session.paymentIntent });
    } catch (e) {
      console.warn(`[xpay] reconcile fulfillment failed for ${paymentId}:`, e);
      return 'pending'; // will retry on next poll / webhook
    }
    return 'paid';
  }

  if (session.status === 'expired') {
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('id', paymentId)
      .eq('status', 'pending');
    return 'failed';
  }

  return 'pending';
}

/** Refund a paid payment via XPay and mark it refunded. */
export async function refundPayment(paymentId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: payment } = await supabase
    .from('payments')
    .select('xpay_payment_intent_id, status')
    .eq('id', paymentId)
    .single();
  if (!payment?.xpay_payment_intent_id) throw new Error('No payment intent to refund');
  if (payment.status !== 'paid') throw new Error('Only paid payments can be refunded');

  await createRefund(payment.xpay_payment_intent_id);
  await supabase.from('payments').update({ status: 'refunded' }).eq('id', paymentId);
}
