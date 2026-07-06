-- ============================================================================
-- Round 5 / S2: RLS backstop for event auto-expiry.
-- The app already filters expired/hidden/archived events out of public
-- queries at the service layer (getPublicEvents). This migration adds the
-- same guard directly to the public-visibility branches of the RLS policies
-- so any direct client-side read (anon or authenticated, e.g. the mobile app)
-- is blocked too, not just the Next.js server. Hardcoded 2h buffer here as a
-- backstop; the real (admin-configurable) buffer lives in platform_settings
-- and is enforced by the app layer. Org-member/staff/admin access branches
-- are untouched — owners can still see their own expired events everywhere.
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------- anon policies (guest browsing, e.g. mobile) ----------
DROP POLICY IF EXISTS events_select_anon ON events;
CREATE POLICY events_select_anon ON events
  FOR SELECT TO anon
  USING (
    is_published = true AND visibility = 'public'
    AND is_cancelled = false AND is_hidden = false AND archived_at IS NULL
    AND (end_date + interval '2 hours') > now()
  );

DROP POLICY IF EXISTS ticket_types_select_anon ON ticket_types;
CREATE POLICY ticket_types_select_anon ON ticket_types
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_types.event_id
        AND events.is_published = true
        AND events.visibility = 'public'
        AND events.is_cancelled = false
        AND events.is_hidden = false
        AND events.archived_at IS NULL
        AND (events.end_date + interval '2 hours') > now()
    )
  );

DROP POLICY IF EXISTS event_settings_select_anon ON event_settings;
CREATE POLICY event_settings_select_anon ON event_settings
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_settings.event_id
        AND events.is_published = true
        AND events.visibility = 'public'
        AND events.is_cancelled = false
        AND events.is_hidden = false
        AND events.archived_at IS NULL
        AND (events.end_date + interval '2 hours') > now()
    )
  );

-- ---------- authenticated policies (logged-in attendees browsing) ----------
-- Same public-visibility guard; the org-member/admin OR-branches are
-- unchanged so owners/staff/admins keep full access to their own events.
DROP POLICY IF EXISTS "Published public events visible to all" ON events;
CREATE POLICY "Published public events visible to all" ON events
  FOR SELECT TO authenticated USING (
    (
      is_published = true AND visibility = 'public'
      AND is_cancelled = false AND is_hidden = false AND archived_at IS NULL
      AND (end_date + interval '2 hours') > now()
    ) OR
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = events.organization_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM event_staff_assignments WHERE event_id = events.id AND user_id = auth.uid() AND is_active = true) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND platform_role = 'admin')
  );

DROP POLICY IF EXISTS "Ticket types visible on public events" ON ticket_types;
CREATE POLICY "Ticket types visible on public events" ON ticket_types
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id AND is_published = true
        AND is_cancelled = false AND is_hidden = false AND archived_at IS NULL
        AND (end_date + interval '2 hours') > now()
    ) OR
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM events e JOIN event_staff_assignments esa ON esa.event_id = e.id WHERE e.id = event_id AND esa.user_id = auth.uid() AND esa.is_active = true) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND platform_role = 'admin')
  );

DROP POLICY IF EXISTS "Event settings follow event access" ON event_settings;
CREATE POLICY "Event settings follow event access" ON event_settings
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND (
      (
        is_published = true AND visibility = 'public'
        AND is_cancelled = false AND is_hidden = false AND archived_at IS NULL
        AND (end_date + interval '2 hours') > now()
      ) OR
      EXISTS (SELECT 1 FROM organization_members WHERE organization_id = events.organization_id AND user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM event_staff_assignments WHERE event_id = events.id AND user_id = auth.uid() AND is_active = true) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND platform_role = 'admin')
    ))
  );
