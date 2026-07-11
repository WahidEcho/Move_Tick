-- Round 10 growth features: push tokens, organizer blasts, follows +
-- new-event alerts, offline scan roster. Applied to prod via MCP. Idempotent.

-- (1) Device push tokens — written by the app, read by the future push sender.
CREATE TABLE IF NOT EXISTS device_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'unknown',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON device_push_tokens(user_id);
ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_tokens_own ON device_push_tokens;
CREATE POLICY push_tokens_own ON device_push_tokens
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- (2) Organizer blast: one in-app notification to every ticket holder.
CREATE OR REPLACE FUNCTION send_event_blast(p_event_id UUID, p_title TEXT, p_message TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT can_manage_event(p_event_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = 'P0001';
  END IF;
  IF length(trim(p_title)) = 0 OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'EMPTY_MESSAGE' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO notifications (user_id, notification_type, title, message, related_entity_type, related_entity_id)
  SELECT DISTINCT t.user_id, 'general', p_title, p_message, 'event', p_event_id
  FROM tickets t
  WHERE t.event_id = p_event_id AND t.user_id IS NOT NULL AND t.is_active = TRUE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION send_event_blast(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION send_event_blast(UUID, TEXT, TEXT) TO authenticated;

-- (3) Follow an organizer + get notified when they publish a new event.
CREATE TABLE IF NOT EXISTS organization_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);
CREATE INDEX IF NOT EXISTS idx_org_followers_org ON organization_followers(organization_id);
ALTER TABLE organization_followers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_followers_own ON organization_followers;
CREATE POLICY org_followers_own ON organization_followers
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION notify_followers_on_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published = TRUE AND (TG_OP = 'INSERT' OR OLD.is_published = FALSE) THEN
    INSERT INTO notifications (user_id, notification_type, title, message, related_entity_type, related_entity_id)
    SELECT f.user_id, 'general',
           'New event: ' || NEW.title,
           COALESCE((SELECT name FROM organizations WHERE id = NEW.organization_id), 'An organizer you follow') || ' just published a new event. Tap to check it out.',
           'event', NEW.id
    FROM organization_followers f
    WHERE f.organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_followers_on_publish ON events;
CREATE TRIGGER trg_notify_followers_on_publish
  AFTER INSERT OR UPDATE OF is_published ON events
  FOR EACH ROW EXECUTE FUNCTION notify_followers_on_publish();

-- (4) Offline scanning: the full valid-ticket roster for an event, cached by
-- the scanner before doors so it can validate with no connectivity.
CREATE OR REPLACE FUNCTION get_event_ticket_roster(p_event_id UUID)
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
      'ticket_id', t.id,
      'qr_token', t.qr_token,
      'name', COALESCE(p.full_name, t.guest_email, 'Guest'),
      'ticket_type', tt.name,
      'is_active', t.is_active,
      'checked_in', (lm.movement_type = 'check_in')
    ))
    FROM tickets t
    LEFT JOIN profiles p ON p.id = t.user_id
    LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
    LEFT JOIN LATERAL (
      SELECT em.movement_type FROM event_movements em
      WHERE em.ticket_id = t.id AND em.event_id = p_event_id
      ORDER BY em.scanned_at DESC LIMIT 1
    ) lm ON TRUE
    WHERE t.event_id = p_event_id
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION get_event_ticket_roster(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_event_ticket_roster(UUID) TO authenticated;
