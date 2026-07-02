-- Guest browsing (mobile app / logged-out web): anonymous users may READ
-- published, public events and their public surface — nothing else.
-- Mirrors the public-visibility arm of the existing authenticated policies.
-- Applied to production 2026-07-02 as anon_public_event_browsing.

CREATE POLICY events_select_anon ON events
  FOR SELECT TO anon
  USING (is_published = true AND visibility = 'public');

CREATE POLICY ticket_types_select_anon ON ticket_types
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_types.event_id
        AND events.is_published = true
        AND events.visibility = 'public'
    )
  );

CREATE POLICY event_settings_select_anon ON event_settings
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_settings.event_id
        AND events.is_published = true
        AND events.visibility = 'public'
    )
  );
