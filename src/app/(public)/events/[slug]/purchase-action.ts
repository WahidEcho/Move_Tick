'use server';

import { createCheckoutForTickets } from '@/services/payments.service';
import { validateCoupon } from '@/services/coupons.service';
import { isXpayConfigured } from '@/lib/xpay/client';

export type StartPurchaseResult =
  | { success: true; url: string }
  | { success: false; message: string };

/**
 * Start a paid ticket purchase: returns an XPay Hosted Checkout URL for the
 * client to redirect to. Free ticket types must use registerForEvent instead.
 */
export async function startTicketPurchase(
  eventId: string,
  ticketTypeId: string,
  userId: string,
  quantity: number,
  couponCode?: string | null
): Promise<StartPurchaseResult> {
  if (!isXpayConfigured()) {
    return { success: false, message: 'Online payments are not available yet. Please check back soon.' };
  }
  const result = await createCheckoutForTickets({
    eventId,
    ticketTypeId,
    userId,
    quantity: Math.max(1, Math.floor(quantity)),
    couponCode,
  });
  if (!result.success) return { success: false, message: result.message };
  return { success: true, url: result.url };
}

export interface CouponPreview {
  valid: boolean;
  message?: string;
  discountedUnitMajor?: number; // EGP
  discountLabel?: string;
}

/** Live promo-code preview for the buy dialog (does not redeem). */
export async function previewCoupon(
  eventId: string,
  ticketTypeId: string,
  code: string
): Promise<CouponPreview> {
  if (!code.trim()) return { valid: false };
  const v = await validateCoupon(eventId, ticketTypeId, code);
  if (!v.valid) return { valid: false, message: v.reason };
  return {
    valid: true,
    discountedUnitMajor: (v.discountedUnitMinor ?? 0) / 100,
    discountLabel: v.discountLabel,
  };
}
