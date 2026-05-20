export const APP_NAME = 'Move Beyond';
export const APP_DESCRIPTION = 'The modern event operating system for organizers and attendees';

export const EVENT_CATEGORIES = [
  'Conference',
  'Workshop',
  'Meetup',
  'Networking',
  'Concert',
  'Festival',
  'Sports',
  'Exhibition',
  'Seminar',
  'Webinar',
  'Hackathon',
  'Community',
  'Corporate',
  'Charity',
  'Other',
] as const;

export const ORGANIZATION_TYPES = [
  'Company',
  'Startup',
  'Non-profit',
  'Government',
  'Educational',
  'Community Group',
  'Agency',
  'Freelancer',
  'Other',
] as const;

export const COUNTRIES = [
  'United Arab Emirates',
  'Saudi Arabia',
  'Bahrain',
  'Kuwait',
  'Oman',
  'Qatar',
  'Egypt',
  'Jordan',
  'Lebanon',
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'France',
  'India',
  'Other',
] as const;

export const REDEEM_CATEGORIES = [
  'Food',
  'Beverage',
  'Gift',
  'Merchandise',
  'Access',
  'Experience',
  'Other',
] as const;

export const SPACE_TYPES = [
  'Workshop',
  'Stadium',
  'Game Zone',
  'VIP Lounge',
  'Networking Room',
  'Mini Stage',
  'Breakout Room',
  'Exhibition Hall',
  'Other',
] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const CSV_TEMPLATE_HEADERS = ['name', 'email', 'phone', 'company', 'title', 'ticket_type', 'tag'];

export const INVITATION_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-blue-100 text-blue-800',
  opened: 'bg-indigo-100 text-indigo-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  waitlisted: 'bg-orange-100 text-orange-800',
  checked_in: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  bounced: 'bg-red-100 text-red-800',
};

export const REGISTRATION_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  waitlisted: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  more_info_requested: 'bg-blue-100 text-blue-800',
};
