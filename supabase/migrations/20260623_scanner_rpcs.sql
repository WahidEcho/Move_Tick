-- ============================================================================
-- Migration: Scanner RPCs (gate / space / redeem)
-- Date: 2026-06-23
-- ============================================================================
-- WHY THIS EXISTS
-- The Flutter mobile app (Move_tick_App/lib/data/repositories/scanner_repository.dart)
-- calls six Postgres RPCs that were never committed to schema.sql:
--   validate_gate_scan, record_gate_movement,
--   validate_space_scan, record_space_movement,
--   validate_redeem_scan, redeem_item
-- Because they did not exist, the entire mobile check-in flow failed at runtime.
-- As a stop-gap the app shipped the Supabase SERVICE-ROLE key on-device
-- (SupabaseClientWrapper.adminClient) to bypass RLS — a critical security hole.
--
-- These functions are SECURITY DEFINER and authorize the *caller* via auth.uid().
-- => The mobile app MUST call them with the authenticated client (anon key + the
--    signed-in user's JWT), NOT the service-role admin client. Removing the
--    service-role key from the device is tracked as a Phase 1/5 task.
--
-- All objects use CREATE OR REPLACE and are safe to re-apply (idempotent).
-- Apply + verify against the live DB (project rqsfqwortwdpskfylidr) once it is
-- restored from its paused state; these were authored from code contracts, not
-- yet executed against Postgres.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Internal helper: is the caller allowed to operate on this event?
-- Active event staff for the event, OR a member of the event's organization.
-- Reuses helpers defined in fix-rls.sql (is_event_staff, is_org_member,
-- get_event_org_id) — all SECURITY DEFINER, so no RLS recursion.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_operate_event(p_event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL
     AND (is_event_staff(p_event_id) OR is_org_member(get_event_org_id(p_event_id)));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- Internal helper: build the ScanResult JSON the mobile ScanResult model expects
--   { ticket_id, attendee_name, attendee_email, ticket_type_name,
--     event_id, event_title, ticket_status,
--     is_checked_in, last_movement_at, last_movement_type }
-- Looks up the ticket by qr_token and validates it belongs to p_event_id.
-- Raises on not-found / wrong-event / inactive so the client shows an error.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION build_scan_result(p_qr_code TEXT, p_event_id UUID)
RETURNS JSON AS $$
DECLARE
  v JSON;
BEGIN
  SELECT json_build_object(
    'ticket_id',          t.id,
    'attendee_name',      COALESCE(p.full_name, p.email),
    'attendee_email',     p.email,
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
  JOIN profiles p      ON p.id = t.user_id
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

-- ============================================================================
-- 1. GATE
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_gate_scan(p_qr_code TEXT, p_event_id UUID)
RETURNS JSON AS $$
BEGIN
  IF NOT can_operate_event(p_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  RETURN build_scan_result(p_qr_code, p_event_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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
  IF v_user_id IS NULL THEN
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

-- ============================================================================
-- 2. SPACE
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_space_scan(
  p_qr_code  TEXT,
  p_space_id UUID,
  p_event_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_ticket_id UUID;
  v_mode TEXT;
BEGIN
  IF NOT can_operate_event(p_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  v_result := build_scan_result(p_qr_code, p_event_id);
  v_ticket_id := (v_result->>'ticket_id')::UUID;

  SELECT registration_mode INTO v_mode FROM spaces
  WHERE id = p_space_id AND event_id = p_event_id AND is_active;
  IF v_mode IS NULL THEN
    RAISE EXCEPTION 'SPACE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Pre-registration-only spaces require an active space_registration.
  IF v_mode = 'preregistration_required'
     AND NOT EXISTS (
       SELECT 1 FROM space_registrations
       WHERE space_id = p_space_id AND ticket_id = v_ticket_id
         AND status = 'registered'
     ) THEN
    RAISE EXCEPTION 'NO_SPACE_ACCESS' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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
  IF v_user_id IS NULL THEN
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

-- ============================================================================
-- 3. REDEEM
-- ============================================================================
-- Returns the scan result PLUS the ticket's redeem balances, shaped to the
-- mobile TicketRedeemBalance model:
--   { id, ticket_id, redeem_item_id, redeem_item_name,
--     total_allowed, used_count, last_redeemed_at }
-- NOTE: ticket_redeem_balances stores total_redeemed (not used_count) and a
-- generated `remaining` column. Here total_redeemed is exposed AS used_count,
-- redeem_item_name is joined from redeem_items, and last_redeemed_at is the
-- MAX(redeemed_at) from redeem_logs. The mobile getRedeemBalances() direct
-- table select must be refactored to use this RPC (it currently references
-- columns used_count/redeem_item_name/last_redeemed_at that do not exist on
-- the table) — tracked in Phase 1.
CREATE OR REPLACE FUNCTION validate_redeem_scan(p_qr_code TEXT, p_event_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result    JSON;
  v_ticket_id UUID;
  v_balances  JSON;
BEGIN
  IF NOT can_operate_event(p_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  v_result := build_scan_result(p_qr_code, p_event_id);
  v_ticket_id := (v_result->>'ticket_id')::UUID;

  SELECT COALESCE(json_agg(b ORDER BY b.redeem_item_name), '[]'::json)
  INTO v_balances
  FROM (
    SELECT
      trb.id,
      trb.ticket_id,
      trb.redeem_item_id,
      ri.name                       AS redeem_item_name,
      trb.total_allowed,
      trb.total_redeemed            AS used_count,
      (SELECT MAX(rl.redeemed_at) FROM redeem_logs rl
        WHERE rl.ticket_id = trb.ticket_id
          AND rl.redeem_item_id = trb.redeem_item_id) AS last_redeemed_at
    FROM ticket_redeem_balances trb
    JOIN redeem_items ri ON ri.id = trb.redeem_item_id
    WHERE trb.ticket_id = v_ticket_id AND ri.is_active
  ) b;

  RETURN jsonb_set(v_result::jsonb, '{balances}', v_balances::jsonb)::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Atomically redeem one unit of an item against a ticket.
-- Locks the balance row, enforces remaining > 0, writes the audit log.
CREATE OR REPLACE FUNCTION redeem_item(
  p_ticket_id      UUID,
  p_redeem_item_id UUID,
  p_redeemed_by    UUID
)
RETURNS JSON AS $$
DECLARE
  v_event_id  UUID;
  v_user_id   UUID;
  v_allowed   INTEGER;
  v_redeemed  INTEGER;
BEGIN
  SELECT event_id, user_id INTO v_event_id, v_user_id
  FROM tickets WHERE id = p_ticket_id AND is_active;
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'TICKET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF NOT can_operate_event(v_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  -- Lock the balance row to serialize concurrent redeems on the same ticket+item.
  SELECT total_allowed, total_redeemed INTO v_allowed, v_redeemed
  FROM ticket_redeem_balances
  WHERE ticket_id = p_ticket_id AND redeem_item_id = p_redeem_item_id
  FOR UPDATE;

  IF v_allowed IS NULL THEN
    RAISE EXCEPTION 'NO_REDEEM_BALANCE' USING ERRCODE = 'P0002';
  END IF;
  IF v_redeemed >= v_allowed THEN
    RAISE EXCEPTION 'REDEEM_EXHAUSTED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE ticket_redeem_balances
  SET total_redeemed = total_redeemed + 1, updated_at = NOW()
  WHERE ticket_id = p_ticket_id AND redeem_item_id = p_redeem_item_id;

  INSERT INTO redeem_logs (ticket_id, redeem_item_id, event_id, user_id,
                           redeemed_by, quantity, redeemed_at)
  VALUES (p_ticket_id, p_redeem_item_id, v_event_id, v_user_id,
          p_redeemed_by, 1, NOW());

  RETURN json_build_object(
    'success', TRUE,
    'remaining', v_allowed - v_redeemed - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Grants: callable by authenticated users; the functions themselves enforce
-- per-event authorization via can_operate_event(). Not granted to anon.
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION validate_gate_scan(TEXT, UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION record_gate_movement(UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_space_scan(TEXT, UUID, UUID)     TO authenticated;
GRANT EXECUTE ON FUNCTION record_space_movement(UUID, UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_redeem_scan(TEXT, UUID)          TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_item(UUID, UUID, UUID)             TO authenticated;
