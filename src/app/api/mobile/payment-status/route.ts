import { createServiceClient } from '@/lib/supabase-server';
import { reconcilePaymentStatus } from '@/services/payments.service';
import { corsJson, optionsResponse } from '@/lib/api/mobile-cors';

/**
 * Payment-status polling for the mobile checkout flow. Reconciles the payment
 * against XPay directly (webhook-independent, same as the web confirmation
 * page), so the app can flip to "success" the moment the charge completes.
 * Only the payment's owner gets a real answer.
 */
export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
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

  const paymentId = new URL(request.url).searchParams.get('paymentId');
  if (!paymentId) {
    return corsJson({ success: false, message: 'paymentId is required' }, { status: 400 });
  }

  const status = await reconcilePaymentStatus(paymentId, user.id);

  // On success, hand back the issued ticket ids so the app can deep-link.
  let ticketIds: string[] = [];
  if (status === 'paid') {
    const { data: payment } = await supabase
      .from('payments')
      .select('event_id, ticket_type_id, user_id')
      .eq('id', paymentId)
      .maybeSingle();
    if (payment && payment.user_id === user.id) {
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id')
        .eq('event_id', payment.event_id)
        .eq('ticket_type_id', payment.ticket_type_id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      ticketIds = (tickets ?? []).map((t) => t.id as string);
    }
  }

  return corsJson({ success: true, status, ticketIds });
}
