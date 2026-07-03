import { createServiceClient } from '@/lib/supabase-server';
import { sendStaffAssignmentEmail } from './email.service';
import type {
  Profile,
  EventStaffAssignment,
  EventStaffRole,
  OrgRole,
  OrganizationMember,
  Space,
} from '@/types/database.types';

export type StaffAssignmentWithDetails = EventStaffAssignment & {
  profile: Profile;
  space: Space | null;
};

export type OrganizationMemberWithProfile = OrganizationMember & {
  profile: Profile;
};

export async function findUserByEmail(email: string): Promise<Profile | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw new Error(`Failed to find user by email: ${error.message}`);
  return data as Profile | null;
}

export async function assignEventStaff(
  eventId: string,
  orgId: string,
  userEmail: string,
  role: EventStaffRole,
  spaceId?: string | null
): Promise<EventStaffAssignment> {
  const supabase = createServiceClient();

  const profile = await findUserByEmail(userEmail);
  if (!profile) {
    throw new Error(
      `No account exists for ${userEmail}. Ask them to sign up with this email first, then assign them.`
    );
  }

  const { data, error } = await supabase
    .from('event_staff_assignments')
    .insert({
      event_id: eventId,
      organization_id: orgId,
      user_id: profile.id,
      role,
      space_id: spaceId ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to assign event staff: ${error.message}`);

  // Best-effort: email the co-organizer a direct link to manage the event.
  try {
    await sendStaffAssignmentEmail({
      eventId,
      toEmail: profile.email,
      assigneeName: profile.full_name,
      role,
      needsSignup: false,
    });
  } catch (e) {
    console.warn(`[team] assignment email failed for ${userEmail}:`, e);
  }

  return data as EventStaffAssignment;
}

export async function getEventStaff(eventId: string): Promise<StaffAssignmentWithDetails[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('event_staff_assignments')
    .select('*, profile:profiles(*), space:spaces(*)')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('role', { ascending: true });

  if (error) throw new Error(`Failed to fetch event staff: ${error.message}`);

  return ((data ?? []) as unknown as Array<EventStaffAssignment & { profile: Profile; space: Space | null }>).map(
    ({ profile, space, ...rest }) => ({ ...rest, profile, space })
  );
}

export async function updateStaffRole(
  assignmentId: string,
  role: EventStaffRole,
  spaceId?: string | null
): Promise<EventStaffAssignment> {
  const supabase = createServiceClient();

  const updates: Record<string, string | null | EventStaffRole> = {
    role,
    updated_at: new Date().toISOString(),
  };
  if (spaceId !== undefined) {
    updates.space_id = spaceId ?? null;
  }

  const { data, error } = await supabase
    .from('event_staff_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update staff role: ${error.message}`);
  return data as EventStaffAssignment;
}

export async function removeStaffAssignment(assignmentId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('event_staff_assignments')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', assignmentId);

  if (error) throw new Error(`Failed to remove staff assignment: ${error.message}`);
}

export async function getUserEventRoles(
  userId: string,
  eventId: string
): Promise<EventStaffAssignment[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('event_staff_assignments')
    .select('*')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (error) throw new Error(`Failed to fetch user event roles: ${error.message}`);
  return (data ?? []) as EventStaffAssignment[];
}

export async function inviteOrganizationMember(
  orgId: string,
  userEmail: string,
  role: OrgRole
): Promise<OrganizationMember> {
  const supabase = createServiceClient();

  const profile = await findUserByEmail(userEmail);
  if (!profile) {
    throw new Error(`User not found with email: ${userEmail}`);
  }

  const { data, error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: profile.id,
      role,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to invite organization member: ${error.message}`);
  return data as OrganizationMember;
}

export async function getOrganizationTeam(orgId: string): Promise<OrganizationMemberWithProfile[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('*, profile:profiles(*)')
    .eq('organization_id', orgId)
    .order('role', { ascending: true });

  if (error) throw new Error(`Failed to fetch organization team: ${error.message}`);

  return ((data ?? []) as unknown as Array<OrganizationMember & { profile: Profile }>).map(
    ({ profile, ...rest }) => ({ ...rest, profile })
  );
}
