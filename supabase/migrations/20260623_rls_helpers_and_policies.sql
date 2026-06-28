-- ============================================================================
-- Migration: RLS helper functions + corrected policies (Move-Tick tables only)
-- Date: 2026-06-23
-- ============================================================================
-- WHY THIS EXISTS
-- The live DB had schema.sql applied but fix-rls.sql was NEVER applied, so:
--   * Helper fns is_org_member/is_org_admin/is_event_staff/get_event_org_id
--     did not exist, and
--   * the original recursive organization_members SELECT policy was still live
--     (RLS infinite-recursion bug).
-- That recursion is the root cause that led the mobile app to ship the
-- service-role key on-device as a workaround.
--
-- This is fix-rls.sql, with ONE deliberate change: the "drop all policies"
-- step is SCOPED to the 19 Move-Tick tables instead of every policy in the
-- public schema. The DB also hosts legacy Passaire tables (create_passaire_*
-- migrations); we leave their policies untouched.
--
-- Idempotent: CREATE OR REPLACE for fns; policies are dropped (by whatever name
-- they currently have, per pg_policies) then recreated.
-- ============================================================================

-- ---------- Helper functions (SECURITY DEFINER bypasses RLS, no recursion) ----------
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND role IN ('owner','admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_manager_or_above(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND role IN ('owner','admin','manager'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY SELECT organization_id FROM organization_members WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_event_staff(evt_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM event_staff_assignments
    WHERE event_id = evt_id AND user_id = auth.uid() AND is_active = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_event_org_id(evt_id UUID)
RETURNS UUID AS $$
DECLARE org_id UUID;
BEGIN
  SELECT organization_id INTO org_id FROM events WHERE id = evt_id;
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ---------- Scoped policy reset: ONLY Move-Tick tables (not Passaire) ----------
DO $$
DECLARE
  r RECORD;
  movetick_tables TEXT[] := ARRAY[
    'profiles','organizations','organization_members','organizer_applications',
    'events','event_settings','ticket_types','tickets','registrations',
    'event_invitations','event_movements','spaces','space_registrations',
    'space_movements','event_staff_assignments','redeem_items',
    'ticket_type_redeems','ticket_redeem_balances','redeem_logs'
  ];
BEGIN
  FOR r IN (
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(movetick_tables)
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ---------- PROFILES ----------
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ---------- ORGANIZATIONS ----------
CREATE POLICY "orgs_select" ON organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "orgs_update" ON organizations FOR UPDATE TO authenticated USING (is_org_admin(id));

-- ---------- ORGANIZATION MEMBERS (no self-referencing) ----------
CREATE POLICY "org_members_select" ON organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR organization_id IN (SELECT get_user_org_ids()));
CREATE POLICY "org_members_insert" ON organization_members FOR INSERT TO authenticated
  WITH CHECK (is_org_admin(organization_id) OR is_platform_admin());
CREATE POLICY "org_members_update" ON organization_members FOR UPDATE TO authenticated
  USING (is_org_admin(organization_id) OR is_platform_admin());
CREATE POLICY "org_members_delete" ON organization_members FOR DELETE TO authenticated
  USING (is_org_admin(organization_id) OR is_platform_admin());

-- ---------- ORGANIZER APPLICATIONS ----------
CREATE POLICY "apps_select" ON organizer_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_platform_admin());
CREATE POLICY "apps_insert" ON organizer_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "apps_update" ON organizer_applications FOR UPDATE TO authenticated
  USING (is_platform_admin());

-- ---------- EVENTS ----------
CREATE POLICY "events_select" ON events FOR SELECT TO authenticated
  USING ((is_published = true AND visibility = 'public') OR is_org_member(organization_id) OR is_platform_admin());
CREATE POLICY "events_insert" ON events FOR INSERT TO authenticated
  WITH CHECK (is_org_member(organization_id));
CREATE POLICY "events_update" ON events FOR UPDATE TO authenticated
  USING (is_org_member(organization_id));
CREATE POLICY "events_delete" ON events FOR DELETE TO authenticated
  USING (is_org_admin(organization_id));

-- ---------- EVENT SETTINGS ----------
CREATE POLICY "event_settings_select" ON event_settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events WHERE id = event_id AND (
    (is_published = true AND visibility = 'public') OR is_org_member(organization_id))));
CREATE POLICY "event_settings_insert" ON event_settings FOR INSERT TO authenticated
  WITH CHECK (is_org_member(get_event_org_id(event_id)));
CREATE POLICY "event_settings_update" ON event_settings FOR UPDATE TO authenticated
  USING (is_org_member(get_event_org_id(event_id)));

-- ---------- TICKET TYPES ----------
CREATE POLICY "ticket_types_select" ON ticket_types FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events WHERE id = event_id AND is_published = true)
         OR is_org_member(get_event_org_id(event_id)));
CREATE POLICY "ticket_types_insert" ON ticket_types FOR INSERT TO authenticated
  WITH CHECK (is_org_member(get_event_org_id(event_id)));
CREATE POLICY "ticket_types_update" ON ticket_types FOR UPDATE TO authenticated
  USING (is_org_member(get_event_org_id(event_id)));
CREATE POLICY "ticket_types_delete" ON ticket_types FOR DELETE TO authenticated
  USING (is_org_member(get_event_org_id(event_id)));

-- ---------- TICKETS ----------
CREATE POLICY "tickets_select" ON tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(get_event_org_id(event_id)));
CREATE POLICY "tickets_insert" ON tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_org_member(get_event_org_id(event_id)));
CREATE POLICY "tickets_update" ON tickets FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_org_member(get_event_org_id(event_id)));

