import { createServiceClient } from '@/lib/supabase-server';
import { createCheckoutForTickets } from '@/services/payments.service';
import { corsJson, optionsResponse } from '@/lib/api/mobile-cors';

/**
 * Paid-ticket checkout for the mobile app. Creates the XPay Hosted Checkout
 * session directly (Bearer-token auth, no web login involved) and returns its
 * URL for the app to open in an in-app browser tab. Prices always come from
 * ticket_types server-side — the client never supplies amounts.
 */
export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return corsJson({ success: false, message: 'Not authenticated' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return corsJson({ success: false, message: 'Not authenticated' }, { status: 401 });
  }

  let body: { eventId?: string; ticketTypeId?: string; quantity?: number; couponCode?: string | null };
  try {
    body = await request.json();
  } catch {
    return corsJson({ success: false, message: 'Invalid request body' }, { status: 400 });
  }

  const { eventId, ticketTypeId } = body;
  const quantity = typeof body.quantity === 'number' && Number.isInteger(body.quantity) ? body.quantity : 1;
  if (typeof eventId !== 'string' || typeof ticketTypeId !== 'string') {
    return corsJson(
      { success: false, message: 'eventId and ticketTypeId are required' },
      { status: 400 }
    );
  }
  if (quantity < 1 || quantity > 10) {
    return corsJson({ success: false, message: 'Quantity must be between 1 and 10' }, { status: 400 });
  }

  const result = await createCheckoutForTickets({
    eventId,
    ticketTypeId,
    userId: user.id,
    quantity,
    couponCode: typeof body.couponCode === 'string' ? body.couponCode : null,
  });

  if (!result.success) {
    return corsJson({ success: false, message: result.message }, { status: 400 });
  }
  return corsJson({ success: true, url: result.url, paymentId: result.paymentId });
}
