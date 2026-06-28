-- ============================================================================
-- Migration: fuzzy attendee search (door lookup / QR-fails fallback)
-- Date: 2026-06-24
-- ============================================================================
-- Typo-tolerant trigram search over attendee name/email, scoped to one event,
-- with a server-side event-role gate. record_gate_movement (existing) performs
-- the actual manual check-in once a ticket is chosen. Used by both web
-- (attendees.service.ts fuzzySearchAttendees) and mobile (attendee search).
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION search_event_attendees(p_event_id UUID, p_query TEXT)
RETURNS TABLE (
  ticket_id        UUID,
  user_id          UUID,
  attendee_name    TEXT,
  attendee_email   TEXT,
  ticket_type_name TEXT,
  is_checked_in    BOOLEAN,
  ticket_active    BOOLEAN,
  score            REAL
) AS $$
BEGIN
  IF NOT can_operate_event(p_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  IF p_query IS NULL OR length(trim(p_query)) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.user_id,
    COALESCE(p.full_name, p.email)::TEXT,
    p.email::TEXT,
    tt.name::TEXT,
    COALESCE(lm.movement_type = 'check_in', FALSE),
    t.is_active,
    GREATEST(
      similarity(COALESCE(p.full_name, ''), p_query),
      similarity(COALESCE(p.email, ''), p_query)
    )::REAL AS score
  FROM tickets t
  JOIN profiles p      ON p.id = t.user_id
  JOIN ticket_types tt ON tt.id = t.ticket_type_id
  LEFT JOIN LATERAL (
    SELECT em.movement_type
    FROM event_movements em
    WHERE em.ticket_id = t.id
    ORDER BY em.scanned_at DESC
    LIMIT 1
  ) lm ON TRUE
  WHERE t.event_id = p_event_id
    AND (
      p.full_name ILIKE '%' || p_query || '%'
      OR p.email ILIKE '%' || p_query || '%'
      OR similarity(COALESCE(p.full_name, ''), p_query) > 0.2
    )
  ORDER BY score DESC, COALESCE(p.full_name, p.email)
  LIMIT 25;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION search_event_attendees(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_event_attendees(UUID, TEXT) TO authenticated;
