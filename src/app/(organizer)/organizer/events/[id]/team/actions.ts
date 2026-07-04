'use server';

import { revalidatePath } from 'next/cache';
import { getEventManageAccess } from '@/lib/auth';
import {
  assignEventStaff,
  updateStaffRole,
  removeStaffAssignment,
} from '@/services/team.service';
import type { EventStaffRole } from '@/types/database.types';

export async function assignStaffAction(
  eventId: string,
  userEmail: string,
  role: EventStaffRole,
  spaceId?: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }
  try {
    await assignEventStaff(eventId, access.event.organization_id, userEmail, role, spaceId);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/team`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to assign staff',
    };
  }
}

export async function updateStaffRoleAction(
  eventId: string,
  assignmentId: string,
  role: EventStaffRole,
  spaceId?: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }
  try {
    await updateStaffRole(assignmentId, role, spaceId);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/team`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update role',
    };
  }
}

export async function removeStaffAction(
  eventId: string,
  assignmentId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }
  try {
    await removeStaffAssignment(assignmentId);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/team`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to remove staff',
    };
  }
}
