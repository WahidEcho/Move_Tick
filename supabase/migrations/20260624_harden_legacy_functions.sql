-- ============================================================================
-- Migration: harden pre-existing functions flagged by the security advisor
-- Date: 2026-06-24
-- ============================================================================
ALTER FUNCTION handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION is_platform_admin() SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;
