-- ============================================================================
-- Migration: guest tickets (admin invitations that issue a ticket with no account)
-- Date: 2026-07-03
-- ============================================================================
-- Admin-sent invitations can now deliver a real, scannable ticket to a guest
-- who has NOT signed up. Such tickets have no profile, so:
--   * tickets.user_id becomes nullable and we add guest_name/guest_email/invitation_id
--   * a CHECK guarantees every ticket has either a user OR a guest email
--   * the movement / redeem tables allow a null user_id (guest scans)
--   * issue_guest_ticket() mirrors issue_ticket() but for a guest
--   * the scanner RPCs fall back to guest identity and no longer treat a null
--     user_id as "ticket not found"
-- Idempotent.
-- ============================================================================

-- ---------- tickets: guest columns ----------
ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES event_invitations(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_user_or_guest_chk'
  ) THEN
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_user_or_guest_chk
      CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL);
  END IF;
END $$;

-- ---------- movement / redeem tables: allow null user for guests ----------
ALTER TABLE event_movements ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE space_movements ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE redeem_logs     ALTER COLUMN user_id DROP NOT NULL;

-- ---------- issue_guest_ticket: atomic issuance for a guest ----------
CREATE OR REPLACE FUNCTION issue_guest_ticket(
  p_event_id        UUID,
  p_ticket_type_id  UUID,
  p_guest_email     TEXT,
  p_guest_name      TEXT,
  p_invitation_id   UUID,
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
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TICKET_TYPE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_capacity IS NOT NULL AND v_sold >= v_capacity THEN
    RAISE EXCEPTION 'TICKET_TYPE_SOLD_OUT' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO tickets (event_id, ticket_type_id, user_id, guest_email, guest_name,
                       invitation_id, qr_token, qr_code, is_active, issued_at)
  VALUES (p_event_id, p_ticket_type_id, NULL, p_guest_email, p_guest_name,
          p_invitation_id, p_qr_token, p_qr_code, TRUE, NOW())
  RETURNING * INTO v_ticket;

  UPDATE ticket_types
     SET sold_count = sold_count + 1, updated_at = NOW()
   WHERE id = p_ticket_type_id;

  RETURN v_ticket;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION issue_guest_ticket(UUID, UUID, TEXT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION issue_guest_ticket(UUID, UUID, TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated, service_role;

-- ---------- scanner RPCs: support guest tickets ----------
-- build_scan_result: LEFT JOIN profiles so guest tickets resolve, and fall back
-- to the guest name/email captured on the ticket.
CREATE OR REPLACE FUNCTION build_scan_result(p_qr_code TEXT, p_event_id UUID)
RETURNS JSON AS $$
DECLARE
  v JSON;
BEGIN
  SELECT json_build_object(
    'ticket_id',          t.id,
    'attendee_name',      COALESCE(p.full_name, p.email, t.guest_name, t.guest_email),
    'attendee_email',     COALESCE(p.email, t.guest_email),
    'ticket_type_name',   tt.name,
    'event_id',           t.event_id,
    'event_title',        e.title,
    'ticket_status',      CASE WHEN t.is_active THEN 'active' ELSE 'revoked' END,
    'is_checked_in',      COALESCE(lm.movement_type = 'check_in', FALSE),
    'last_movement_at',   lm.scanned_at,
    'last_movement_type', lm.movement_type
  )
  INTO v
  FROM tickets t
  LEFT JOIN profiles p ON p.id = t.user_id
  JOIN ticket_types tt ON tt.id = t.ticket_type_id
  JOIN events e        ON e.id = t.event_id
  LEFT JOIN LATERAL (
    SELECT em.movement_type, em.scanned_at
    FROM event_movements em
    WHERE em.ticket_id = t.id
    ORDER BY em.scanned_at DESC
    LIMIT 1
  ) lm ON TRUE
  WHERE t.qr_token = p_qr_code;

  IF v IS NULL THEN
    RAISE EXCEPTION 'TICKET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF (v->>'event_id')::UUID <> p_event_id THEN
    RAISE EXCEPTION 'TICKET_WRONG_EVENT' USING ERRCODE = 'P0001';
  END IF;
  IF (v->>'ticket_status') <> 'active' THEN
    RAISE EXCEPTION 'TICKET_INACTIVE' USING ERRCODE = 'P0001';
  END IF;

  RETURN v;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- record_gate_movement: check ticket existence via FOUND (not user_id), so a
-- guest ticket (null user_id) still records movements.
CREATE OR REPLACE FUNCTION record_gate_movement(
  p_ticket_id     UUID,
  p_event_id      UUID,
  p_movement_type TEXT,
  p_scanned_by    UUID
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_row     event_movements%ROWTYPE;
BEGIN
  IF NOT can_operate_event(p_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  IF p_movement_type NOT IN ('check_in', 'check_out') THEN
    RAISE EXCEPTION 'INVALID_MOVEMENT_TYPE' USING ERRCODE = 'P0001';
  END IF;

  SELECT user_id INTO v_user_id FROM tickets
  WHERE id = p_ticket_id AND event_id = p_event_id AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TICKET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO event_movements (event_id, ticket_id, user_id, movement_type,
                               scanned_by, scanned_at, is_system_generated)
  VALUES (p_event_id, p_ticket_id, v_user_id, p_movement_type,
          p_scanned_by, NOW(), FALSE)
  RETURNING * INTO v_row;

  RETURN json_build_object(
    'success', TRUE,
    'movement_id', v_row.id,
    'movement_type', v_row.movement_type,
    'scanned_at', v_row.scanned_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_space_movement(
  p_ticket_id     UUID,
  p_space_id      UUID,
  p_event_id      UUID,
  p_movement_type TEXT,
  p_scanned_by    UUID
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_row     space_movements%ROWTYPE;
BEGIN
  IF NOT can_operate_event(p_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  IF p_movement_type NOT IN ('check_in', 'check_out') THEN
    RAISE EXCEPTION 'INVALID_MOVEMENT_TYPE' USING ERRCODE = 'P0001';
  END IF;

  SELECT user_id INTO v_user_id FROM tickets
  WHERE id = p_ticket_id AND event_id = p_event_id AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TICKET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO space_movements (space_id, event_id, ticket_id, user_id,
                               movement_type, scanned_by, scanned_at)
  VALUES (p_space_id, p_event_id, p_ticket_id, v_user_id,
          p_movement_type, p_scanned_by, NOW())
  RETURNING * INTO v_row;

  RETURN json_build_object(
    'success', TRUE,
    'movement_id', v_row.id,
    'movement_type', v_row.movement_type,
    'scanned_at', v_row.scanned_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