-- ---------- REGISTRATIONS ----------
CREATE POLICY "registrations_select" ON registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(get_event_org_id(event_id)));
CREATE POLICY "registrations_insert" ON registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_org_member(get_event_org_id(event_id)));
CREATE POLICY "registrations_update" ON registrations FOR UPDATE TO authenticated
  USING (is_org_member(get_event_org_id(event_id)));

-- ---------- EVENT INVITATIONS ----------
CREATE POLICY "invitations_select" ON event_invitations FOR SELECT TO authenticated
  USING (invitee_email = (SELECT email FROM profiles WHERE id = auth.uid())
         OR is_org_member(organization_id));
CREATE POLICY "invitations_insert" ON event_invitations FOR INSERT TO authenticated
  WITH CHECK (is_org_member(organization_id));
CREATE POLICY "invitations_update" ON event_invitations FOR UPDATE TO authenticated
  USING (is_org_member(organization_id));
CREATE POLICY "invitations_delete" ON event_invitations FOR DELETE TO authenticated
  USING (is_org_member(organization_id));

-- ---------- EVENT MOVEMENTS ----------
CREATE POLICY "movements_select" ON event_movements FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(get_event_org_id(event_id)) OR is_event_staff(event_id));
CREATE POLICY "movements_insert" ON event_movements FOR INSERT TO authenticated
  WITH CHECK (is_org_member(get_event_org_id(event_id)) OR is_event_staff(event_id));

-- ---------- SPACES ----------
CREATE POLICY "spaces_select" ON spaces FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events WHERE id = event_id AND is_published = true)
         OR is_org_member(get_event_org_id(event_id)));
CREATE POLICY "spaces_insert" ON spaces FOR INSERT TO authenticated
  WITH CHECK (is_org_member(get_event_org_id(event_id)));
CREATE POLICY "spaces_update" ON spaces FOR UPDATE TO authenticated
  USING (is_org_member(get_event_org_id(event_id)));
CREATE POLICY "spaces_delete" ON spaces FOR DELETE TO authenticated
  USING (is_org_member(get_event_org_id(event_id)));

-- ---------- SPACE REGISTRATIONS ----------
CREATE POLICY "space_regs_select" ON space_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(get_event_org_id(event_id)));
CREATE POLICY "space_regs_insert" ON space_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------- SPACE MOVEMENTS ----------
CREATE POLICY "space_movements_select" ON space_movements FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(get_event_org_id(event_id)));
CREATE POLICY "space_movements_insert" ON space_movements FOR INSERT TO authenticated
  WITH CHECK (is_org_member(get_event_org_id(event_id)) OR is_event_staff(event_id));

-- ---------- EVENT STAFF ASSIGNMENTS ----------
CREATE POLICY "staff_select" ON event_staff_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(organization_id));
CREATE POLICY "staff_insert" ON event_staff_assignments FOR INSERT TO authenticated
  WITH CHECK (is_org_manager_or_above(organization_id));
CREATE POLICY "staff_update" ON event_staff_assignments FOR UPDATE TO authenticated
  USING (is_org_manager_or_above(organization_id));
CREATE POLICY "staff_delete" ON event_staff_assignments FOR DELETE TO authenticated
  USING (is_org_manager_or_above(organization_id));

-- ---------- REDEEM ITEMS ----------
CREATE POLICY "redeem_items_select" ON redeem_items FOR SELECT TO authenticated
  USING (is_org_member(get_event_org_id(event_id)) OR is_event_staff(event_id));
CREATE POLICY "redeem_items_insert" ON redeem_items FOR INSERT TO authenticated
  WITH CHECK (is_org_member(get_event_org_id(event_id)));
CREATE POLICY "redeem_items_update" ON redeem_items FOR UPDATE TO authenticated
  USING (is_org_member(get_event_org_id(event_id)));
CREATE POLICY "redeem_items_delete" ON redeem_items FOR DELETE TO authenticated
  USING (is_org_member(get_event_org_id(event_id)));

-- ---------- TICKET TYPE REDEEMS ----------
CREATE POLICY "ttr_select" ON ticket_type_redeems FOR SELECT TO authenticated USING (true);
CREATE POLICY "ttr_insert" ON ticket_type_redeems FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM ticket_types WHERE id = ticket_type_id AND is_org_member(get_event_org_id(event_id))));
CREATE POLICY "ttr_delete" ON ticket_type_redeems FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM ticket_types WHERE id = ticket_type_id AND is_org_member(get_event_org_id(event_id))));

-- ---------- TICKET REDEEM BALANCES ----------
CREATE POLICY "trb_select" ON ticket_redeem_balances FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND (user_id = auth.uid() OR is_org_member(get_event_org_id(event_id)))));
CREATE POLICY "trb_insert" ON ticket_redeem_balances FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND is_org_member(get_event_org_id(event_id))));
CREATE POLICY "trb_update" ON ticket_redeem_balances FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND (is_org_member(get_event_org_id(event_id)) OR is_event_staff(event_id))));

-- ---------- REDEEM LOGS ----------
CREATE POLICY "redeem_logs_select" ON redeem_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(get_event_org_id(event_id)));
CREATE POLICY "redeem_logs_insert" ON redeem_logs FOR INSERT TO authenticated
  WITH CHECK (is_org_member(get_event_org_id(event_id)) OR is_event_staff(event_id));
