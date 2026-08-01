-- Event story content was unreadable by anonymous visitors.
--
-- The original policy (20260722_cinematic_event_content.sql) put the
-- published-public test and the org-member test in one OR, and Postgres does
-- not guarantee short-circuit evaluation — so it could still call
-- is_org_member(), whose EXECUTE was deliberately revoked from `anon` during
-- the security hardening. The result was a hard
-- "permission denied for function is_org_member" (HTTP 401) rather than a
-- filtered-out row.
--
-- The web platform never noticed because it reads this content with the
-- service-role client (RLS bypassed). The mobile app reads with the caller's
-- own session, so logged-out event browsing silently lost all story content.
--
-- Fix: split into two permissive SELECT policies. Anonymous visitors get the
-- published-public branch only, which calls no helper functions. Signed-in
-- users additionally get the manage branch. Permissive policies OR together,
-- so behaviour for members/admins is unchanged and no grant is loosened.

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'event_media', 'event_highlights', 'event_speakers',
    'event_agenda_items', 'event_faqs'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read_public', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read_manage', t);

    -- Public: no helper functions, so `anon` needs no extra EXECUTE grants.
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING ('
      '  EXISTS (SELECT 1 FROM events e'
      '          WHERE e.id = event_id AND e.is_published AND e.visibility = ''public''))',
      t || '_read_public', t
    );

    -- Organizers and platform admins: unchanged reach, signed-in only.
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING ('
      '  is_org_member(get_event_org_id(event_id)) OR is_platform_admin())',
      t || '_read_manage', t
    );
  END LOOP;
END $$;
