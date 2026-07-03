export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'attendee' | 'organizer' | 'admin';
export type OrgRole = 'owner' | 'admin' | 'manager';
export type EventStaffRole = 'event_manager' | 'gate_scanner' | 'space_controller' | 'redeemer' | 'support_staff';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'more_info_requested';
export type EventVisibility = 'public' | 'private' | 'invite_only' | 'members_only';
export type RegistrationStatus = 'pending' | 'confirmed' | 'approved' | 'rejected' | 'waitlisted' | 'cancelled';
export type InvitationStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'accepted' | 'declined' | 'waitlisted' | 'checked_in' | 'failed' | 'bounced';
export type MovementType = 'check_in' | 'check_out';
export type AttendeePresence = 'inside_event' | 'outside_event' | 'never_arrived';
export type SpaceRegistrationMode = 'walk_in_only' | 'preregistration_required' | 'mixed';
export type SpaceVisibility = 'public_on_event_page' | 'internal_only';
export type TicketVisibility = 'public' | 'hidden' | 'invite_only';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  platform_role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  country: string | null;
  city: string | null;
  type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  organization?: Organization;
}

export interface OrganizerApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role_title: string | null;
  organization_name: string;
  organization_type: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  country: string | null;
  city: string | null;
  organization_description: string | null;
  event_categories: string[] | null;
  expected_events_per_month: number | null;
  expected_avg_attendees: number | null;
  terms_accepted: boolean;
  status: ApplicationStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Event {
  id: string;
  organization_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  start_date: string;
  end_date: string;
  location: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  visibility: EventVisibility;
  capacity: number | null;
  is_published: boolean;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  event_settings?: EventSettings;
}

export interface EventSettings {
  id: string;
  event_id: string;
  approval_required: boolean;
  enable_waitlist: boolean;
  show_guest_list: boolean;
  show_registered_count: boolean;
  show_remaining_seats: boolean;
  show_attendee_preview: boolean;
  show_company_badges: boolean;
  allow_referrals: boolean;
  allow_chat: boolean;
  allow_networking: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  capacity: number | null;
  sold_count: number;
  sales_start: string | null;
  sales_end: string | null;
  max_per_user: number;
  visibility: TicketVisibility;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  ticket_type_id: string;
  user_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  invitation_id: string | null;
  qr_code: string | null;
  qr_token: string | null;
  is_active: boolean;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  ticket_type?: TicketType;
  profile?: Profile;
  event?: Event;
}

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  ticket_type_id: string;
  status: RegistrationStatus;
  ticket_id: string | null;
  source: 'direct' | 'invitation' | 'referral';
  notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  ticket_type?: TicketType;
  ticket?: Ticket;
}

export interface EventInvitation {
  id: string;
  event_id: string;
  organization_id: string;
  invitee_name: string;
  invitee_email: string;
  invitee_phone: string | null;
  invitee_company: string | null;
  invitee_title: string | null;
  ticket_type_id: string | null;
  tag: string | null;
  status: InvitationStatus;
  rsvp_token: string | null;
  sent_at: string | null;
  opened_at: string | null;
  responded_at: string | null;
  delivery_channel: 'email' | 'whatsapp' | 'manual';
  whatsapp_status: string | null;
  created_at: string;
  updated_at: string;
  ticket_type?: TicketType;
}

export interface EventMovement {
  id: string;
  event_id: string;
  ticket_id: string;
  user_id: string;
  movement_type: MovementType;
  scanned_by: string | null;
  scanned_at: string;
  is_system_generated: boolean;
  notes: string | null;
  created_at: string;
}

export interface Space {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  type: string | null;
  capacity: number | null;
  start_time: string | null;
  end_time: string | null;
  registration_mode: SpaceRegistrationMode;
  visibility: SpaceVisibility;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpaceRegistration {
  id: string;
  space_id: string;
  event_id: string;
  user_id: string;
  ticket_id: string;
  status: 'registered' | 'waitlisted' | 'cancelled';
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface SpaceMovement {
  id: string;
  space_id: string;
  event_id: string;
  ticket_id: string;
  user_id: string;
  movement_type: MovementType;
  scanned_by: string | null;
  scanned_at: string;
  created_at: string;
}

export interface EventStaffAssignment {
  id: string;
  event_id: string;
  organization_id: string;
  user_id: string;
  role: EventStaffRole;
  space_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  space?: Space;
}

export interface RedeemItem {
  id: string;
  event_id: string;
  name: string;
  category: string | null;
  description: string | null;
  station: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketTypeRedeem {
  id: string;
  ticket_type_id: string;
  redeem_item_id: string;
  quantity_allowed: number;
  created_at: string;
  redeem_item?: RedeemItem;
  ticket_type?: TicketType;
}

export interface TicketRedeemBalance {
  id: string;
  ticket_id: string;
  redeem_item_id: string;
  total_allowed: number;
  total_redeemed: number;
  remaining: number;
  created_at: string;
  updated_at: string;
  redeem_item?: RedeemItem;
}

export interface RedeemLog {
  id: string;
  ticket_id: string;
  redeem_item_id: string;
  event_id: string;
  user_id: string;
  redeemed_by: string | null;
  quantity: number;
  redeemed_at: string;
  station: string | null;
  notes: string | null;
  created_at: string;
}
