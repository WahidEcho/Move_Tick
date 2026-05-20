import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
});

export const organizerApplicationSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(5, 'Phone number is required'),
  role_title: z.string().optional(),
  organization_name: z.string().min(2, 'Organization name is required'),
  organization_type: z.string().min(1, 'Organization type is required'),
  website: z.string().url().optional().or(z.literal('')),
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  city: z.string().min(1, 'City is required'),
  organization_description: z.string().min(20, 'Please provide at least 20 characters'),
  event_categories: z.array(z.string()).min(1, 'Select at least one category'),
  expected_events_per_month: z.number().min(1).max(100),
  expected_avg_attendees: z.number().min(1).max(100000),
  terms_accepted: z.boolean().refine((v) => v === true, { message: 'You must accept the terms' }),
});

export const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  cover_image_url: z.string().url().optional().or(z.literal('')),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  location: z.string().optional(),
  venue: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  visibility: z.enum(['public', 'private', 'invite_only', 'members_only']),
  capacity: z.number().min(1).optional().nullable(),
});

export const eventSettingsSchema = z.object({
  approval_required: z.boolean(),
  enable_waitlist: z.boolean(),
  show_guest_list: z.boolean(),
  show_registered_count: z.boolean(),
  show_remaining_seats: z.boolean(),
  show_attendee_preview: z.boolean(),
  show_company_badges: z.boolean(),
  allow_referrals: z.boolean(),
  allow_chat: z.boolean(),
  allow_networking: z.boolean(),
});

export const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be 0 or more'),
  capacity: z.number().min(1).optional().nullable(),
  sales_start: z.string().optional(),
  sales_end: z.string().optional(),
  max_per_user: z.number().min(1).max(10),
  visibility: z.enum(['public', 'hidden', 'invite_only']),
});

export const spaceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'Type is required'),
  capacity: z.number().min(1).optional().nullable(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  registration_mode: z.enum(['walk_in_only', 'preregistration_required', 'mixed']),
  visibility: z.enum(['public_on_event_page', 'internal_only']),
});

export const redeemItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  station: z.string().optional(),
  time_window_start: z.string().optional(),
  time_window_end: z.string().optional(),
});

export const ticketTypeRedeemSchema = z.object({
  ticket_type_id: z.string().uuid(),
  redeem_item_id: z.string().uuid(),
  quantity_allowed: z.number().min(1),
});

export const staffAssignmentSchema = z.object({
  user_email: z.string().email('Valid email required'),
  role: z.enum(['event_manager', 'gate_scanner', 'space_controller', 'redeemer', 'support_staff']),
  space_id: z.string().uuid().optional().nullable(),
});

export const orgMemberInviteSchema = z.object({
  user_email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'manager']),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type OrganizerApplicationInput = z.infer<typeof organizerApplicationSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type EventSettingsInput = z.infer<typeof eventSettingsSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;
export type SpaceInput = z.infer<typeof spaceSchema>;
export type RedeemItemInput = z.infer<typeof redeemItemSchema>;
export type TicketTypeRedeemInput = z.infer<typeof ticketTypeRedeemSchema>;
export type StaffAssignmentInput = z.infer<typeof staffAssignmentSchema>;
export type OrgMemberInviteInput = z.infer<typeof orgMemberInviteSchema>;
