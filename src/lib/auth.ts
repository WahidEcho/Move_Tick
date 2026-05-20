import { createClient, createServiceClient } from './supabase-server';
import { redirect } from 'next/navigation';
import type { Profile, OrgRole, EventStaffRole } from '@/types/database.types';

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
}

export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.platform_role !== 'admin') redirect('/');
  return profile;
}

export async function requireOrganizer(organizationId: string): Promise<{
  profile: Profile;
  role: OrgRole;
}> {
  const profile = await requireAuth();
  const supabase = createServiceClient();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', profile.id)
    .single();

  if (!membership) redirect('/');

  return { profile, role: membership.role as OrgRole };
}

export async function getUserOrganizations(userId: string) {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations(*)
    `)
    .eq('user_id', userId);

  return (data ?? []).map((m) => ({
    ...(m.organization as unknown as Record<string, unknown>),
    role: m.role as OrgRole,
  }));
}

export async function getActiveOrganizerOrg(): Promise<{
  profile: Profile;
  org: import('@/types/database.types').Organization & { role: OrgRole };
}> {
  const profile = await requireAuth();
  const orgs = await getUserOrganizations(profile.id);
  if (!orgs.length) redirect('/apply-organizer');
  return { profile, org: orgs[0] as import('@/types/database.types').Organization & { role: OrgRole } };
}

export async function getUserEventAssignments(userId: string) {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('event_staff_assignments')
    .select(`
      *,
      event:events(*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  return data ?? [];
}

export async function checkEventStaffRole(
  userId: string,
  eventId: string,
  roles: EventStaffRole[]
): Promise<boolean> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('event_staff_assignments')
    .select('role')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('is_active', true)
    .in('role', roles);

  return (data ?? []).length > 0;
}
