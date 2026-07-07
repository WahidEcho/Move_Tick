import { createServiceClient } from '@/lib/supabase-server';
import { getPlatformSettings } from './platform-settings.service';
import { logAdminAction } from './audit.service';
import type {
  CommissionSource,
  EventCommissionSettings,
  EventFinancialSettlement,
  OrganizerPayoutRecord,
  SettlementStatus,
} from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';

const FINAL_STATUSES: SettlementStatus[] = ['paid', 'invoice_sent', 'completed', 'disputed', 'cancelled'];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface ResolvedCommission {
  appliedPercentage: number;
  fixedFeePerPaidTicket: number;
  source: CommissionSource;
  isLocked: boolean;
}

/** Event custom > organization override > platform default — percentage and fixed fee resolve independently. */
export async function resolveEventCommission(eventId: string): Promise<ResolvedCommission> {
  const supabase = createServiceClient();

  const { data: event } = await supabase
    .from('events')
    .select('organization_id')
    .eq('id', eventId)
    .single();
  if (!event) throw new Error('Event not found');

  const [{ data: custom }, { data: org }, platformSettings] = await Promise.all([
    supabase
      .from('event_commission_settings')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle(),
    supabase
      .from('organizations')
      .select('commission_percentage, fixed_fee_egp')
      .eq('id', event.organization_id)
      .single(),
    getPlatformSettings(),
  ]);

  const isLocked = (custom as EventCommissionSettings | null)?.is_locked ?? false;

  if (custom?.is_custom_commission_enabled) {
    const appliedPercentage =
      custom.custom_commission_percentage != null
        ? Number(custom.custom_commission_percentage)
        : org?.commission_percentage != null
          ? Number(org.commission_percentage)
          : Number(platformSettings.commission_percentage);
    const fixedFeePerPaidTicket =
      custom.custom_fixed_fee_egp != null
        ? Number(custom.custom_fixed_fee_egp)
        : org?.fixed_fee_egp != null
          ? Number(org.fixed_fee_egp)
          : Number(platformSettings.fixed_fee_egp);
    return { appliedPercentage, fixedFeePerPaidTicket, source: 'custom_event_commission', isLocked };
  }

  if (org?.commission_percentage != null || org?.fixed_fee_egp != null) {
    return {
      appliedPercentage: org.commission_percentage != null ? Number(org.commission_percentage) : Number(platformSettings.commission_percentage),
      fixedFeePerPaidTicket: org.fixed_fee_egp != null ? Number(org.fixed_fee_egp) : Number(platformSettings.fixed_fee_egp),
      source: 'organization_override',
      isLocked,
    };
  }

  return {
    appliedPercentage: Number(platformSettings.commission_percentage),
    fixedFeePerPaidTicket: Number(platformSettings.fixed_fee_egp),
    source: 'default_platform_commission',
    isLocked,
  };
}

export interface ComputedFinancials {
  grossTicketRevenue: number;
  refundAmount: number;
  discountAmount: number;
  paidTicketCount: number;
  freeTicketCount: number;
  appliedCommissionPercentage: number;
  commissionSource: CommissionSource;
  percentageCommissionAmount: number;
  fixedFeePerPaidTicket: number;
  fixedTicketFeeAmount: number;
  paymentGatewayFees: number | null;
  taxesAmount: number | null;
  totalPlatformFees: number;
  organizerNetProfit: number;
}

/**
 * Live aggregation of an event's financials from `payments` + `tickets`.
 * Gateway fees and taxes aren't tracked anywhere in the payment infrastructure,
 * so those two lines stay null ("not available") rather than being guessed.
 */
