-- ============================================================================
-- Round 9 / mobile ops pages: guest list, per-guest history, unified scan
-- logs, per-space log. All SECURITY DEFINER, gated by can_operate_event()
-- (any active staff/org role on the event). Idempotent.
-- ============================================================================

-- Full guest list with live presence, derived from the last gate movement:
-- no movements -> not_arrived, check_in -> inside, check_out -> left.
CREATE OR REPLACE FUNCTION get_event_guests(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT can_operate_event(p_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'ticket_id', g.ticket_id,
      'user_id', g.user_id,
      'name', g.name,
      'email', g.email,
      'ticket_type', g.ticket_type,
      'is_active', g.is_active,
      'status', g.status,
      'last_gate_at', g.last_gate_at
    ) ORDER BY g.name)
    FROM (
      SELECT
        t.id AS ticket_id,
        t.user_id,
        COALESCE(p.full_name, t.guest_email, 'Guest') AS name,
        COALESCE(p.email, t.guest_email) AS email,
        tt.name AS ticket_type,
        t.is_active,
        CASE lm.movement_type
          WHEN 'check_in' THEN 'inside'
          WHEN 'check_out' THEN 'left'
          ELSE 'not_arrived'
        END AS status,
        lm.scanned_at AS last_gate_at
      FROM tickets t
      LEFT JOIN profiles p ON p.id = t.user_id
      LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
      LEFT JOIN LATERAL (
        SELECT em.movement_type, em.scanned_at
        FROM event_movements em
        WHERE em.ticket_id = t.id AND em.event_id = p_event_id
        ORDER BY em.scanned_at DESC
        LIMIT 1
      ) lm ON TRUE
      WHERE t.event_id = p_event_id
    ) g
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION get_event_guests(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_event_guests(UUID) TO authenticated;

-- One guest's complete scan timeline: gate + space + redeem, newest first.
CREATE OR REPLACE FUNCTION get_ticket_history(p_ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  SELECT event_id INTO v_event_id FROM tickets WHERE id = p_ticket_id;
  IF v_event_id IS NULL OR NOT can_operate_event(v_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'kind', h.kind, 'label', h.label, 'direction', h.direction, 'at', h.at
    ) ORDER BY h.at DESC)
    FROM (
      SELECT 'gate' AS kind, 'Main gate' AS label,
             em.movement_type AS direction, em.scanned_at AS at
      FROM event_movements em
      WHERE em.ticket_id = p_ticket_id
      UNION ALL
      SELECT 'space', COALESCE(s.name, 'Space'), sm.movement_type, sm.scanned_at
      FROM space_movements sm
      LEFT JOIN spaces s ON s.id = sm.space_id
      WHERE sm.ticket_id = p_ticket_id
      UNION ALL
      SELECT 'redeem', COALESCE(ri.name, 'Item'), 'redeemed', rl.redeemed_at
      FROM redeem_logs rl
      LEFT JOIN redeem_items ri ON ri.id = rl.redeem_item_id
      WHERE rl.ticket_id = p_ticket_id
    ) h
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION get_ticket_history(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_ticket_history(UUID) TO authenticated;

-- Unified event-wide scan feed (gate + space + redeem), newest first, paged.
CREATE OR REPLACE FUNCTION get_event_scan_logs(
  p_event_id UUID,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT can_operate_event(p_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'kind', l.kind, 'label', l.label, 'direction', l.direction,
      'attendee', l.attendee, 'at', l.at, 'space_id', l.space_id
    ) ORDER BY l.at DESC)
    FROM (
      SELECT * FROM (
        SELECT 'gate' AS kind, 'Main gate' AS label,
               em.movement_type AS direction,
               COALESCE(p.full_name, t.guest_email, 'Guest') AS attendee,
               em.scanned_at AS at, NULL::uuid AS space_id
        FROM event_movements em
        JOIN tickets t ON t.id = em.ticket_id
        LEFT JOIN profiles p ON p.id = t.user_id
        WHERE em.event_id = p_event_id
        UNION ALL
        SELECT 'space', COALESCE(s.name, 'Space'), sm.movement_type,
               COALESCE(p.full_name, t.guest_email, 'Guest'),
               sm.scanned_at, sm.space_id
        FROM space_movements sm
        JOIN tickets t ON t.id = sm.ticket_id
        LEFT JOIN profiles p ON p.id = t.user_id
        LEFT JOIN spaces s ON s.id = sm.space_id
        WHERE sm.event_id = p_event_id
        UNION ALL
        SELECT 'redeem', COALESCE(ri.name, 'Item'), 'redeemed',
               COALESCE(p.full_name, t.guest_email, 'Guest'),
               rl.redeemed_at, NULL::uuid
        FROM redeem_logs rl
        JOIN tickets t ON t.id = rl.ticket_id
        LEFT JOIN profiles p ON p.id = t.user_id
        LEFT JOIN redeem_items ri ON ri.id = rl.redeem_item_id
        WHERE rl.event_id = p_event_id
      ) u
      ORDER BY u.at DESC
      LIMIT p_limit OFFSET p_offset
    ) l
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION get_event_scan_logs(UUID, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_event_scan_logs(UUID, INT, INT) TO authenticated;

-- One space's entry/exit log with attendee names, newest first.
CREATE OR REPLACE FUNCTION get_space_log(p_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  SELECT event_id INTO v_event_id FROM spaces WHERE id = p_space_id;
  IF v_event_id IS NULL OR NOT can_operate_event(v_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'ticket_id', sm.ticket_id,
      'attendee', COALESCE(p.full_name, t.guest_email, 'Guest'),
      'direction', sm.movement_type,
      'at', sm.scanned_at
    ) ORDER BY sm.scanned_at DESC)
    FROM space_movements sm
    JOIN tickets t ON t.id = sm.ticket_id
    LEFT JOIN profiles p ON p.id = t.user_id
    WHERE sm.space_id = p_space_id
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION get_space_log(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_space_log(UUID) TO authenticated;
