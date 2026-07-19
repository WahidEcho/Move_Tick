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
export type OrganizationStatus = 'active' | 'pending' | 'suspended' | 'on_hold' | 'rejected';
export type NotificationType =
  | 'org_approved' | 'org_rejected' | 'org_more_info_requested'
  | 'org_suspended' | 'org_on_hold' | 'org_reactivated'
  | 'org_limit_reached' | 'event_hidden' | 'event_published' | 'staff_assigned' | 'general'
  | 'ticket_issued';
export type ContractStatus =
  | 'draft' | 'generated' | 'sent' | 'viewed' | 'signed' | 'completed' | 'declined' | 'expired' | 'failed';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  platform_role: UserRole;
  is_disabled: boolean;
  disabled_at: string | null;
  marketing_opt_out: boolean;
  unsubscribe_token: string;
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
  status: OrganizationStatus;
  contact_email: string | null;
  contact_phone: string | null;
  max_events: number | null;
  max_published_events: number | null;
  can_create_paid: boolean;
  requires_publish_approval: boolean;
  commission_percentage: number | null;
  fixed_fee_egp: number | null;
  suspended_reason: string | null;
  hide_events_on_suspend: boolean;
  archived_at: string | null;
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
  is_hidden: boolean;
  archived_at: string | null;
  doors_open_time: string | null;
  maps_url: string | null;
  facilities: string[];
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
  payment_id: string | null;
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

// ─── Round 5: super-admin control center ──────────────────────────────────

export interface PlatformSettings {
  id: string;
  commission_percentage: number;
  fixed_fee_egp: number;
  xpay_fee_percentage: number;
  xpay_fee_fixed_egp: number;
  event_expiry_buffer_hours: number;
  default_timezone: string;
  org_approval_required: boolean;
  default_max_events: number | null;
  default_event_duration_hours: number | null;
  support_email: string;
  admin_alert_email: string;
  public_contact: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  organization_id: string | null;
  notification_type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
}

export interface AdminAuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  previous_value: Json | null;
  new_value: Json | null;
  reason: string | null;
  created_at: string;
  actor?: Profile;
}

export interface EmailLogEntry {
  id: string;
  recipient_email: string;
  email_type: string;
  subject: string;
  related_organization_id: string | null;
  related_event_id: string | null;
  delivery_status: 'sent' | 'failed';
  failure_reason: string | null;
  sent_at: string;
}

export interface Contract {
  id: string;
  organization_id: string;
  entity_name: string;
  contract_template_id: string | null;
  docusign_envelope_id: string | null;
  docusign_signing_url: string | null;
  contract_status: ContractStatus;
  commission_percentage: number | null;
  fixed_fee_per_paid_ticket: number | null;
  generated_at: string | null;
  sent_at: string | null;
  signed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Round 6: event commission, financial settlements, organizer payouts ──

export type CommissionSource = 'custom_event_commission' | 'organization_override' | 'default_platform_commission';
export type SettlementStatus =
  | 'pending_calculation'
  | 'ready_for_payment'
  | 'partially_paid'
  | 'paid'
  | 'invoice_sent'
  | 'completed'
  | 'disputed'
  | 'cancelled';
export type InvoiceStatus = 'generated' | 'sent' | 'failed' | 'resent';

export interface EventCommissionSettings {
  id: string;
  event_id: string;
  custom_commission_percentage: number | null;
  custom_fixed_fee_egp: number | null;
  is_custom_commission_enabled: boolean;
  is_locked: boolean;
  applied_commission_percentage: number;
  applied_fixed_fee_egp: number;
  commission_source: CommissionSource;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventFinancialSettlement {
  id: string;
  event_id: string;
  organization_id: string;
  gross_ticket_revenue: number;
  refund_amount: number;
  discount_amount: number;
  paid_ticket_count: number;
  free_ticket_count: number;
  applied_commission_percentage: number;
  commission_source: CommissionSource;
  percentage_commission_amount: number;
  fixed_fee_per_paid_ticket: number;
  fixed_ticket_fee_amount: number;
  payment_gateway_fees: number | null;
  taxes_amount: number | null;
  total_platform_fees: number;
  organizer_net_profit: number;
  amount_paid_to_organizer: number;
  remaining_amount_due: number;
  settlement_status: SettlementStatus;
  internal_notes: string | null;
  calculated_at: string;
  paid_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizerPayoutRecord {
  id: string;
  event_id: string;
  organization_id: string;
  settlement_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  payment_reference: string | null;
  proof_of_payment_url: string | null;
  internal_notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementInvoiceLog {
  id: string;
  event_id: string;
  organization_id: string;
  settlement_id: string;
  payout_record_id: string | null;
  invoice_number: string;
  invoice_status: InvoiceStatus;
  recipient_email: string;
  email_sent_at: string | null;
  pdf_generated: boolean;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Round 7: marketing announcements ──────────────────────────────────
export type AnnouncementAudience = 'attendees' | 'organizers' | 'both';
export type AnnouncementStatus = 'draft' | 'sending' | 'sent' | 'failed';
export type AnnouncementRecipientStatus = 'pending' | 'sent' | 'failed';

export interface Announcement {
  id: string;
  created_by: string;
  subject: string;
  headline: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  audience: AnnouncementAudience;
  send_in_app: boolean;
  status: AnnouncementStatus;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  test_sent_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementRecipient {
  id: string;
  announcement_id: string;
  user_id: string | null;
  email: string;
  status: AnnouncementRecipientStatus;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

// ─── W4 (2026-07-16): refund requests ─────────────────────────────────────

export type RefundRequestStatus = 'pending' | 'approved' | 'rejected';

export interface RefundRequest {
  id: string;
  payment_id: string;
  event_id: string;
  organization_id: string;
  requested_by: string;
  reason: string;
  status: RefundRequestStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
}
