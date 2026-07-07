'use server';

import { getOrganizerContext } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { downloadSettlementStatementPdf } from '@/services/settlements.service';

/** Regenerates a settlement statement PDF for download — refuses any settlement outside the caller's own organization. */
export async function downloadOrganizerStatementAction(settlementId: string) {
  const { org } = await getOrganizerContext();
  if (!org) return null;

  const supabase = createServiceClient();
  const { data: settlement } = await supabase
    .from('event_financial_settlements')
    .select('organization_id')
    .eq('id', settlementId)
    .maybeSingle();
  if (!settlement || settlement.organization_id !== org.id) return null;

  return downloadSettlementStatementPdf(settlementId);
}
