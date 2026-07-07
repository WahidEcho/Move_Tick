-- ============================================================================
-- Round 6 / C1: Event commission, financial settlements, organizer payouts,
-- and settlement invoice logs.
--
-- Money columns are stored in EGP major units (NUMERIC(12,2)) here, unlike
-- `payments.amount_total` which is in piasters (minor units) — settlements
-- are a computed/derived reporting layer, converted at calc time.
--
-- RLS: admin-only SELECT on all four tables, no org-member policies at all.
-- Organizers see their own settlements via a service-role server action that
-- explicitly selects only the safe columns (excludes internal_notes and any
-- other-org data) — the same pattern already used platform-wide, since RLS
-- can't mask individual columns.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------- event_commission_settings (1 row per event, optional) ----------
CREATE TABLE IF NOT EXISTS event_commission_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  custom_commission_percentage NUMERIC(5,2),
  custom_fixed_fee_egp NUMERIC(10,2),
  is_custom_commission_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  applied_commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  applied_fixed_fee_egp NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_source TEXT NOT NULL DEFAULT 'default_platform_commission'
    CHECK (commission_source IN ('custom_event_commission', 'organization_override', 'default_platform_commission')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS event_commission_settings_updated_at ON event_commission_settings;
CREATE TRIGGER event_commission_settings_updated_at BEFORE UPDATE ON event_commission_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE event_commission_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_settings_select_admin" ON event_commission_settings;
CREATE POLICY "commission_settings_select_admin" ON event_commission_settings
  FOR SELECT TO authenticated USING (is_platform_admin());

-- ---------- event_financial_settlements (1 row per event, created on first calc) ----------
CREATE TABLE IF NOT EXISTS event_financial_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  gross_ticket_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_ticket_count INTEGER NOT NULL DEFAULT 0,
  free_ticket_count INTEGER NOT NULL DEFAULT 0,
  applied_commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_source TEXT NOT NULL DEFAULT 'default_platform_commission',
  percentage_commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  fixed_fee_per_paid_ticket NUMERIC(10,2) NOT NULL DEFAULT 0,
  fixed_ticket_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_gateway_fees NUMERIC(12,2),
  taxes_amount NUMERIC(12,2),
  total_platform_fees NUMERIC(12,2) NOT NULL DEFAULT 0,
  organizer_net_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid_to_organizer NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  settlement_status TEXT NOT NULL DEFAULT 'ready_for_payment' CHECK (
    settlement_status IN (
      'pending_calculation', 'ready_for_payment', 'partially_paid',
      'paid', 'invoice_sent', 'completed', 'disputed', 'cancelled'
    )
  ),
  internal_notes TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlements_org ON event_financial_settlements(organization_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON event_financial_settlements(settlement_status);

DROP TRIGGER IF EXISTS event_financial_settlements_updated_at ON event_financial_settlements;
CREATE TRIGGER event_financial_settlements_updated_at BEFORE UPDATE ON event_financial_settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE event_financial_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settlements_select_admin" ON event_financial_settlements;
CREATE POLICY "settlements_select_admin" ON event_financial_settlements
  FOR SELECT TO authenticated USING (is_platform_admin());

-- ---------- organizer_payout_records ----------
CREATE TABLE IF NOT EXISTS organizer_payout_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  settlement_id UUID NOT NULL REFERENCES event_financial_settlements(id) ON DELETE CASCADE,
  amount_paid NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  proof_of_payment_url TEXT,
  internal_notes TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_records_settlement ON organizer_payout_records(settlement_id);
CREATE INDEX IF NOT EXISTS idx_payout_records_org ON organizer_payout_records(organization_id);

DROP TRIGGER IF EXISTS organizer_payout_records_updated_at ON organizer_payout_records;
CREATE TRIGGER organizer_payout_records_updated_at BEFORE UPDATE ON organizer_payout_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE organizer_payout_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payout_records_select_admin" ON organizer_payout_records;
CREATE POLICY "payout_records_select_admin" ON organizer_payout_records
  FOR SELECT TO authenticated USING (is_platform_admin());

-- ---------- settlement_invoice_logs ----------
CREATE TABLE IF NOT EXISTS settlement_invoice_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  settlement_id UUID NOT NULL REFERENCES event_financial_settlements(id) ON DELETE CASCADE,
  payout_record_id UUID REFERENCES organizer_payout_records(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  invoice_status TEXT NOT NULL DEFAULT 'generated' CHECK (
    invoice_status IN ('generated', 'sent', 'failed', 'resent')
  ),
  recipient_email TEXT NOT NULL,
  email_sent_at TIMESTAMPTZ,
  pdf_generated BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_logs_settlement ON settlement_invoice_logs(settlement_id);

DROP TRIGGER IF EXISTS settlement_invoice_logs_updated_at ON settlement_invoice_logs;
CREATE TRIGGER settlement_invoice_logs_updated_at BEFORE UPDATE ON settlement_invoice_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE settlement_invoice_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_logs_select_admin" ON settlement_invoice_logs;
CREATE POLICY "invoice_logs_select_admin" ON settlement_invoice_logs
  FOR SELECT TO authenticated USING (is_platform_admin());

-- ---------- invoice numbering ----------
CREATE SEQUENCE IF NOT EXISTS settlement_invoice_seq START 1;

-- ---------- storage: proof-of-payment uploads (private, admin-only) ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'payout-proofs', 'payout-proofs', false, 10485760,
       ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'payout-proofs');

DROP POLICY IF EXISTS "payout_proofs_admin_all" ON storage.objects;
CREATE POLICY "payout_proofs_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'payout-proofs' AND is_platform_admin())
  WITH CHECK (bucket_id = 'payout-proofs' AND is_platform_admin());
