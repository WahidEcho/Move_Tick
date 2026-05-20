import type {
  Event,
  EventSettings,
  EventInvitation,
  Registration,
  Ticket,
  TicketType,
  Space,
  RedeemItem,
  TicketTypeRedeem,
  EventMovement,
  SpaceMovement,
  Profile,
  Organization,
  OrganizerApplication,
  EventStaffAssignment,
  OrgRole,
  EventStaffRole,
  ApplicationStatus,
  InvitationStatus,
  RegistrationStatus,
  AttendeePresence,
} from './database.types';

export interface EventWithDetails extends Omit<Event, 'organization' | 'event_settings'> {
  event_settings: EventSettings | null;
  organization: Organization | null;
  ticket_types?: TicketType[];
  _count?: {
    registrations: number;
    confirmed: number;
    checked_in: number;
    capacity_remaining: number | null;
  };
}

export interface AttendeeDetails {
  registration: Registration;
  ticket: Ticket | null;
  profile: Profile;
  presence: AttendeePresence;
  movements: EventMovement[];
  space_participations: SpaceMovement[];
  redeem_history: { item_name: string; quantity: number; redeemed_at: string }[];
}

export interface InvitationWithDetails extends Omit<EventInvitation, 'ticket_type'> {
  ticket_type: TicketType | null;
  event?: Event;
}

export interface SpaceWithOccupancy extends Space {
  current_occupancy: number;
  available_spots: number | null;
  total_visits: number;
  peak_usage: number;
}

export interface RedeemItemWithMapping extends RedeemItem {
  ticket_type_redeems: TicketTypeRedeem[];
}

export interface StaffAssignmentWithDetails extends Omit<EventStaffAssignment, 'profile' | 'space'> {
  profile: Profile;
  space: Space | null;
}

export interface InvitationFunnel {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  accepted: number;
  declined: number;
  waitlisted: number;
  checked_in: number;
  failed: number;
}

export interface EventAnalytics {
  total_registrations: number;
  approved_attendees: number;
  waitlist_count: number;
  checked_in: number;
  currently_inside: number;
  left_early: number;
  no_shows: number;
  invitation_funnel: InvitationFunnel;
  space_summaries: { space_id: string; name: string; current_occupancy: number; capacity: number | null }[];
  redeem_summaries: { item_id: string; name: string; total_redeemed: number; total_allowed: number }[];
}

export interface PlatformAnalytics {
  total_applications: number;
  pending_applications: number;
  total_organizations: number;
  total_events: number;
  total_attendees: number;
  total_registrations: number;
}

export interface OrganizerDashboardSummary {
  upcoming_events: number;
  total_registrations: number;
  total_invitations: number;
  active_staff: number;
  capacity_overview: { event_id: string; title: string; capacity: number | null; registered: number }[];
}

export interface CSVInviteeRow {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  ticket_type?: string;
  tag?: string;
}

export interface CSVParseResult {
  valid: CSVInviteeRow[];
  invalid: { row: number; data: Record<string, string>; errors: string[] }[];
  duplicates: CSVInviteeRow[];
  already_invited: CSVInviteeRow[];
  total: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface FilterParams {
  search?: string;
  status?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export type UserContext = {
  user: Profile;
  organizations: (Organization & { role: OrgRole })[];
  staff_assignments: (EventStaffAssignment & { event: Event })[];
  is_admin: boolean;
  is_organizer: boolean;
};

export type NotificationType =
  | 'approval_email'
  | 'organizer_welcome'
  | 'invitation_email'
  | 'confirmation_email'
  | 'ticket_email'
  | 'terms_delivery'
  | 'organizer_manual';

export interface NotificationPayload {
  type: NotificationType;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  data: Record<string, unknown>;
}
