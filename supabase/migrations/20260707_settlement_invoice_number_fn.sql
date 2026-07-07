-- ============================================================================
-- Round 6 / C3: invoice numbering helper.
--
-- supabase-js can't call nextval() on a sequence directly, so this wraps it in
-- a SECURITY DEFINER function that returns the formatted invoice number
-- MT-INV-{YYYY}-{0001}. Idempotent — safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION next_settlement_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('settlement_invoice_seq');
  RETURN 'MT-INV-' || to_char(NOW(), 'YYYY') || '-' || lpad(seq_val::text, 4, '0');
END;
$$;
