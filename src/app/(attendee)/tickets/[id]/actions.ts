'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { createRefundRequest } from '@/services/refunds.service';

export async function requestRefundAction(paymentId: string, reason: string) {
  const profile = await requireAuth();
  const result = await createRefundRequest({ paymentId, userId: profile.id, reason });
  if (result.success) revalidatePath('/tickets');
  return result;
}
