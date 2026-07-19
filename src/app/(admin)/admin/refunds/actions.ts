'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { decideRefundRequest } from '@/services/refunds.service';

export async function decideRefundAction(requestId: string, approve: boolean, decisionNote?: string | null) {
  const profile = await requireAdmin();
  const result = await decideRefundRequest({ requestId, approve, decisionNote, actorId: profile.id });
  if (result.success) revalidatePath('/admin/refunds');
  return result;
}
