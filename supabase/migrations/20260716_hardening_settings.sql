-- W0 (2026-07-16): security hardening + finalized platform settings.
-- From PROJECT_FINALIZATION_QA.md answers: 3.2, 3.3, 3.7, 2.2, 4.3a, 2.5 groundwork.
-- Applied to prod via Supabase MCP as `w0_hardening_and_settings`.

-- 3.2 — trigger/service-only helpers must not be callable by anon (or any client).
-- Trigger execution does not check EXECUTE privilege, so triggers keep working.
REVOKE ALL ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION notify_followers_on_publish() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION next_settlement_invoice_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION next_settlement_invoice_number() TO service_role;

-- 3.3 — pin search_path on the remaining SECURITY DEFINER scan functions.
ALTER FUNCTION record_gate_movement(uuid, uuid, text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION record_space_movement(uuid, uuid, uuid, text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION build_scan_result(text, uuid) SET search_path = public, pg_temp;

-- 3.7 — processed_webhook_events was never wired up; idempotency is handled by
-- the atomic payments pending->paid claim. Dead code, drop it.
-- (pg_trgm stays in public deliberately: search_event_attendees pins
-- search_path=public and would lose similarity() if the extension moved.)
DROP TABLE IF EXISTS processed_webhook_events;

-- 2.2 — real platform default commission: 5% (per-org/per-event overrides exist).
-- 4.3a — newly approved organizations start at 2 events.
UPDATE platform_settings SET commission_percentage = 5, default_max_events = 2;

-- 2.5 groundwork — XPay's own deduction model (2% + 2 EGP per transaction),
-- editable in admin settings, used by the gateway reconciliation view.
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS xpay_fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS xpay_fee_fixed_egp NUMERIC(10,2) NOT NULL DEFAULT 2;
