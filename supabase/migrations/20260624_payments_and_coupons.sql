-- ============================================================================
-- Phase 3: XPay payments + organizer promo codes
-- ============================================================================
-- Money: ticket_types.price + coupons.discount_value are NUMERIC MAJOR units (EGP);
-- payments.* amounts are INTEGER MINOR units (piaster, x100) to match XPay.
-- The paid flow is fully separate from free reservation.

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  times_redeemed INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_coupons_event ON coupons(event_id);
CREATE UNIQUE INDEX idx_coupons_event_code ON coupons(event_id, upper(code));
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  unit_amount INTEGER NOT NULL CHECK (unit_amount >= 0),
  amount_total INTEGER NOT NULL CHECK (amount_total >= 0),
  currency TEXT NOT NULL DEFAULT 'EGP',
  provider TEXT NOT NULL DEFAULT 'xpay',
  xpay_session_id TEXT UNIQUE,
  xpay_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  tickets_issued INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_event ON payments(event_id);
CREATE INDEX idx_payments_session ON payments(xpay_session_id);
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE registrations ADD COLUMN payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;

CREATE TABLE coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);

CREATE TABLE processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'xpay',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
-- processed_webhook_events: no policies => client-denied; service role bypasses.

CREATE POLICY "coupons_select" ON coupons FOR SELECT TO authenticated
  USING (is_org_member(get_event_org_id(event_id)));
CREATE POLICY "coupons_insert" ON coupons FOR INSERT TO authenticated
  WITH CHECK (is_org_member(get_event_org_id(event_id)));
CREATE POLICY "coupons_update" ON coupons FOR UPDATE TO authenticated
  USING (is_org_member(get_event_org_id(event_id)));
CREATE POLICY "coupons_delete" ON coupons FOR DELETE TO authenticated
  USING (is_org_member(get_event_org_id(event_id)));

CREATE POLICY "payments_select" ON payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(get_event_org_id(event_id)));

CREATE POLICY "coupon_redemptions_select" ON coupon_redemptions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM coupons c WHERE c.id = coupon_id AND is_org_member(get_event_org_id(c.event_id))));
