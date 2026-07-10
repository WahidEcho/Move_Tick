-- ============================================================================
-- Round 8 / M1: mobile operator-mode backend.
--
-- (a) can_manage_event()   — org member OR active event_manager assignment
-- (b) get_event_live_stats — one-call JSON aggregate powering the mobile
--     manager dashboard (counts, revenue, hourly check-ins, spaces, redeems,
--     promo usage). SECURITY DEFINER, manager-gated.
-- (c) notifications table added to the realtime publication so the app gets
--     live in-app notifications.
--
-- Idempotent — safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION can_manage_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL AND (
    is_org_member(get_event_org_id(p_event_id))
    OR EXISTS (
      SELECT 1 FROM event_staff_assignments
      WHERE event_id = p_event_id
        AND user_id = auth.uid()
        AND role = 'event_manager'
        AND is_active = TRUE
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION can_manage_event(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_manage_event(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION get_event_live_stats(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT can_manage_event(p_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_build_object(
    'registrations', (
      SELECT COUNT(*) FROM registrations
      WHERE event_id = p_event_id AND status IN ('confirmed', 'approved')
    ),
    'tickets_total', (
      SELECT COUNT(*) FROM tickets
      WHERE event_id = p_event_id AND is_active = TRUE
    ),
    'checked_in_unique', (
      SELECT COUNT(DISTINCT ticket_id) FROM event_movements
      WHERE event_id = p_event_id AND movement_type = 'check_in'
    ),
    'total_check_ins', (
      SELECT COUNT(*) FROM event_movements
      WHERE event_id = p_event_id AND movement_type = 'check_in'
    ),
    'currently_inside', GREATEST(0, (
      SELECT COALESCE(SUM(CASE WHEN movement_type = 'check_in' THEN 1 ELSE -1 END), 0)
      FROM event_movements WHERE event_id = p_event_id
    )),
    'event_capacity', (SELECT capacity FROM events WHERE id = p_event_id),
    'revenue_egp', (
      SELECT COALESCE(SUM(amount_total), 0) / 100.0 FROM payments
      WHERE event_id = p_event_id AND status = 'paid'
    ),
    'paid_orders', (
      SELECT COUNT(*) FROM payments
      WHERE event_id = p_event_id AND status = 'paid'
    ),
    'checkins_by_hour', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('hour', h.hour_iso, 'count', h.cnt) ORDER BY h.hour_iso), '[]'::jsonb)
      FROM (
        SELECT date_trunc('hour', scanned_at) AS hour_iso, COUNT(*) AS cnt
        FROM event_movements
        WHERE event_id = p_event_id AND movement_type = 'check_in'
        GROUP BY 1
      ) h
    ),
    'spaces', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'capacity', s.capacity,
        'occupancy', GREATEST(0, COALESCE(m.net, 0))
      ) ORDER BY s.name), '[]'::jsonb)
      FROM spaces s
      LEFT JOIN (
        SELECT space_id, SUM(CASE WHEN movement_type = 'check_in' THEN 1 ELSE -1 END) AS net
        FROM space_movements WHERE event_id = p_event_id GROUP BY space_id
      ) m ON m.space_id = s.id
      WHERE s.event_id = p_event_id AND s.is_active = TRUE
    ),
    'redeems', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.name,
        'redeemed', COALESCE(b.redeemed, 0), 'allowed', COALESCE(b.allowed, 0)
      ) ORDER BY r.name), '[]'::jsonb)
      FROM redeem_items r
      LEFT JOIN (
        SELECT trb.redeem_item_id, SUM(trb.total_redeemed) AS redeemed, SUM(trb.total_allowed) AS allowed
        FROM ticket_redeem_balances trb
        JOIN tickets t ON t.id = trb.ticket_id
        WHERE t.event_id = p_event_id
        GROUP BY trb.redeem_item_id
      ) b ON b.redeem_item_id = r.id
      WHERE r.event_id = p_event_id AND r.is_active = TRUE
    ),
    'coupons', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'code', c.code, 'times_redeemed', c.times_redeemed, 'max_redemptions', c.max_redemptions
      ) ORDER BY c.times_redeemed DESC), '[]'::jsonb)
      FROM coupons c WHERE c.event_id = p_event_id
    ),
    'generated_at', NOW()
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION get_event_live_stats(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_event_live_stats(UUID) TO authenticated;

-- Realtime for in-app notifications (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
