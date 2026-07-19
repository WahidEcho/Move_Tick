'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/lib/auth';
import { decideRefundRequest } from '@/services/refunds.service';

export async function decideRefundAction(requestId: string, approve: boolean, decisionNote?: string | null) {
  const profile = await requireSuperAdmin();
  const result = await decideRefundRequest({ requestId, approve, decisionNote, actorId: profile.id });
  if (result.success) revalidatePath('/admin/refunds');
  return result;
}
