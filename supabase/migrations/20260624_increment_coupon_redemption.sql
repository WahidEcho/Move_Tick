-- Atomic coupon redemption counter (server-side, at payment fulfillment).
CREATE OR REPLACE FUNCTION increment_coupon_redemption(p_coupon_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons SET times_redeemed = times_redeemed + 1, updated_at = NOW()
   WHERE id = p_coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION increment_coupon_redemption(UUID) FROM PUBLIC, anon, authenticated;
