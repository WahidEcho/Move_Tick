-- W7 (2026-07-19): lightweight event page-view tracking for conversion analytics.
-- One row per (event, anonymous session, day) — deduped so a visitor who
-- refreshes 10x in a day counts once. No PII: session_id is a random cookie.
-- Applied to prod via Supabase MCP as `w7_event_page_views`.

CREATE TABLE IF NOT EXISTS event_page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  is_authenticated BOOLEAN NOT NULL DEFAULT FALSE,
  view_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_event_view_session_day
  ON event_page_views(event_id, session_id, view_date);
CREATE INDEX IF NOT EXISTS idx_event_page_views_event ON event_page_views(event_id, created_at DESC);

ALTER TABLE event_page_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_page_views_select ON event_page_views;
CREATE POLICY event_page_views_select ON event_page_views FOR SELECT TO authenticated
  USING (is_platform_admin() OR is_org_member(get_event_org_id(event_id)));
