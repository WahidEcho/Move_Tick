import { createServiceClient } from '@/lib/supabase-server';
import { refundPayment } from './payments.service';
import { createNotification } from './notifications.service';
import { logAdminAction } from './audit.service';
import { sendAdminOrgAlert } from './admin-alerts.service';
import { sendLoggedEmail } from './email-log.service';
import { refundDecisionEmail } from '@/lib/email-templates';
import type { RefundRequest } from '@/types/database.types';

export interface RefundRequestRow extends RefundRequest {
  event_title: string;
  organization_name: string;
  requester_name: string | null;
  requester_email: string | null;
  amount_egp: number;
  payment_status: string;
}

/**
 * Attendee-initiated refund flow (W4). The attendee only *requests*; money
 * moves exclusively when a super admin approves — approval refunds the XPay
 * payment in full and deactivates every ticket bought in that transaction.
 */
export async function createRefundRequest(input: {
  paymentId: string;
  userId: string;
  reason: string;
}): Promise<{ success: boolean; message: string }> {
  const supabase = createServiceClient();

  if (!input.reason.trim()) return { success: false, message: 'Please describe why you need a refund.' };

  const { data: payment } = await supabase
    .from('payments')
    .select('id, user_id, event_id, status, amount_total, event:events(title, organization_id)')
    .eq('id', input.paymentId)
    .maybeSingle();
  if (!payment || payment.user_id !== input.userId) {
    return { success: false, message: 'Payment not found' };
  }
  if (payment.status !== 'paid') {
    return { success: false, message: 'Only completed payments can be refunded.' };
  }

  const event = payment.event as unknown as { title: string; organization_id: string } | null;
  if (!event) return { success: false, message: 'Event not found' };

  const { data: existing } = await supabase
    .from('refund_requests')
    .select('id, status')
    .eq('payment_id', input.paymentId)
    .in('status', ['pending', 'approved'])
    .maybeSingle();
  if (existing) {
    return {
      success: false,
      message:
        existing.status === 'pending'
          ? 'A refund request for this purchase is already being reviewed.'
          : 'This purchase has already been refunded.',
    };
  }

  const { error } = await supabase.from('refund_requests').insert({
    payment_id: input.paymentId,
    event_id: payment.event_id,
    organization_id: event.organization_id,
    requested_by: input.userId,
    reason: input.reason.trim(),
  });
  if (error) return { success: false, message: `Could not submit request: ${error.message}` };

  const { data: org } = await supabase.from('organizations').select('name').eq('id', event.organization_id).single();
  await sendAdminOrgAlert({
    action: 'Refund requested by attendee',
    organizationId: event.organization_id,
    organizationName: org?.name ?? 'Unknown org',
    eventId: payment.event_id as string,
    eventTitle: event.title,
    status: `${(Number(payment.amount_total) / 100).toFixed(2)} EGP — awaiting review`,
    dashboardPath: '/admin/refunds',
  });

  // The organizer hears about it too (visibility without decision power).
  const { data: orgMembers } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', event.organization_id);
  await Promise.allSettled(
    (orgMembers ?? []).map((m) =>
      createNotification({
        userId: m.user_id as string,
        organizationId: event.organization_id,
        type: 'general',
        title: `Refund requested — ${event.title}`,
        message: `An attendee requested a ${(Number(payment.amount_total) / 100).toFixed(2)} EGP refund. Move Beyond will review it.`,
        relatedEntityType: 'event',
        relatedEntityId: payment.event_id as string,
      })
    )
  );

  return { success: true, message: 'Refund request submitted — we will review it and email you the decision.' };
}

/** The attendee-facing state of a payment's refund journey, for the ticket page. */
export async function getRefundStateForPayment(
  paymentId: string,
  userId: string
): Promise<{ status: 'none' | 'pending' | 'approved' | 'rejected' }> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('refund_requests')
    .select('status')
    .eq('payment_id', paymentId)
    .eq('requested_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { status: (data?.status as 'pending' | 'approved' | 'rejected' | undefined) ?? 'none' };
}

