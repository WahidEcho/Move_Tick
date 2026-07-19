
-- W9 (2026-07-16): contract publish-gate toggle (default OFF until DocuSign live).
-- Applied to prod via Supabase MCP as `w9_contract_gate`.
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS contract_required BOOLEAN NOT NULL DEFAULT FALSE;

-- W6 (2026-07-16): second admin tier — 'support' views the admin console,
-- mutations still require full 'admin'. Applied via MCP as `w6_support_admin_role`.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_platform_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_platform_role_check
  CHECK (platform_role IN ('attendee','organizer','admin','support'));
