-- ============================================================================
-- Migration: Harden SECURITY DEFINER functions
-- Date: 2026-06-23
-- ============================================================================
-- Follows up the RLS + scanner-RPC migrations. The Supabase security advisor
-- flagged the new SECURITY DEFINER functions for:
--   * function_search_path_mutable  -> pin search_path (privilege-escalation guard)
--   * anon_security_definer_function_executable -> anon could call them by default
-- This migration pins search_path and tightens EXECUTE grants:
--   * build_scan_result / can_operate_event become internal-only (no client role).
--   * scanner RPCs + RLS helpers are restricted to the authenticated role.
-- ============================================================================

ALTER FUNCTION is_org_member(UUID)            SET search_path = public, pg_temp;
ALTER FUNCTION is_org_admin(UUID)             SET search_path = public, pg_temp;
ALTER FUNCTION is_org_manager_or_above(UUID)  SET search_path = public, pg_temp;
ALTER FUNCTION get_user_org_ids()             SET search_path = public, pg_temp;
ALTER FUNCTION is_event_staff(UUID)           SET search_path = public, pg_temp;
ALTER FUNCTION get_event_org_id(UUID)         SET search_path = public, pg_temp;
ALTER FUNCTION can_operate_event(UUID)        SET search_path = public, pg_temp;
ALTER FUNCTION build_scan_result(TEXT, UUID)  SET search_path = public, pg_temp;
ALTER FUNCTION validate_gate_scan(TEXT, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION record_gate_movement(UUID, UUID, TEXT, UUID)        SET search_path = public, pg_temp;
ALTER FUNCTION validate_space_scan(TEXT, UUID, UUID)              SET search_path = public, pg_temp;
ALTER FUNCTION record_space_movement(UUID, UUID, UUID, TEXT, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION validate_redeem_scan(TEXT, UUID)                   SET search_path = public, pg_temp;
ALTER FUNCTION redeem_item(UUID, UUID, UUID)                      SET search_path = public, pg_temp;

-- Internal-only helpers (still callable internally by the definer wrappers).
REVOKE ALL ON FUNCTION build_scan_result(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION can_operate_event(UUID)       FROM PUBLIC, anon, authenticated;

-- Scanner RPCs: authenticated only.
REVOKE ALL ON FUNCTION validate_gate_scan(TEXT, UUID)                      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION record_gate_movement(UUID, UUID, TEXT, UUID)        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION validate_space_scan(TEXT, UUID, UUID)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION record_space_movement(UUID, UUID, UUID, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION validate_redeem_scan(TEXT, UUID)                   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION redeem_item(UUID, UUID, UUID)                      FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION validate_gate_scan(TEXT, UUID)                      TO authenticated;
GRANT EXECUTE ON FUNCTION record_gate_movement(UUID, UUID, TEXT, UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION validate_space_scan(TEXT, UUID, UUID)              TO authenticated;
GRANT EXECUTE ON FUNCTION record_space_movement(UUID, UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_redeem_scan(TEXT, UUID)                   TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_item(UUID, UUID, UUID)                      TO authenticated;

-- RLS helper fns: authenticated only (evaluated during RLS policy checks).
REVOKE ALL ON FUNCTION is_org_member(UUID)           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION is_org_admin(UUID)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION is_org_manager_or_above(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_user_org_ids()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION is_event_staff(UUID)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_event_org_id(UUID)        FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_org_member(UUID)           TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_admin(UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_manager_or_above(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_org_ids()            TO authenticated;
GRANT EXECUTE ON FUNCTION is_event_staff(UUID)          TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_org_id(UUID)        TO authenticated;