export async function getRefundRequestsForAdmin(): Promise<RefundRequestRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('refund_requests')
    .select(
      '*, event:events(title), organization:organizations(name), requester:profiles!refund_requests_requested_by_fkey(full_name, email), payment:payments(amount_total, status)'
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`Failed to fetch refund requests: ${error.message}`);

  return (data ?? []).map((r) => {
    const row = r as unknown as RefundRequest & {
      event: { title: string } | null;
      organization: { name: string } | null;
      requester: { full_name: string | null; email: string | null } | null;
      payment: { amount_total: number; status: string } | null;
    };
    return {
      ...row,
      event_title: row.event?.title ?? 'Unknown event',
      organization_name: row.organization?.name ?? '—',
      requester_name: row.requester?.full_name ?? null,
      requester_email: row.requester?.email ?? null,
      amount_egp: Number(row.payment?.amount_total ?? 0) / 100,
      payment_status: row.payment?.status ?? 'unknown',
    };
  });
}

/**
 * Approve: refund via XPay (full amount), deactivate the transaction's tickets,
 * release capacity, notify + email the attendee. Reject: record the note and
 * tell the attendee their ticket stays valid. Both are audit-logged.
 */
export async function decideRefundRequest(input: {
  requestId: string;
  approve: boolean;
  decisionNote?: string | null;
  actorId: string;
}): Promise<{ success: boolean; message: string }> {
  const supabase = createServiceClient();

  const { data: request } = await supabase
    .from('refund_requests')
    .select('*, event:events(title), payment:payments(amount_total)')
    .eq('id', input.requestId)
    .maybeSingle();
  if (!request) return { success: false, message: 'Request not found' };
  if (request.status !== 'pending') return { success: false, message: 'This request was already decided.' };
  if (!input.approve && !input.decisionNote?.trim()) {
    return { success: false, message: 'A note explaining the rejection is required.' };
  }

  const eventTitle = (request.event as unknown as { title: string } | null)?.title ?? 'your event';
  const amountEgp = Number((request.payment as unknown as { amount_total: number } | null)?.amount_total ?? 0) / 100;

  if (input.approve) {
    try {
      await refundPayment(request.payment_id as string);
    } catch (e) {
      return { success: false, message: `XPay refund failed: ${e instanceof Error ? e.message : 'unknown error'}` };
    }

    // Deactivate every ticket from that purchase and release its capacity.
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, ticket_type_id, is_active')
      .eq('payment_id', request.payment_id);
    const active = (tickets ?? []).filter((t) => t.is_active);
    if (active.length > 0) {
      await supabase
        .from('tickets')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('id', active.map((t) => t.id));
      const byType = new Map<string, number>();
      for (const t of active) byType.set(t.ticket_type_id as string, (byType.get(t.ticket_type_id as string) ?? 0) + 1);
      for (const [typeId, count] of byType) {
        const { data: tt } = await supabase.from('ticket_types').select('sold_count').eq('id', typeId).single();
        await supabase
          .from('ticket_types')
          .update({ sold_count: Math.max(0, Number(tt?.sold_count ?? 0) - count), updated_at: new Date().toISOString() })
          .eq('id', typeId);
      }
    }
  }

  await supabase
    .from('refund_requests')
    .update({
      status: input.approve ? 'approved' : 'rejected',
      decided_by: input.actorId,
      decided_at: new Date().toISOString(),
      decision_note: input.decisionNote?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.requestId);

  await logAdminAction({
    actorId: input.actorId,
    action: input.approve ? 'refund.approve' : 'refund.reject',
    targetType: 'refund_request',
    targetId: input.requestId,
    newValue: { payment_id: request.payment_id, amount_egp: amountEgp },
    reason: input.decisionNote?.trim() || null,
  });

  const { data: requester } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', request.requested_by)
    .single();

  await createNotification({
    userId: request.requested_by as string,
    type: 'general',
    title: input.approve ? 'Refund approved' : 'Refund request update',
    message: input.approve
      ? `Your ${amountEgp.toFixed(2)} EGP refund for ${eventTitle} was approved and is on its way back to your card.`
      : `Your refund request for ${eventTitle} was not approved. Your ticket remains valid.`,
    relatedEntityType: 'event',
    relatedEntityId: request.event_id as string,
  });

  if (requester?.email) {
    const { subject, html } = refundDecisionEmail({
      attendeeName: requester.full_name,
      eventTitle,
      amountEgp,
      approved: input.approve,
      decisionNote: input.decisionNote,
    });
    await sendLoggedEmail({
      to: requester.email,
      subject,
      html,
      emailType: 'refund_decision',
      relatedEventId: request.event_id as string,
      relatedOrganizationId: request.organization_id as string,
    });
  }

  return { success: true, message: input.approve ? 'Refund approved and processed.' : 'Request rejected.' };
}
