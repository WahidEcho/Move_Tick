-- Redeems pages: per-event item summary + per-item redemption log.
-- Staff-gated via can_operate_event. Applied to prod via MCP. Idempotent.

CREATE OR REPLACE FUNCTION get_event_redeems(p_event_id UUID)
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
      'id', r.id, 'name', r.name, 'category', r.category, 'station', r.station,
      'redeemed', COALESCE(b.redeemed, 0), 'allowed', COALESCE(b.allowed, 0)
    ) ORDER BY r.name)
    FROM redeem_items r
    LEFT JOIN (
      SELECT trb.redeem_item_id, SUM(trb.total_redeemed) AS redeemed, SUM(trb.total_allowed) AS allowed
      FROM ticket_redeem_balances trb
      JOIN tickets t ON t.id = trb.ticket_id
      WHERE t.event_id = p_event_id
      GROUP BY trb.redeem_item_id
    ) b ON b.redeem_item_id = r.id
    WHERE r.event_id = p_event_id AND r.is_active = TRUE
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION get_event_redeems(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_event_redeems(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION get_redeem_item_log(p_redeem_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  SELECT event_id INTO v_event_id FROM redeem_items WHERE id = p_redeem_item_id;
  IF v_event_id IS NULL OR NOT can_operate_event(v_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'ticket_id', rl.ticket_id,
      'attendee', COALESCE(p.full_name, t.guest_email, 'Guest'),
      'quantity', rl.quantity,
      'at', rl.redeemed_at
    ) ORDER BY rl.redeemed_at DESC)
    FROM redeem_logs rl
    JOIN tickets t ON t.id = rl.ticket_id
    LEFT JOIN profiles p ON p.id = t.user_id
    WHERE rl.redeem_item_id = p_redeem_item_id
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION get_redeem_item_log(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_redeem_item_log(UUID) TO authenticated;
