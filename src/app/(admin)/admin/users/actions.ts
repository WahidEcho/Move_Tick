'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/lib/auth';
import {
  adminUpdateUser,
  adminSetUserRole,
  adminSetUserDisabled,
  adminAssignUserToOrg,
  adminAssignUserToEventTeam,
} from '@/services/admin.service';
import { getOrganizations } from '@/services/organizations.service';
import { getEventsForAdmin } from '@/services/events.service';
import type { EventStaffRole, OrgRole, UserRole } from '@/types/database.types';

export async function updateUserAction(userId: string, data: { full_name?: string | null; phone?: string | null }) {
  const profile = await requireSuperAdmin();
  await adminUpdateUser(userId, data, profile.id);
  revalidatePath('/admin/users');
  return { success: true };
}

export async function setUserRoleAction(userId: string, role: UserRole, reason?: string) {
  const profile = await requireSuperAdmin();
  await adminSetUserRole(userId, role, profile.id, reason || null);
  revalidatePath('/admin/users');
  return { success: true };
}

export async function setUserDisabledAction(userId: string, disabled: boolean, reason?: string) {
  const profile = await requireSuperAdmin();
  await adminSetUserDisabled(userId, disabled, profile.id, reason || null);
  revalidatePath('/admin/users');
  return { success: true };
}

export async function assignUserToOrgAction(userId: string, organizationId: string, role: OrgRole) {
  const profile = await requireSuperAdmin();
  await adminAssignUserToOrg(userId, organizationId, role, profile.id);
  revalidatePath('/admin/users');
  return { success: true };
}

export async function assignUserToEventTeamAction(
  email: string,
  eventId: string,
  organizationId: string,
  role: EventStaffRole
) {
  const profile = await requireSuperAdmin();
  await adminAssignUserToEventTeam(email, eventId, organizationId, role, profile.id);
  revalidatePath('/admin/users');
  return { success: true };
}

export async function getOrganizationOptionsAction() {
  await requireSuperAdmin();
  const { data } = await getOrganizations({ page_size: 500 });
  return data.map((org) => ({ id: org.id, name: org.name }));
}

export async function searchEventsForAssignmentAction(query: string) {
  await requireSuperAdmin();
  const { data } = await getEventsForAdmin({ search: query || undefined, page_size: 10 });
  return data.map((e) => ({
    id: e.id,
    title: e.title,
    organizationId: e.organization_id,
    organizationName: e.organization?.name ?? '—',
  }));
}
