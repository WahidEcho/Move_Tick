-- Rich, ordered event content for the cinematic public experience.
-- Existing events remain valid: every new scalar is nullable/defaulted and
-- every child section is optional.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS short_summary TEXT,
  ADD COLUMN IF NOT EXISTS promo_video_url TEXT,
  ADD COLUMN IF NOT EXISTS promo_video_poster_url TEXT,
  ADD COLUMN IF NOT EXISTS age_restriction TEXT,
  ADD COLUMN IF NOT EXISTS accessibility_notes TEXT,
  ADD COLUMN IF NOT EXISTS refund_policy TEXT,
  ADD COLUMN IF NOT EXISTS dress_code TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS featured_rank INTEGER;

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS landing_hero_video_url TEXT,
  ADD COLUMN IF NOT EXISTS landing_hero_poster_url TEXT;

ALTER TABLE ticket_types
  ADD COLUMN IF NOT EXISTS benefits TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visual_label TEXT;

CREATE TABLE IF NOT EXISTS event_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  url TEXT NOT NULL,
  poster_url TEXT,
  alt_text TEXT,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  icon_key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  biography TEXT,
  image_url TEXT,
  social_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  speaker_id UUID REFERENCES event_speakers(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured, featured_rank, start_date);
CREATE INDEX IF NOT EXISTS idx_event_media_order ON event_media(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_highlights_order ON event_highlights(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_speakers_order ON event_speakers(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_agenda_order ON event_agenda_items(event_id, starts_at, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_faqs_order ON event_faqs(event_id, sort_order);

ALTER TABLE event_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_faqs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'event_media', 'event_highlights', 'event_speakers',
    'event_agenda_items', 'event_faqs'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_read', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO public USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND ((e.is_published AND e.visibility = ''public'') OR is_org_member(e.organization_id) OR is_platform_admin())))',
      table_name || '_read', table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_insert', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (is_org_member(get_event_org_id(event_id)) OR is_platform_admin())',
      table_name || '_insert', table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_update', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (is_org_member(get_event_org_id(event_id)) OR is_platform_admin())',
      table_name || '_update', table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_delete', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (is_org_member(get_event_org_id(event_id)) OR is_platform_admin())',
      table_name || '_delete', table_name
    );
  END LOOP;
END $$;

-- Expand the existing public bucket for cinematic event video and posters.
UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
      'image/svg+xml', 'video/mp4', 'video/webm'
    ]
WHERE id = 'event-assets';
