
-- W9 (2026-07-16): contract publish-gate toggle (default OFF until DocuSign live).
-- Applied to prod via Supabase MCP as `w9_contract_gate`.
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS contract_required BOOLEAN NOT NULL DEFAULT FALSE;
