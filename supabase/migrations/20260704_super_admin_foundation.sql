-- Applied to production 2026-07-04 as super_admin_foundation.
-- ============================================================================
-- Round 5 / S1: Foundation for super-admin control center
-- - platform_settings (singleton config: fees, expiry buffer, defaults)
-- - notifications (in-app notification center)
-- - admin_audit_log (every sensitive admin action)
-- - email_log (every outbound email attempt, success or failure)
-- - contracts (DocuSign scaffold only — no live integration yet)
-- - organizations: status/limits/commission/contact/soft-delete columns
-- - events: is_hidden (manual admin hide) + archived_at (soft delete)
-- - profiles: is_disabled (account disable, distinct from Supabase auth ban)
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------- platform_settings (singleton row) ----------
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  fixed_fee_egp NUMERIC(10,2) NOT NULL DEFAULT 10,
  event_expiry_buffer_hours INTEGER NOT NULL DEFAULT 2,
  default_timezone TEXT NOT NULL DEFAULT 'Africa/Cairo',
  org_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  default_max_events INTEGER,
  default_event_duration_hours INTEGER,
  support_email TEXT NOT NULL DEFAULT 'info@mbeg.org',
  admin_alert_email TEXT NOT NULL DEFAULT 'm.wahid@mbeg.org',
  public_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (id)
SELECT uuid_generate_v4()
WHERE NOT EXISTS (SELECT 1 FROM platform_settings);

DROP TRIGGER IF EXISTS platform_settings_updated_at ON platform_settings;
CREATE TRIGGER platform_settings_updated_at BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_settings_select_admin" ON platform_settings;
CREATE POLICY "platform_settings_select_admin" ON platform_settings
  FOR SELECT TO authenticated USING (is_platform_admin());
DROP POLICY IF EXISTS "platform_settings_update_admin" ON platform_settings;
CREATE POLICY "platform_settings_update_admin" ON platform_settings
  FOR UPDATE TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- ---------- notifications (in-app notification center) ----------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE NOT is_read;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_platform_admin());
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- Inserts happen only via the service-role client (server actions) — no
-- authenticated INSERT policy, so a user can never fabricate notifications.

-- ---------- admin_audit_log ----------
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_select_admin" ON admin_audit_log;
CREATE POLICY "audit_log_select_admin" ON admin_audit_log
  FOR SELECT TO authenticated USING (is_platform_admin());
-- No client-side INSERT/UPDATE/DELETE policy at all — writes are
-- service-role only (logAdminAction), so the trail can't be tampered with.

-- ---------- email_log ----------
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  related_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('sent', 'failed')),
  failure_reason TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_sent ON email_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(delivery_status);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_log_select_admin" ON email_log;
CREATE POLICY "email_log_select_admin" ON email_log
  FOR SELECT TO authenticated USING (is_platform_admin());

-- ---------- contracts (DocuSign scaffold — no live logic yet) ----------
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  contract_template_id TEXT,
  docusign_envelope_id TEXT,
  docusign_signing_url TEXT,
  contract_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    contract_status IN ('draft', 'generated', 'sent', 'viewed', 'signed', 'completed', 'declined', 'expired', 'failed')
  ),
  commission_percentage NUMERIC(5,2),
  fixed_fee_per_paid_ticket NUMERIC(10,2),
  generated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(organization_id);

DROP TRIGGER IF EXISTS contracts_updated_at ON contracts;
CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contracts_select_admin_or_org" ON contracts;
CREATE POLICY "contracts_select_admin_or_org" ON contracts
  FOR SELECT TO authenticated USING (is_platform_admin() OR is_org_member(organization_id));

-- ---------- organizations: status, limits, commission, contact, soft delete ----------
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'suspended', 'on_hold', 'rejected')),
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS max_events INTEGER,
  ADD COLUMN IF NOT EXISTS max_published_events INTEGER,
  ADD COLUMN IF NOT EXISTS can_create_paid BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS requires_publish_approval BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS fixed_fee_egp NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS hide_events_on_suspend BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_archived ON organizations(archived_at) WHERE archived_at IS NOT NULL;

-- ---------- events: manual hide + soft delete ----------
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_hidden ON events(is_hidden) WHERE is_hidden;
CREATE INDEX IF NOT EXISTS idx_events_archived ON events(archived_at) WHERE archived_at IS NOT NULL;

-- ---------- profiles: account disable ----------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_disabled ON profiles(is_disabled) WHERE is_disabled;
