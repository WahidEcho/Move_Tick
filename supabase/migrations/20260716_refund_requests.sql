-- W4 (2026-07-16): attendee refund requests with super-admin approve/reject.
-- Also links paid tickets to their payment so a refund can deactivate exactly
-- the tickets that were bought in that transaction.
-- Applied to prod via Supabase MCP as `w4_refund_requests`.

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);
CREATE INDEX IF NOT EXISTS idx_tickets_payment ON tickets(payment_id);

CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  event_id UUID NOT NULL REFERENCES events(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by UUID REFERENCES profiles(id),
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one open request per payment at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_refund_request_pending
  ON refund_requests(payment_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status, created_at DESC);

ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Requester sees their own; org members see their events'; admins see all.
-- All writes go through the service role (server actions) only.
CREATE POLICY refund_requests_select ON refund_requests FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR is_platform_admin() OR is_org_member(organization_id));
