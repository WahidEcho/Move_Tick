import type { OrgRole, EventStaffRole, UserRole } from '@/types/database.types';

const ORG_ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 3,
  admin: 2,
  manager: 1,
};

const PLATFORM_ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  organizer: 2,
  attendee: 1,
};

export function isPlatformAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function canManageOrganization(role: OrgRole): boolean {
  return ORG_ROLE_HIERARCHY[role] >= ORG_ROLE_HIERARCHY.manager;
}

export function canAdminOrganization(role: OrgRole): boolean {
  return ORG_ROLE_HIERARCHY[role] >= ORG_ROLE_HIERARCHY.admin;
}

export function isOrganizationOwner(role: OrgRole): boolean {
  return role === 'owner';
}

export function hasMinOrgRole(userRole: OrgRole, minRole: OrgRole): boolean {
  return ORG_ROLE_HIERARCHY[userRole] >= ORG_ROLE_HIERARCHY[minRole];
}

export function hasMinPlatformRole(userRole: UserRole, minRole: UserRole): boolean {
  return PLATFORM_ROLE_HIERARCHY[userRole] >= PLATFORM_ROLE_HIERARCHY[minRole];
}

const EVENT_ROLE_PERMISSIONS: Record<EventStaffRole, string[]> = {
  event_manager: [
    'view_event', 'edit_event', 'manage_attendees', 'manage_invitations',
    'manage_tickets', 'manage_spaces', 'manage_redeems', 'manage_staff',
    'view_analytics', 'gate_scan', 'space_scan', 'redeem_scan',
  ],
  gate_scanner: ['view_event', 'gate_scan', 'view_attendees'],
  space_controller: ['view_event', 'space_scan', 'view_spaces'],
  redeemer: ['view_event', 'redeem_scan', 'view_redeems'],
  support_staff: ['view_event', 'view_attendees', 'view_invitations'],
};

export function hasEventPermission(role: EventStaffRole, permission: string): boolean {
  return EVENT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getEventPermissions(role: EventStaffRole): string[] {
  return EVENT_ROLE_PERMISSIONS[role] ?? [];
}

export type Permission =
  | 'view_event'
  | 'edit_event'
  | 'manage_attendees'
  | 'manage_invitations'
  | 'manage_tickets'
  | 'manage_spaces'
  | 'manage_redeems'
  | 'manage_staff'
  | 'view_analytics'
  | 'gate_scan'
  | 'space_scan'
  | 'redeem_scan'
  | 'view_attendees'
  | 'view_spaces'
  | 'view_redeems'
  | 'view_invitations';

export function canAccessOrganizerDashboard(
  platformRole: UserRole,
  orgMemberships: { role: OrgRole }[],
  hasEventAssignments: boolean = false
): boolean {
  if (isPlatformAdmin(platformRole)) return true;
  return orgMemberships.length > 0 || hasEventAssignments;
}

export function canAccessAdminPanel(platformRole: UserRole): boolean {
  return isPlatformAdmin(platformRole);
}

/**
 * Plain-English capability matrix — documents what auth.ts's guards
 * (requireAdmin, requireEventAccess, getOrganizerContext) and the RLS
 * policies in supabase/migrations already enforce. Not itself an
 * enforcement mechanism; it's the reference for "who can do X."
 */
export interface PermissionMatrixEntry {
  role: string;
  scope: string;
  capabilities: string[];
}

export const PERMISSION_MATRIX: PermissionMatrixEntry[] = [
  {
    role: 'Platform admin (profiles.platform_role = "admin")',
    scope: 'Platform-wide — every organization, event, and user',
    capabilities: [
      'Full CRUD on any event: edit, hide/unhide, publish/unpublish, change organizer, archive/restore (soft delete), assign/remove staff — via the organizer UI (requireEventAccess admin bypass) and /admin/events',
      'Full control of any organization: edit contact/limits/commission, suspend/hold/reactivate, archive/restore — /admin/organizations',
      'Full control of any user: edit profile, change platform role, disable/enable (bans at the Supabase Auth level), assign to an organization or event team — /admin/users',
      'Approve / reject / request-more-info on organizer applications — /admin/applications',
      'Bypasses organizer limits (src/lib/org-limits.ts) when creating/publishing through the organizer UI — the limits are a self-service organizer guardrail, not an admin restriction',
      'Views platform-wide analytics, the super-admin dashboard, the audit log, and the email log',
      'Edits platform settings: default commission/fixed fee, event expiry buffer, org-approval requirement, default limits, contact addresses',
    ],
  },
  {
    role: 'Organization owner / admin / manager (organization_members.role)',
    scope: 'Their own organization only',
    capabilities: [
      'Create, edit, publish, cancel events for their organization (subject to org-limits.ts: max events, max published events, paid-ticket permission, publish-approval requirement)',
      'Manage ticket types, spaces, redeem items, invitations, coupons, and team for their own events',
      'Assign/remove event staff on their own events',
      "View their organization's analytics and dashboard summary",
      'No visibility into other organizations\' data (enforced by RLS: is_org_member/is_org_admin)',
    ],
  },
  {
    role: 'Event staff — event_manager (event_staff_assignments.role)',
    scope: 'Only the specific event(s) they are assigned to',
    capabilities: [
      'Same event-management capabilities as an org member, scoped to the assigned event only',
      'Counts as "canManage" in requireEventAccess — can edit the event, manage tickets/spaces/team for it',
    ],
  },
  {
    role: 'Event staff — gate_scanner / space_controller / redeemer / support_staff',
    scope: 'Only the specific event(s) they are assigned to',
    capabilities: [
      'Gate check-in/check-out scanning, space occupancy scanning, redeem-item scanning respectively',
      'Cannot edit event details, ticket types, or team — read/operate only',
    ],
  },
  {
    role: 'Organizer (profiles.platform_role = "organizer", no active membership)',
    scope: 'None until assigned to an organization or event',
    capabilities: [
      'Set automatically on organizer-application approval; grants no access by itself — actual access comes from organization_members or event_staff_assignments rows',
    ],
  },
  {
    role: 'Attendee (profiles.platform_role = "attendee")',
    scope: 'Their own registrations, tickets, and invitations',
    capabilities: [
      'Browse public, non-expired events; register or purchase tickets',
      'View/manage their own tickets, invitations, and notifications',
      'No organizer or admin surface access',
    ],
  },
];
