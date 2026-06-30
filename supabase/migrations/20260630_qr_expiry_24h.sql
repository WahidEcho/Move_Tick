-- ============================================================================
-- QR/ticket validity ends 24h after the event's end_date.
-- Enforced in build_scan_result (scan) + record_gate_movement (manual check-in).
-- Both web and mobile scanners call these, so expiry applies everywhere.
-- ============================================================================
CREATE OR REPLACE FUNCTION is_ticket_window_open(p_event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE v_end TIMESTAMPTZ;
BEGIN
  SELECT end_date INTO v_end FROM events WHERE id = p_event_id;
  RETURN v_end IS NULL OR now() <= v_end + interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp STABLE;
REVOKE ALL ON FUNCTION is_ticket_window_open(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_ticket_window_open(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION build_scan_result(p_qr_code TEXT, p_event_id UUID)
RETURNS JSON AS $$
DECLARE v JSON;
BEGIN
  SELECT json_build_object(
    'ticket_id', t.id, 'attendee_name', COALESCE(p.full_name, p.email),
    'attendee_email', p.email, 'ticket_type_name', tt.name,
    'event_id', t.event_id, 'event_title', e.title, 'event_end', e.end_date,
    'ticket_status', CASE WHEN t.is_active THEN 'active' ELSE 'revoked' END,
    'is_checked_in', COALESCE(lm.movement_type = 'check_in', FALSE),
    'last_movement_at', lm.scanned_at, 'last_movement_type', lm.movement_type
  ) INTO v
  FROM tickets t
  JOIN profiles p ON p.id = t.user_id
  JOIN ticket_types tt ON tt.id = t.ticket_type_id
  JOIN events e ON e.id = t.event_id
  LEFT JOIN LATERAL (
    SELECT em.movement_type, em.scanned_at FROM event_movements em
    WHERE em.ticket_id = t.id ORDER BY em.scanned_at DESC LIMIT 1
  ) lm ON TRUE
  WHERE t.qr_token = p_qr_code;

  IF v IS NULL THEN RAISE EXCEPTION 'TICKET_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF (v->>'event_id')::UUID <> p_event_id THEN RAISE EXCEPTION 'TICKET_WRONG_EVENT' USING ERRCODE = 'P0001'; END IF;
  IF (v->>'ticket_status') <> 'active' THEN RAISE EXCEPTION 'TICKET_INACTIVE' USING ERRCODE = 'P0001'; END IF;
  IF NOT is_ticket_window_open(p_event_id) THEN RAISE EXCEPTION 'TICKET_EXPIRED' USING ERRCODE = 'P0001'; END IF;
  RETURN v;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION record_gate_movement(
  p_ticket_id UUID, p_event_id UUID, p_movement_type TEXT, p_scanned_by UUID)
RETURNS JSON AS $$
DECLARE v_user_id UUID; v_row event_movements%ROWTYPE;
BEGIN
  IF NOT can_operate_event(p_event_id) THEN RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501'; END IF;
  IF p_movement_type NOT IN ('check_in','check_out') THEN RAISE EXCEPTION 'INVALID_MOVEMENT_TYPE' USING ERRCODE = 'P0001'; END IF;
  IF NOT is_ticket_window_open(p_event_id) THEN RAISE EXCEPTION 'TICKET_EXPIRED' USING ERRCODE = 'P0001'; END IF;
  SELECT user_id INTO v_user_id FROM tickets WHERE id = p_ticket_id AND event_id = p_event_id AND is_active;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'TICKET_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO event_movements (event_id, ticket_id, user_id, movement_type, scanned_by, scanned_at, is_system_generated)
  VALUES (p_event_id, p_ticket_id, v_user_id, p_movement_type, p_scanned_by, NOW(), FALSE)
  RETURNING * INTO v_row;
  RETURN json_build_object('success', TRUE, 'movement_id', v_row.id, 'movement_type', v_row.movement_type, 'scanned_at', v_row.scanned_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
