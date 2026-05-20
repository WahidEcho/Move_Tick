-- Move Beyond - Event SaaS Platform
-- Complete Supabase Database Schema
-- Run this in the Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  platform_role TEXT NOT NULL DEFAULT 'attendee' CHECK (platform_role IN ('attendee', 'organizer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_platform_role ON profiles(platform_role);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  instagram TEXT,
  linkedin TEXT,
  country TEXT,
  city TEXT,
  type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ORGANIZATION MEMBERS
-- ============================================
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

CREATE TRIGGER org_members_updated_at BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ORGANIZER APPLICATIONS
-- ============================================
CREATE TABLE organizer_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role_title TEXT,
  organization_name TEXT NOT NULL,
  organization_type TEXT,
  website TEXT,
  instagram TEXT,
  linkedin TEXT,
  country TEXT,
  city TEXT,
  organization_description TEXT,
  event_categories TEXT[],
  expected_events_per_month INTEGER,
  expected_avg_attendees INTEGER,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'more_info_requested')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_applications_user ON organizer_applications(user_id);
CREATE INDEX idx_org_applications_status ON organizer_applications(status);

CREATE TRIGGER org_applications_updated_at BEFORE UPDATE ON organizer_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- EVENTS
-- ============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  venue TEXT,
  city TEXT,
  country TEXT,
  category TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only', 'members_only')),
  capacity INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_visibility ON events(visibility);
CREATE INDEX idx_events_is_published ON events(is_published);
CREATE INDEX idx_events_category ON events(category);

CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- EVENT SETTINGS
-- ============================================
CREATE TABLE event_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  enable_waitlist BOOLEAN NOT NULL DEFAULT FALSE,
  show_guest_list BOOLEAN NOT NULL DEFAULT FALSE,
  show_registered_count BOOLEAN NOT NULL DEFAULT TRUE,
  show_remaining_seats BOOLEAN NOT NULL DEFAULT FALSE,
  show_attendee_preview BOOLEAN NOT NULL DEFAULT FALSE,
  show_company_badges BOOLEAN NOT NULL DEFAULT FALSE,
  allow_referrals BOOLEAN NOT NULL DEFAULT FALSE,
  allow_chat BOOLEAN NOT NULL DEFAULT FALSE,
  allow_networking BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER event_settings_updated_at BEFORE UPDATE ON event_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TICKET TYPES
-- ============================================
CREATE TABLE ticket_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  capacity INTEGER,
  sold_count INTEGER NOT NULL DEFAULT 0,
  sales_start TIMESTAMPTZ,
  sales_end TIMESTAMPTZ,
  max_per_user INTEGER NOT NULL DEFAULT 1,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'hidden', 'invite_only')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);

CREATE TRIGGER ticket_types_updated_at BEFORE UPDATE ON ticket_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TICKETS
-- ============================================
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  qr_code TEXT,
  qr_token TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_qr_token ON tickets(qr_token);
CREATE INDEX idx_tickets_type ON tickets(ticket_type_id);

CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- REGISTRATIONS
-- ============================================
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'approved', 'rejected', 'waitlisted', 'cancelled')),
  ticket_id UUID REFERENCES tickets(id),
  source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct', 'invitation', 'referral')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id, ticket_type_id)
);

CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_user ON registrations(user_id);
CREATE INDEX idx_registrations_status ON registrations(status);

CREATE TRIGGER registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- EVENT INVITATIONS
-- ============================================
CREATE TABLE event_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invitee_name TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  invitee_phone TEXT,
  invitee_company TEXT,
  invitee_title TEXT,
  ticket_type_id UUID REFERENCES ticket_types(id),
  tag TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'accepted', 'declined', 'waitlisted', 'checked_in', 'failed', 'bounced')),
  rsvp_token TEXT UNIQUE,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  delivery_channel TEXT NOT NULL DEFAULT 'email' CHECK (delivery_channel IN ('email', 'whatsapp', 'manual')),
  whatsapp_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, invitee_email)
);

CREATE INDEX idx_invitations_event ON event_invitations(event_id);
CREATE INDEX idx_invitations_email ON event_invitations(invitee_email);
CREATE INDEX idx_invitations_status ON event_invitations(status);
CREATE INDEX idx_invitations_rsvp_token ON event_invitations(rsvp_token);

CREATE TRIGGER invitations_updated_at BEFORE UPDATE ON event_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- EVENT MOVEMENTS (Main Gate Check-in/out)
-- ============================================
CREATE TABLE event_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('check_in', 'check_out')),
  scanned_by UUID REFERENCES profiles(id),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_system_generated BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_movements_event ON event_movements(event_id);
