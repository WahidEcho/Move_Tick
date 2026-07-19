'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { toCSV } from '@/lib/csv';
import { PAYOUT_PROOFS_BUCKET } from '@/lib/storage';
import {
  getSettlementsForAdmin,
  setEventCommission,
  recordPayout,
  sendSettlementStatement,
  markSettlementDisputed,
  addSettlementInternalNote,
  getPayoutHistory,
  computeEventFinancials,
  downloadSettlementStatementPdf,
  type SettlementListFilters,
} from '@/services/settlements.service';
import { getOrganizations } from '@/services/organizations.service';
import type { SettlementStatus } from '@/types/database.types';

export interface SetCommissionInput {
  eventId: string;
  isCustomCommissionEnabled: boolean;
  customCommissionPercentage: number | null;
  customFixedFeeEgp: number | null;
  isLocked: boolean;
  reason: string;
}

export async function setCommissionAction(input: SetCommissionInput) {
  const profile = await requireAdmin();
  try {
    await setEventCommission({ ...input, actorId: profile.id });
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Failed to set commission' };
  }
  revalidatePath('/admin/transactions');
  return { success: true };
}

export interface RecordPaymentInput {
  eventId: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string | null;
  proofOfPaymentUrl?: string | null;
  internalNotes?: string | null;
}

/**
 * Records a manual payout and, because that recording IS the admin's
 * confirmation that money was actually sent, immediately sends the
 * settlement statement — the platform never sends it before this point.
 */
export async function recordPaymentAction(input: RecordPaymentInput) {
  const profile = await requireAdmin();
  const { settlement, payout } = await recordPayout({ ...input, recordedBy: profile.id });
  const sendResult = await sendSettlementStatement(settlement.id, { payoutRecordId: payout.id });
  revalidatePath('/admin/transactions');
  return { success: true, sendResult };
}

export async function resendStatementAction(settlementId: string) {
  await requireAdmin();
  const result = await sendSettlementStatement(settlementId, { isResend: true });
  revalidatePath('/admin/transactions');
  return result;
}

export async function markDisputedAction(settlementId: string, reason: string) {
  const profile = await requireAdmin();
  await markSettlementDisputed(settlementId, profile.id, reason);
  revalidatePath('/admin/transactions');
  return { success: true };
}

export async function addNoteAction(settlementId: string, note: string) {
  const profile = await requireAdmin();
  await addSettlementInternalNote(settlementId, profile.id, note);
  revalidatePath('/admin/transactions');
  return { success: true };
}

export async function getPayoutHistoryAction(settlementId: string) {
  await requireAdmin();
  return getPayoutHistory(settlementId);
}

export async function getEventCalculationAction(eventId: string) {
  await requireAdmin();
  return computeEventFinancials(eventId);
}

export async function downloadStatementAction(settlementId: string) {
  await requireAdmin();
  return downloadSettlementStatementPdf(settlementId);
}

export async function getPayoutProofSignedUrlAction(path: string): Promise<string | null> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { data } = await supabase.storage.from(PAYOUT_PROOFS_BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

export async function getOrganizationOptionsAction() {
  await requireAdmin();
  const { data } = await getOrganizations({ page_size: 500 });
  return data.map((o) => ({ label: o.name, value: o.id }));
}

export async function exportTransactionsAction(filters: { search?: string; organizationId?: string; status?: string }) {
  await requireAdmin();
  const listFilters: SettlementListFilters = {
    search: filters.search || undefined,
    organizationId: filters.organizationId || undefined,
    status: (filters.status || undefined) as SettlementStatus | 'pending_calculation' | undefined,
    page: 1,
    page_size: 10000,
  };
  const { data } = await getSettlementsForAdmin(listFilters);

  const headers = [
    'Event',
    'Organization',
    'Start date',
    'Paid tickets',
    'Free tickets',
    'Gross revenue (EGP)',
    'Commission %',
    'Commission source',
    'Percentage commission (EGP)',
    'Fixed fee/ticket (EGP)',
    'Fixed fee total (EGP)',
    'Total platform fees (EGP)',
    'Organizer net profit (EGP)',
    'Amount paid (EGP)',
    'Remaining due (EGP)',
    'Settlement status',
  ];
  const rows = data.map((r) => [
    r.event.title,
    r.organization.name,
    r.event.start_date,
    r.computed.paidTicketCount,
    r.computed.freeTicketCount,
    r.computed.grossTicketRevenue,
    r.computed.appliedCommissionPercentage,
    r.computed.commissionSource,
    r.computed.percentageCommissionAmount,
    r.computed.fixedFeePerPaidTicket,
    r.computed.fixedTicketFeeAmount,
    r.computed.totalPlatformFees,
    r.computed.organizerNetProfit,
    r.settlement?.amount_paid_to_organizer ?? 0,
    r.settlement?.remaining_amount_due ?? r.computed.organizerNetProfit,
    r.settlement?.settlement_status ?? 'pending_calculation',
  ]);

  return { csv: toCSV(headers, rows) };
}
