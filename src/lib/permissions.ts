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
  orgMemberships: { role: OrgRole }[]
): boolean {
  if (isPlatformAdmin(platformRole)) return true;
  return orgMemberships.length > 0;
}

export function canAccessAdminPanel(platformRole: UserRole): boolean {
  return isPlatformAdmin(platformRole);
}
