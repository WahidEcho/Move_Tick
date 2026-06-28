-- ============================================================================
-- Migration: atomic ticket issuance
-- Date: 2026-06-23
-- ============================================================================
-- Replaces the read-check-insert-update sequence in tickets.service.ts, which
-- had a lost-update / oversell race: two concurrent buyers could both read the
-- same sold_count, both pass the capacity check, and both insert a ticket.
--
-- This function does it atomically: it locks the ticket_types row (FOR UPDATE),
-- re-checks capacity under the lock, inserts the ticket, and increments
-- sold_count -- all in a single transaction. The QR token + image are still
-- generated in Node (qrcode lib) and passed in.
-- ============================================================================
CREATE OR REPLACE FUNCTION issue_ticket(
  p_event_id        UUID,
  p_ticket_type_id  UUID,
  p_user_id         UUID,
  p_qr_token        TEXT,
  p_qr_code         TEXT
) RETURNS tickets AS $$
DECLARE
  v_capacity INTEGER;
  v_sold     INTEGER;
  v_ticket   tickets;
BEGIN
  SELECT capacity, sold_count
    INTO v_capacity, v_sold
  FROM ticket_types
  WHERE id = p_ticket_type_id AND event_id = p_event_id
  FOR UPDATE;                       -- serialize concurrent issuance on this row

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TICKET_TYPE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_capacity IS NOT NULL AND v_sold >= v_capacity THEN
    RAISE EXCEPTION 'TICKET_TYPE_SOLD_OUT' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO tickets (event_id, ticket_type_id, user_id, qr_token, qr_code,
                       is_active, issued_at)
  VALUES (p_event_id, p_ticket_type_id, p_user_id, p_qr_token, p_qr_code,
          TRUE, NOW())
  RETURNING * INTO v_ticket;

  UPDATE ticket_types
     SET sold_count = sold_count + 1, updated_at = NOW()
   WHERE id = p_ticket_type_id;

  RETURN v_ticket;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION issue_ticket(UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION issue_ticket(UUID, UUID, UUID, TEXT, TEXT) TO authenticated, service_role;