CREATE INDEX idx_event_movements_ticket ON event_movements(ticket_id);
CREATE INDEX idx_event_movements_user ON event_movements(user_id);
CREATE INDEX idx_event_movements_scanned_at ON event_movements(scanned_at);

-- ============================================
-- SPACES (Sub-areas within events)
-- ============================================
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  capacity INTEGER,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  registration_mode TEXT NOT NULL DEFAULT 'walk_in_only' CHECK (registration_mode IN ('walk_in_only', 'preregistration_required', 'mixed')),
  visibility TEXT NOT NULL DEFAULT 'public_on_event_page' CHECK (visibility IN ('public_on_event_page', 'internal_only')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spaces_event ON spaces(event_id);

CREATE TRIGGER spaces_updated_at BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SPACE REGISTRATIONS
-- ============================================
CREATE TABLE space_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'waitlisted', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(space_id, user_id)
);

CREATE INDEX idx_space_registrations_space ON space_registrations(space_id);

CREATE TRIGGER space_registrations_updated_at BEFORE UPDATE ON space_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SPACE MOVEMENTS
-- ============================================
CREATE TABLE space_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('check_in', 'check_out')),
  scanned_by UUID REFERENCES profiles(id),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_space_movements_space ON space_movements(space_id);
CREATE INDEX idx_space_movements_event ON space_movements(event_id);

-- ============================================
-- EVENT STAFF ASSIGNMENTS
-- ============================================
CREATE TABLE event_staff_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('event_manager', 'gate_scanner', 'space_controller', 'redeemer', 'support_staff')),
  space_id UUID REFERENCES spaces(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id, role)
);

CREATE INDEX idx_staff_assignments_event ON event_staff_assignments(event_id);
CREATE INDEX idx_staff_assignments_user ON event_staff_assignments(user_id);

CREATE TRIGGER staff_assignments_updated_at BEFORE UPDATE ON event_staff_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- REDEEM ITEMS
-- ============================================
CREATE TABLE redeem_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  station TEXT,
  time_window_start TIMESTAMPTZ,
  time_window_end TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_redeem_items_event ON redeem_items(event_id);

CREATE TRIGGER redeem_items_updated_at BEFORE UPDATE ON redeem_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TICKET TYPE REDEEMS (Mapping)
-- ============================================
CREATE TABLE ticket_type_redeems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  redeem_item_id UUID NOT NULL REFERENCES redeem_items(id) ON DELETE CASCADE,
  quantity_allowed INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_type_id, redeem_item_id)
);

CREATE INDEX idx_ttr_ticket_type ON ticket_type_redeems(ticket_type_id);
CREATE INDEX idx_ttr_redeem_item ON ticket_type_redeems(redeem_item_id);

-- ============================================
-- TICKET REDEEM BALANCES
-- ============================================
CREATE TABLE ticket_redeem_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  redeem_item_id UUID NOT NULL REFERENCES redeem_items(id) ON DELETE CASCADE,
  total_allowed INTEGER NOT NULL DEFAULT 0,
  total_redeemed INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER GENERATED ALWAYS AS (total_allowed - total_redeemed) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id, redeem_item_id)
);

CREATE INDEX idx_trb_ticket ON ticket_redeem_balances(ticket_id);

CREATE TRIGGER trb_updated_at BEFORE UPDATE ON ticket_redeem_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- REDEEM LOGS
-- ============================================
CREATE TABLE redeem_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  redeem_item_id UUID NOT NULL REFERENCES redeem_items(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  redeemed_by UUID REFERENCES profiles(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  station TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_redeem_logs_ticket ON redeem_logs(ticket_id);
CREATE INDEX idx_redeem_logs_event ON redeem_logs(event_id);
CREATE INDEX idx_redeem_logs_item ON redeem_logs(redeem_item_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_type_redeems ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_redeem_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Organizations: viewable by all authenticated, manageable by members
CREATE POLICY "Organizations are viewable by authenticated" ON organizations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Org members can update org" ON organizations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Organization members: viewable by org members
CREATE POLICY "Org members can view members" ON organization_members
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organization_id AND om.user_id = auth.uid())
  );
CREATE POLICY "Org admins can manage members" ON organization_members
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organization_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin'))
  );

-- Applications: users see their own, admins see all
CREATE POLICY "Users can view own applications" ON organizer_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND platform_role = 'admin'));
CREATE POLICY "Users can create applications" ON organizer_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update applications" ON organizer_applications
  FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND platform_role = 'admin'));

-- Events: public events visible to all, private events to org members
CREATE POLICY "Published public events visible to all" ON events
  FOR SELECT TO authenticated USING (
    (is_published = true AND visibility = 'public') OR
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = events.organization_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND platform_role = 'admin')
  );