export async function computeEventFinancials(eventId: string): Promise<ComputedFinancials> {
  const supabase = createServiceClient();
  const commission = await resolveEventCommission(eventId);

  const { data: payments } = await supabase
    .from('payments')
    .select('status, quantity, unit_amount, amount_total, ticket_type_id')
    .eq('event_id', eventId)
    .in('status', ['paid', 'refunded']);

  const rows = payments ?? [];
  const ticketTypeIds = Array.from(new Set(rows.map((p) => p.ticket_type_id as string).filter(Boolean)));
  const priceByType = new Map<string, number>();
  if (ticketTypeIds.length > 0) {
    const { data: types } = await supabase.from('ticket_types').select('id, price').in('id', ticketTypeIds);
    for (const t of types ?? []) priceByType.set(t.id as string, Number(t.price ?? 0));
  }

  let paidMinor = 0;
  let refundMinor = 0;
  let discountMinor = 0;
  let paidTicketCount = 0;

  for (const p of rows) {
    const amountTotal = Number(p.amount_total ?? 0);
    const quantity = Number(p.quantity ?? 0);
    if (p.status === 'refunded') {
      refundMinor += amountTotal;
      continue;
    }
    paidMinor += amountTotal;
    paidTicketCount += quantity;
    const listMinor = Math.round((priceByType.get(p.ticket_type_id as string) ?? 0) * 100) * quantity;
    const diff = listMinor - amountTotal;
    if (diff > 0) discountMinor += diff;
  }

  const { count: activeTicketCount } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('is_active', true);

  const grossTicketRevenue = round2(paidMinor / 100);
  const percentageCommissionAmount = round2(grossTicketRevenue * (commission.appliedPercentage / 100));
  const fixedTicketFeeAmount = round2(paidTicketCount * commission.fixedFeePerPaidTicket);
  const totalPlatformFees = round2(percentageCommissionAmount + fixedTicketFeeAmount);

  return {
    grossTicketRevenue,
    refundAmount: round2(refundMinor / 100),
    discountAmount: round2(discountMinor / 100),
    paidTicketCount,
    freeTicketCount: Math.max(0, (activeTicketCount ?? 0) - paidTicketCount),
    appliedCommissionPercentage: commission.appliedPercentage,
    commissionSource: commission.source,
    percentageCommissionAmount,
    fixedFeePerPaidTicket: commission.fixedFeePerPaidTicket,
    fixedTicketFeeAmount,
    paymentGatewayFees: null,
    taxesAmount: null,
    totalPlatformFees,
    organizerNetProfit: round2(grossTicketRevenue - totalPlatformFees),
  };
}

function computedFromSettlement(s: EventFinancialSettlement): ComputedFinancials {
  return {
    grossTicketRevenue: Number(s.gross_ticket_revenue),
    refundAmount: Number(s.refund_amount),
    discountAmount: Number(s.discount_amount),
    paidTicketCount: s.paid_ticket_count,
    freeTicketCount: s.free_ticket_count,
    appliedCommissionPercentage: Number(s.applied_commission_percentage),
    commissionSource: s.commission_source,
    percentageCommissionAmount: Number(s.percentage_commission_amount),
    fixedFeePerPaidTicket: Number(s.fixed_fee_per_paid_ticket),
    fixedTicketFeeAmount: Number(s.fixed_ticket_fee_amount),
    paymentGatewayFees: s.payment_gateway_fees != null ? Number(s.payment_gateway_fees) : null,
    taxesAmount: s.taxes_amount != null ? Number(s.taxes_amount) : null,
    totalPlatformFees: Number(s.total_platform_fees),
    organizerNetProfit: Number(s.organizer_net_profit),
  };
}

/**
 * Creates or refreshes the persisted settlement snapshot for an event. Once a
 * settlement has money recorded against it or reaches a final status, it stops
 * auto-recomputing — a recorded payout must stay pinned to the figures it was
 * actually paid against, not silently drift if e.g. a refund lands afterward.
 */
