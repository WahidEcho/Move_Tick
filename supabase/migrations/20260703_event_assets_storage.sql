-- ============================================================================
-- Migration: event-assets storage bucket (event covers + org logos)
-- Date: 2026-07-03
-- ============================================================================
-- Replaces the free-text "image URL" fields with real uploads. A single public
-- bucket holds organizer-uploaded images; objects are laid out as
--   events/{organization_id}/{uuid}.<ext>
-- so RLS can scope writes to members of that organization. Reads are public
-- (the bucket is public) which matches next.config.ts remotePatterns.
-- Idempotent.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-assets',
  'event-assets',
  TRUE,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Writes are limited to members of the org named in the second path segment.
DROP POLICY IF EXISTS "event_assets_insert" ON storage.objects;
CREATE POLICY "event_assets_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-assets'
    AND (storage.foldername(name))[1] = 'events'
    AND is_org_member(((storage.foldername(name))[2])::uuid)
  );

DROP POLICY IF EXISTS "event_assets_update" ON storage.objects;
CREATE POLICY "event_assets_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-assets'
    AND (storage.foldername(name))[1] = 'events'
    AND is_org_member(((storage.foldername(name))[2])::uuid)
  )
  WITH CHECK (
    bucket_id = 'event-assets'
    AND (storage.foldername(name))[1] = 'events'
    AND is_org_member(((storage.foldername(name))[2])::uuid)
  );

DROP POLICY IF EXISTS "event_assets_delete" ON storage.objects;
CREATE POLICY "event_assets_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-assets'
    AND (storage.foldername(name))[1] = 'events'
    AND is_org_member(((storage.foldername(name))[2])::uuid)
  );

-- Public read (bucket is public, but an explicit SELECT policy keeps signed /
-- authenticated listing working too).
DROP POLICY IF EXISTS "event_assets_read" ON storage.objects;
CREATE POLICY "event_assets_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'event-assets');
