import { createServiceClient } from '@/lib/supabase-server';

export interface Coupon {
  id: string;
  event_id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_redemptions: number | null;
  times_redeemed: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface CreateCouponData {
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_redemptions?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
}

export async function createCoupon(eventId: string, data: CreateCouponData): Promise<Coupon> {
  const supabase = createServiceClient();
  if (data.discount_type === 'percent' && (data.discount_value <= 0 || data.discount_value > 100)) {
    throw new Error('Percent discount must be between 1 and 100');
  }
  const { data: row, error } = await supabase
    .from('coupons')
    .insert({
      event_id: eventId,
      code: data.code.trim(),
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      max_redemptions: data.max_redemptions ?? null,
      valid_from: data.valid_from ?? null,
      valid_until: data.valid_until ?? null,
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('A coupon with this code already exists for this event');
    throw new Error(`Failed to create coupon: ${error.message}`);
  }
  return row as Coupon;
}

export async function getEventCoupons(eventId: string): Promise<Coupon[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch coupons: ${error.message}`);
  return (data ?? []) as Coupon[];
}

export async function setCouponActive(couponId: string, isActive: boolean): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from('coupons').update({ is_active: isActive }).eq('id', couponId);
  if (error) throw new Error(`Failed to update coupon: ${error.message}`);
}

export async function deleteCoupon(couponId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from('coupons').delete().eq('id', couponId);
  if (error) throw new Error(`Failed to delete coupon: ${error.message}`);
}

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  couponId?: string;
  /** Per-ticket price after discount, in MINOR units (piaster). */
  discountedUnitMinor?: number;
  discountLabel?: string;
}

/**
 * Validate a coupon against an event + ticket type and compute the discounted
 * per-ticket price (minor units). Server-side only (service client). Returns a
 * structured result rather than throwing on user-facing validation failures.
 */
export async function validateCoupon(
  eventId: string,
  ticketTypeId: string,
  code: string
): Promise<CouponValidation> {
  const supabase = createServiceClient();

  const { data: tt } = await supabase
    .from('ticket_types')
    .select('price')
    .eq('id', ticketTypeId)
    .eq('event_id', eventId)
    .single();
  if (!tt) return { valid: false, reason: 'Ticket type not found' };

  const priceMajor = Number(tt.price ?? 0);
  const baseMinor = Math.round(priceMajor * 100);

  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('event_id', eventId)
    .ilike('code', code.trim())
    .maybeSingle();

  if (!coupon) return { valid: false, reason: 'Invalid code' };
  const c = coupon as Coupon;

  if (!c.is_active) return { valid: false, reason: 'This code is no longer active' };
  const now = Date.now();
  if (c.valid_from && new Date(c.valid_from).getTime() > now) {
    return { valid: false, reason: 'This code is not yet valid' };
  }
  if (c.valid_until && new Date(c.valid_until).getTime() < now) {
    return { valid: false, reason: 'This code has expired' };
  }
  if (c.max_redemptions != null && c.times_redeemed >= c.max_redemptions) {
    return { valid: false, reason: 'This code has reached its usage limit' };
  }

  let discountedMinor: number;
  let label: string;
  if (c.discount_type === 'percent') {
    discountedMinor = Math.round(baseMinor * (1 - c.discount_value / 100));
    label = `${c.discount_value}% off`;
  } else {
    discountedMinor = Math.max(0, baseMinor - Math.round(c.discount_value * 100));
    label = `${c.discount_value} EGP off`;
  }

  return {
    valid: true,
    couponId: c.id,
    discountedUnitMinor: discountedMinor,
    discountLabel: label,
  };
}
