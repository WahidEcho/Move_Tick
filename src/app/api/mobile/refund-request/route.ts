import { createServiceClient } from '@/lib/supabase-server';
import { createRefundRequest, getRefundStateForPayment } from '@/services/refunds.service';
import { corsJson, optionsResponse } from '@/lib/api/mobile-cors';

/**
 * Attendee-initiated refund requests for the mobile app — the same flow the web
 * ticket page offers. GET reports the current state for a ticket's payment,
 * POST files a request.
 *
 * Nothing here decides a refund: a request only ever lands in the super-admin
 * queue, exactly as on web. Both handlers resolve the payment from the ticket
 * server-side and verify the caller owns it, so a client can't file against
 * someone else's payment by guessing ids.
 */

export async function OPTIONS() {
  return optionsResponse();
}

/** Resolves the authenticated user, or null. */
async function authenticate(request: Request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const supabase = createServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error || !user ? null : user;
}

/**
 * The payment behind a ticket, but only when the caller owns both. Returns null
 * rather than distinguishing "not found" from "not yours" — the client has no
 * need for that difference and it keeps ticket ids non-enumerable.
 */
async function ownedPaymentForTicket(ticketId: string, userId: string) {
  const supabase = createServiceClient();
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, user_id, payment_id')
    .eq('id', ticketId)
    .maybeSingle();
  if (!ticket || ticket.user_id !== userId || !ticket.payment_id) return null;

  const { data: payment } = await supabase
    .from('payments')
    .select('id, user_id, status, amount_total')
    .eq('id', ticket.payment_id as string)
    .maybeSingle();
  if (!payment || payment.user_id !== userId) return null;

  return payment as { id: string; status: string; amount_total: number };
}

export async function GET(request: Request) {
  const user = await authenticate(request);
  if (!user) return corsJson({ success: false, message: 'Not authenticated' }, { status: 401 });

  const ticketId = new URL(request.url).searchParams.get('ticketId');
  if (!ticketId) {
    return corsJson({ success: false, message: 'ticketId is required' }, { status: 400 });
  }

  const payment = await ownedPaymentForTicket(ticketId, user.id);
  // A free ticket has no payment — not an error, just nothing to refund.
  if (!payment) return corsJson({ success: true, refundable: false, status: 'none' });

  const { status } = await getRefundStateForPayment(payment.id, user.id);
  return corsJson({
    success: true,
    refundable: payment.status === 'paid' || payment.status === 'refunded',
    status: payment.status === 'refunded' && status === 'none' ? 'approved' : status,
    amountLabel: `${(Number(payment.amount_total) / 100).toFixed(2)} EGP`,
  });
}

export async function POST(request: Request) {
  const user = await authenticate(request);
  if (!user) return corsJson({ success: false, message: 'Not authenticated' }, { status: 401 });

  let body: { ticketId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return corsJson({ success: false, message: 'Invalid request body' }, { status: 400 });
  }

  if (!body.ticketId || typeof body.reason !== 'string' || !body.reason.trim()) {
    return corsJson(
      { success: false, message: 'Please describe why you need a refund.' },
      { status: 400 }
    );
  }

  const payment = await ownedPaymentForTicket(body.ticketId, user.id);
  if (!payment) {
    return corsJson({ success: false, message: 'Payment not found' }, { status: 404 });
  }

  const result = await createRefundRequest({
    paymentId: payment.id,
    userId: user.id,
    reason: body.reason,
  });

  return corsJson(
    { success: result.success, message: result.message },
    { status: result.success ? 200 : 400 }
  );
}