CREATE POLICY "Org members can manage events" ON events
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = events.organization_id AND user_id = auth.uid())
  );

-- Event settings: follow event access
CREATE POLICY "Event settings follow event access" ON event_settings
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND (
      (is_published = true AND visibility = 'public') OR
      EXISTS (SELECT 1 FROM organization_members WHERE organization_id = events.organization_id AND user_id = auth.uid())
    ))
  );
CREATE POLICY "Org members can manage event settings" ON event_settings
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );

-- Ticket types: visible on public events, manageable by org members
CREATE POLICY "Ticket types visible on public events" ON ticket_types
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND is_published = true) OR
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );
CREATE POLICY "Org members can manage ticket types" ON ticket_types
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );

-- Tickets: users see own tickets, org members see event tickets
CREATE POLICY "Users can view own tickets" ON tickets
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );
CREATE POLICY "System can manage tickets" ON tickets
  FOR ALL TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );

-- Registrations
CREATE POLICY "Users see own registrations" ON registrations
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );
CREATE POLICY "Users can register" ON registrations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Org members can manage registrations" ON registrations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );

-- Invitations
CREATE POLICY "Invitees can view their invitations" ON event_invitations
  FOR SELECT TO authenticated USING (
    invitee_email = (SELECT email FROM profiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = event_invitations.organization_id AND user_id = auth.uid())
  );
CREATE POLICY "Org members can manage invitations" ON event_invitations
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = event_invitations.organization_id AND user_id = auth.uid())
  );

-- Event movements
CREATE POLICY "Users see own movements" ON event_movements
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM event_staff_assignments WHERE event_id = event_movements.event_id AND user_id = auth.uid() AND is_active = true)
  );
CREATE POLICY "Staff can record movements" ON event_movements
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM event_staff_assignments WHERE event_id = event_movements.event_id AND user_id = auth.uid() AND is_active = true)
  );

-- Spaces
CREATE POLICY "Spaces visible on events" ON spaces
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND is_published = true) OR
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );
CREATE POLICY "Org members manage spaces" ON spaces
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );

-- Space registrations
CREATE POLICY "Users see own space registrations" ON space_registrations
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );
CREATE POLICY "Users can register for spaces" ON space_registrations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Space movements
CREATE POLICY "Space movements viewable by relevant users" ON space_movements
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );
CREATE POLICY "Staff can record space movements" ON space_movements
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM event_staff_assignments WHERE event_id = space_movements.event_id AND user_id = auth.uid() AND is_active = true)
  );

-- Staff assignments
CREATE POLICY "Staff can view own assignments" ON event_staff_assignments
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = event_staff_assignments.organization_id AND user_id = auth.uid())
  );
CREATE POLICY "Org members manage staff" ON event_staff_assignments
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = event_staff_assignments.organization_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
  );

-- Redeem items
CREATE POLICY "Redeem items viewable on events" ON redeem_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id)
  );
CREATE POLICY "Org members manage redeem items" ON redeem_items
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );

-- Ticket type redeems
CREATE POLICY "Ticket type redeems viewable" ON ticket_type_redeems
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Org members manage mappings" ON ticket_type_redeems
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM ticket_types tt JOIN events e ON e.id = tt.event_id JOIN organization_members om ON om.organization_id = e.organization_id WHERE tt.id = ticket_type_id AND om.user_id = auth.uid())
  );

-- Ticket redeem balances
CREATE POLICY "Users see own balances" ON ticket_redeem_balances
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM tickets t JOIN events e ON e.id = t.event_id JOIN organization_members om ON om.organization_id = e.organization_id WHERE t.id = ticket_id AND om.user_id = auth.uid())
  );
CREATE POLICY "System manages balances" ON ticket_redeem_balances
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM tickets t JOIN events e ON e.id = t.event_id JOIN organization_members om ON om.organization_id = e.organization_id WHERE t.id = ticket_id AND om.user_id = auth.uid())
  );

-- Redeem logs
CREATE POLICY "Redeem logs viewable" ON redeem_logs
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid())
  );
CREATE POLICY "Staff can create redeem logs" ON redeem_logs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM events e JOIN organization_members om ON om.organization_id = e.organization_id WHERE e.id = event_id AND om.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM event_staff_assignments WHERE event_id = redeem_logs.event_id AND user_id = auth.uid() AND is_active = true AND role = 'redeemer')
  );

-- ============================================
-- ADMIN BYPASS: Allow service_role to bypass RLS
-- (already handled by Supabase default behavior)
-- ============================================

-- Grant admin users full access through a helper function
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND platform_role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;