export async function upsertSettlement(eventId: string): Promise<EventFinancialSettlement> {
  const supabase = createServiceClient();
  const { data: event } = await supabase.from('events').select('organization_id').eq('id', eventId).single();
  if (!event) throw new Error('Event not found');

  const { data: existing } = await supabase
    .from('event_financial_settlements')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle();

  const isPinned =
    existing &&
    (FINAL_STATUSES.includes(existing.settlement_status as SettlementStatus) || Number(existing.amount_paid_to_organizer) > 0);
  if (isPinned) return existing as EventFinancialSettlement;

  const computed = await computeEventFinancials(eventId);
  const amountPaid = existing ? Number(existing.amount_paid_to_organizer) : 0;
  const remaining = round2(computed.organizerNetProfit - amountPaid);

  const { data, error } = await supabase
    .from('event_financial_settlements')
    .upsert(
      {
        event_id: eventId,
        organization_id: event.organization_id,
        gross_ticket_revenue: computed.grossTicketRevenue,
        refund_amount: computed.refundAmount,
        discount_amount: computed.discountAmount,
        paid_ticket_count: computed.paidTicketCount,
        free_ticket_count: computed.freeTicketCount,
        applied_commission_percentage: computed.appliedCommissionPercentage,
        commission_source: computed.commissionSource,
        percentage_commission_amount: computed.percentageCommissionAmount,
        fixed_fee_per_paid_ticket: computed.fixedFeePerPaidTicket,
        fixed_ticket_fee_amount: computed.fixedTicketFeeAmount,
        total_platform_fees: computed.totalPlatformFees,
        organizer_net_profit: computed.organizerNetProfit,
        amount_paid_to_organizer: amountPaid,
        remaining_amount_due: remaining,
        settlement_status: (existing?.settlement_status as SettlementStatus) ?? 'ready_for_payment',
        calculated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id' }
    )
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to upsert settlement: ${error?.message}`);
  return data as EventFinancialSettlement;
}

export interface RecordPayoutInput {
  eventId: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string | null;
  proofOfPaymentUrl?: string | null;
  internalNotes?: string | null;
  recordedBy: string;
}

/** Records a manually-sent payout, updates the running balance, and flips status to partially_paid/paid. */
export async function recordPayout(
  input: RecordPayoutInput
): Promise<{ settlement: EventFinancialSettlement; payout: OrganizerPayoutRecord }> {
  const supabase = createServiceClient();
  const settlement = await upsertSettlement(input.eventId);

  const { data: payoutRow, error: payoutErr } = await supabase
    .from('organizer_payout_records')
    .insert({
      event_id: input.eventId,
      organization_id: settlement.organization_id,
      settlement_id: settlement.id,
      amount_paid: input.amountPaid,
      payment_date: input.paymentDate,
      payment_method: input.paymentMethod,
      payment_reference: input.paymentReference ?? null,
      proof_of_payment_url: input.proofOfPaymentUrl ?? null,
      internal_notes: input.internalNotes ?? null,
      recorded_by: input.recordedBy,
    })
    .select()
    .single();
  if (payoutErr || !payoutRow) throw new Error(`Failed to record payout: ${payoutErr?.message}`);

  const newAmountPaid = round2(Number(settlement.amount_paid_to_organizer) + input.amountPaid);
  const newRemaining = round2(Number(settlement.organizer_net_profit) - newAmountPaid);
  const newStatus: SettlementStatus = newRemaining <= 0 ? 'paid' : 'partially_paid';

  const { data: updatedSettlement, error: updErr } = await supabase
    .from('event_financial_settlements')
    .update({
      amount_paid_to_organizer: newAmountPaid,
      remaining_amount_due: newRemaining,
      settlement_status: newStatus,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : settlement.paid_at,
    })
    .eq('id', settlement.id)
    .select()
    .single();
  if (updErr || !updatedSettlement) throw new Error(`Failed to update settlement: ${updErr?.message}`);

  await logAdminAction({
    actorId: input.recordedBy,
    action: 'settlement.record_payout',
    targetType: 'event_financial_settlement',
    targetId: settlement.id,
    previousValue: { amount_paid_to_organizer: settlement.amount_paid_to_organizer, settlement_status: settlement.settlement_status },
    newValue: { amount_paid_to_organizer: newAmountPaid, settlement_status: newStatus },
    reason: input.internalNotes ?? null,
  });

  return { settlement: updatedSettlement as EventFinancialSettlement, payout: payoutRow as OrganizerPayoutRecord };
}

export interface SetEventCommissionInput {
  eventId: string;
  isCustomCommissionEnabled: boolean;
  customCommissionPercentage?: number | null;
  customFixedFeeEgp?: number | null;
  isLocked?: boolean;
  actorId: string;
}

/** Sets an event's custom commission override. Blocked once the event's commission is locked. */
export async function setEventCommission(input: SetEventCommissionInput): Promise<EventCommissionSettings> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('event_commission_settings')
    .select('*')
    .eq('event_id', input.eventId)
    .maybeSingle();

  if (existing?.is_locked) {
    throw new Error('Commission settings are locked for this event and cannot be changed.');
  }

  const { error: upsertErr } = await supabase.from('event_commission_settings').upsert(
    {
      event_id: input.eventId,
      custom_commission_percentage: input.customCommissionPercentage ?? null,
      custom_fixed_fee_egp: input.customFixedFeeEgp ?? null,
      is_custom_commission_enabled: input.isCustomCommissionEnabled,
      is_locked: input.isLocked ?? existing?.is_locked ?? false,
      created_by: existing?.created_by ?? input.actorId,
      updated_by: input.actorId,
    },
    { onConflict: 'event_id' }
  );
  if (upsertErr) throw new Error(`Failed to set commission: ${upsertErr.message}`);

  const resolved = await resolveEventCommission(input.eventId);
  const { data: refreshed, error: refreshErr } = await supabase
    .from('event_commission_settings')
    .update({
      applied_commission_percentage: resolved.appliedPercentage,
      applied_fixed_fee_egp: resolved.fixedFeePerPaidTicket,
      commission_source: resolved.source,
    })
    .eq('event_id', input.eventId)
    .select()
    .single();
  if (refreshErr || !refreshed) throw new Error(`Failed to refresh commission: ${refreshErr?.message}`);

  await upsertSettlement(input.eventId);

  await logAdminAction({
    actorId: input.actorId,
    action: existing ? 'event.edit_commission' : 'event.set_commission',
    targetType: 'event',
    targetId: input.eventId,
    previousValue: existing
      ? {
          custom_commission_percentage: existing.custom_commission_percentage,
          custom_fixed_fee_egp: existing.custom_fixed_fee_egp,
          is_custom_commission_enabled: existing.is_custom_commission_enabled,
        }
      : null,
    newValue: {
      custom_commission_percentage: input.customCommissionPercentage ?? null,
      custom_fixed_fee_egp: input.customFixedFeeEgp ?? null,
      is_custom_commission_enabled: input.isCustomCommissionEnabled,
    },
  });

  return refreshed as EventCommissionSettings;
}

function appendNote(existing: string | null | undefined, note: string): string {
  const line = `[${new Date().toISOString()}] ${note}`;
  return existing ? `${existing}\n${line}` : line;
}

export async function markSettlementDisputed(
  settlementId: string,
  actorId: string,
  reason: string
): Promise<EventFinancialSettlement> {
  const supabase = createServiceClient();
  const { data: before } = await supabase
    .from('event_financial_settlements')
    .select('settlement_status, internal_notes')
    .eq('id', settlementId)
    .single();

  const { data, error } = await supabase
    .from('event_financial_settlements')
    .update({ settlement_status: 'disputed', internal_notes: appendNote(before?.internal_notes, `Disputed: ${reason}`) })
    .eq('id', settlementId)
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to mark settlement disputed: ${error?.message}`);

  await logAdminAction({
    actorId,
    action: 'settlement.mark_disputed',
    targetType: 'event_financial_settlement',
    targetId: settlementId,
    previousValue: { settlement_status: before?.settlement_status ?? null },
    newValue: { settlement_status: 'disputed' },
    reason,
  });

  return data as EventFinancialSettlement;
}

