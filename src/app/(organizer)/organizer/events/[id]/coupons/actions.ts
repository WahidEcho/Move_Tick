'use server';

import { revalidatePath } from 'next/cache';
import { getEventManageAccess } from '@/lib/auth';
import {
  createCoupon,
  setCouponActive,
  deleteCoupon,
  type CreateCouponData,
} from '@/services/coupons.service';

async function assertOwnsEvent(eventId: string): Promise<void> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    throw new Error('Not authorized for this event');
  }
}

export type ActionResult = { success: true } | { success: false; message: string };

export async function createCouponAction(
  eventId: string,
  data: CreateCouponData
): Promise<ActionResult> {
  try {
    await assertOwnsEvent(eventId);
    await createCoupon(eventId, data);
    revalidatePath(`/organizer/events/${eventId}/coupons`);
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Failed to create code' };
  }
}

export async function toggleCouponAction(
  eventId: string,
  couponId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await assertOwnsEvent(eventId);
    await setCouponActive(couponId, isActive);
    revalidatePath(`/organizer/events/${eventId}/coupons`);
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Failed to update code' };
  }
}

export async function deleteCouponAction(
  eventId: string,
  couponId: string
): Promise<ActionResult> {
  try {
    await assertOwnsEvent(eventId);
    await deleteCoupon(couponId);
    revalidatePath(`/organizer/events/${eventId}/coupons`);
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Failed to delete code' };
  }
}