export async function addSettlementInternalNote(
  settlementId: string,
  actorId: string,
  note: string
): Promise<EventFinancialSettlement> {
  const supabase = createServiceClient();
  const { data: before } = await supabase
    .from('event_financial_settlements')
    .select('internal_notes')
    .eq('id', settlementId)
    .single();

  const { data, error } = await supabase
    .from('event_financial_settlements')
    .update({ internal_notes: appendNote(before?.internal_notes, note) })
    .eq('id', settlementId)
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to add internal note: ${error?.message}`);

  await logAdminAction({
    actorId,
    action: 'settlement.add_note',
    targetType: 'event_financial_settlement',
    targetId: settlementId,
    newValue: { note },
  });

  return data as EventFinancialSettlement;
}

export interface SettlementEventSummary {
  id: string;
  title: string;
  slug: string;
  start_date: string;
  end_date: string;
  is_cancelled: boolean;
}

export interface SettlementOrgSummary {
  id: string;
  name: string;
  contact_email: string | null;
}

export interface SettlementListRow {
  event: SettlementEventSummary;
  organization: SettlementOrgSummary;
  settlement: EventFinancialSettlement | null;
  computed: ComputedFinancials;
}

export interface SettlementListFilters {
  search?: string;
  organizationId?: string;
  status?: SettlementStatus | 'pending_calculation';
  page?: number;
  page_size?: number;
}

/** Every non-archived event merged with its settlement (live-computed for events with no persisted/final row yet). */
export async function getSettlementsForAdmin(
  filters: SettlementListFilters = {}
): Promise<PaginatedResult<SettlementListRow>> {
  const supabase = createServiceClient();
  const { search, organizationId, status, page = 1, page_size = 20 } = filters;

  let query = supabase
    .from('events')
    .select('id, title, slug, start_date, end_date, is_cancelled, organization_id, organization:organizations(id, name, contact_email)')
    .is('archived_at', null);

  if (organizationId) query = query.eq('organization_id', organizationId);
  if (search && search.trim()) query = query.ilike('title', `%${search.trim()}%`);
  query = query.order('start_date', { ascending: false });

  const { data: events, error } = await query;
  if (error) throw new Error(`Failed to fetch events for settlements: ${error.message}`);

  const eventIds = (events ?? []).map((e) => e.id as string);
  const { data: settlements } = eventIds.length
    ? await supabase.from('event_financial_settlements').select('*').in('event_id', eventIds)
    : { data: [] as EventFinancialSettlement[] };
  const settlementByEvent = new Map((settlements ?? []).map((s) => [s.event_id as string, s as EventFinancialSettlement]));

  const rows: SettlementListRow[] = await Promise.all(
    (events ?? []).map(async (ev) => {
      const settlement = settlementByEvent.get(ev.id as string) ?? null;
      const isFinal = settlement && FINAL_STATUSES.includes(settlement.settlement_status);
      const computed = settlement && isFinal ? computedFromSettlement(settlement) : await computeEventFinancials(ev.id as string);
      const org = (ev as unknown as { organization: SettlementOrgSummary }).organization;
      return {
        event: {
          id: ev.id as string,
          title: ev.title as string,
          slug: ev.slug as string,
          start_date: ev.start_date as string,
          end_date: ev.end_date as string,
          is_cancelled: ev.is_cancelled as boolean,
        },
        organization: org,
        settlement,
        computed,
      };
    })
  );

  const filtered = status ? rows.filter((r) => (r.settlement?.settlement_status ?? 'pending_calculation') === status) : rows;

  const total = filtered.length;
  const from = (page - 1) * page_size;
  const paged = filtered.slice(from, from + page_size);

  return { data: paged, total, page, page_size, total_pages: Math.ceil(total / page_size) || 1 };
}

export interface OrganizerSettlementRow {
  settlement_id: string;
  event: SettlementEventSummary;
  gross_ticket_revenue: number;
  applied_commission_percentage: number;
  commission_source: CommissionSource;
  fixed_ticket_fee_amount: number;
  total_platform_fees: number;
  organizer_net_profit: number;
  amount_paid_to_organizer: number;
  remaining_amount_due: number;
  settlement_status: SettlementStatus;
}

/**
 * Own-organization settlement history only — safe columns, no internal_notes,
 * no other org's data. Lazily materializes a settlement row for any event that
 * has taken a paid/refunded payment but has none yet.
 */
export async function getSettlementsForOrganization(organizationId: string): Promise<OrganizerSettlementRow[]> {
  const supabase = createServiceClient();

  const { data: events } = await supabase.from('events').select('id').eq('organization_id', organizationId).is('archived_at', null);
  const eventIds = (events ?? []).map((e) => e.id as string);
  if (eventIds.length === 0) return [];

  const { data: existingSettlements } = await supabase
    .from('event_financial_settlements')
    .select('event_id')
    .in('event_id', eventIds);
  const settledEventIds = new Set((existingSettlements ?? []).map((s) => s.event_id as string));

  const unsettledEventIds = eventIds.filter((id) => !settledEventIds.has(id));
  if (unsettledEventIds.length > 0) {
    const { data: paidPayments } = await supabase
      .from('payments')
      .select('event_id')
      .in('event_id', unsettledEventIds)
      .in('status', ['paid', 'refunded']);
    const eventsToSettle = Array.from(new Set((paidPayments ?? []).map((p) => p.event_id as string)));
    await Promise.all(eventsToSettle.map((id) => upsertSettlement(id)));
  }

  const { data, error } = await supabase
    .from('event_financial_settlements')
    .select(
      'id, gross_ticket_revenue, applied_commission_percentage, commission_source, fixed_ticket_fee_amount, total_platform_fees, organizer_net_profit, amount_paid_to_organizer, remaining_amount_due, settlement_status, event:events(id, title, slug, start_date, end_date, is_cancelled)'
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch organization settlements: ${error.message}`);

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      gross_ticket_revenue: number;
      applied_commission_percentage: number;
      commission_source: CommissionSource;
      fixed_ticket_fee_amount: number;
      total_platform_fees: number;
      organizer_net_profit: number;
      amount_paid_to_organizer: number;
      remaining_amount_due: number;
      settlement_status: SettlementStatus;
      event: SettlementEventSummary;
    };
    return {
      settlement_id: r.id,
      event: r.event,
      gross_ticket_revenue: Number(r.gross_ticket_revenue),
      applied_commission_percentage: Number(r.applied_commission_percentage),
      commission_source: r.commission_source,
      fixed_ticket_fee_amount: Number(r.fixed_ticket_fee_amount),
      total_platform_fees: Number(r.total_platform_fees),
      organizer_net_profit: Number(r.organizer_net_profit),
      amount_paid_to_organizer: Number(r.amount_paid_to_organizer),
      remaining_amount_due: Number(r.remaining_amount_due),
      settlement_status: r.settlement_status,
    };
  });
}

export async function getPayoutHistory(settlementId: string): Promise<OrganizerPayoutRecord[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('organizer_payout_records')
    .select('*')
    .eq('settlement_id', settlementId)
    .order('payment_date', { ascending: false });
  if (error) throw new Error(`Failed to fetch payout history: ${error.message}`);
  return (data ?? []) as OrganizerPayoutRecord[];
}
