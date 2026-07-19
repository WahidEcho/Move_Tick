import { createServiceClient } from '@/lib/supabase-server';
import type {
  OrganizerApplication,
  ApplicationStatus,
  OrgRole,
} from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';

export interface SubmitApplicationData {
  full_name: string;
  email: string;
  phone?: string | null;
  role_title?: string | null;
  organization_name: string;
  organization_type?: string | null;
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  country?: string | null;
  city?: string | null;
  organization_description?: string | null;
  event_categories?: string[] | null;
  expected_events_per_month?: number | null;
  expected_avg_attendees?: number | null;
  terms_accepted: boolean;
}

export interface GetApplicationsFilters {
  status?: ApplicationStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

export type OrganizerApplicationWithProfile = OrganizerApplication & {
  profile?: { id: string; full_name: string | null; email: string } | null;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function submitApplication(
  userId: string,
  data: SubmitApplicationData
): Promise<OrganizerApplication> {
  const supabase = createServiceClient();

  const { data: application, error } = await supabase
    .from('organizer_applications')
    .insert({
      user_id: userId,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone ?? null,
      role_title: data.role_title ?? null,
      organization_name: data.organization_name,
      organization_type: data.organization_type ?? null,
      website: data.website ?? null,
      instagram: data.instagram ?? null,
      linkedin: data.linkedin ?? null,
      country: data.country ?? null,
      city: data.city ?? null,
      organization_description: data.organization_description ?? null,
      event_categories: data.event_categories ?? null,
      expected_events_per_month: data.expected_events_per_month ?? null,
      expected_avg_attendees: data.expected_avg_attendees ?? null,
      terms_accepted: data.terms_accepted,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to submit application: ${error.message}`);
  return application as OrganizerApplication;
}

export async function getApplications(
  filters: GetApplicationsFilters = {}
): Promise<PaginatedResult<OrganizerApplicationWithProfile>> {
  const supabase = createServiceClient();
  const { status, search, page = 1, page_size = 20 } = filters;

  let query = supabase
    .from('organizer_applications')
    .select('*, profile:user_id(id, full_name, email)', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  if (search && search.trim()) {
    query = query.or(
      `full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,organization_name.ilike.%${search.trim()}%`
    );
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch applications: ${error.message}`);

  const total = count ?? 0;
  return {
    data: (data ?? []) as OrganizerApplicationWithProfile[],
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}

export async function getApplicationById(
  id: string
): Promise<OrganizerApplicationWithProfile | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('organizer_applications')
    .select('*, profile:user_id(id, full_name, email, phone, avatar_url)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch application: ${error.message}`);
  }

  return data as OrganizerApplicationWithProfile;
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  adminId: string,
  notes?: string | null
): Promise<OrganizerApplication> {
  const supabase = createServiceClient();

  const updates: Record<string, unknown> = {
    status,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (notes !== undefined) {
    updates.admin_notes = notes;
  }

  const { data, error } = await supabase
    .from('organizer_applications')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update application status: ${error.message}`);
  return data as OrganizerApplication;
}

export async function approveApplication(
  applicationId: string,
  adminId: string
): Promise<{ organizationId: string }> {
  const supabase = createServiceClient();

  const { data: application, error: fetchError } = await supabase
    .from('organizer_applications')
    .select('*')
    .eq('id', applicationId)
    .eq('status', 'pending')
    .single();

  if (fetchError || !application) {
    throw new Error(
      `Application not found or not pending: ${fetchError?.message ?? 'No application'}`
    );
  }

  const slugBase = slugify(application.organization_name);
  let slug = slugBase;
  let suffix = 0;

  while (true) {
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    suffix++;
    slug = `${slugBase}-${suffix}`;
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: application.organization_name,
      slug,
      description: application.organization_description,
      website: application.website,
      instagram: application.instagram,
      linkedin: application.linkedin,
      country: application.country,
      city: application.city,
      type: application.organization_type,
      is_active: true,
      contact_email: application.email,
      contact_phone: application.phone,
    })
    .select()
    .single();

  if (orgError || !org) {
    throw new Error(`Failed to create organization: ${orgError?.message ?? 'Unknown error'}`);
  }

  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: org.id,
    user_id: application.user_id,
    role: 'owner' as OrgRole,
  });

  if (memberError) {
    await supabase.from('organizations').delete().eq('id', org.id);
    throw new Error(`Failed to add organization member: ${memberError.message}`);
  }

  const { error: appUpdateError } = await supabase
    .from('organizer_applications')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (appUpdateError) {
    await supabase.from('organization_members').delete().eq('organization_id', org.id).eq('user_id', application.user_id);
    await supabase.from('organizations').delete().eq('id', org.id);
    throw new Error(`Failed to update application: ${appUpdateError.message}`);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      platform_role: 'organizer',
      updated_at: new Date().toISOString(),
    })
    .eq('id', application.user_id);

  if (profileError) {
    await supabase.from('organization_members').delete().eq('organization_id', org.id).eq('user_id', application.user_id);
    await supabase.from('organizations').delete().eq('id', org.id);
    await supabase
      .from('organizer_applications')
      .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
      .eq('id', applicationId);
    throw new Error(`Failed to update user profile: ${profileError.message}`);
  }

  return { organizationId: org.id };
}

export async function getUserApplication(
  userId: string
): Promise<OrganizerApplicationWithProfile | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('organizer_applications')
    .select('*, profile:user_id(id, full_name, email, phone, avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch user application: ${error.message}`);
  return data as OrganizerApplicationWithProfile | null;
}

/**
 * W5 (4.2b): rejection cooldown. One rejection = 10 minutes before the next
 * attempt; two or more = 24 hours after the most recent rejection.
 */
export async function getRejectionCooldown(userId: string): Promise<{ blockedUntil: Date | null }> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('organizer_applications')
    .select('status, reviewed_at')
    .eq('user_id', userId)
    .eq('status', 'rejected')
    .order('reviewed_at', { ascending: false });
  const rejections = (data ?? []).filter((r) => r.reviewed_at);
  if (rejections.length === 0) return { blockedUntil: null };
  const last = new Date(rejections[0].reviewed_at as string).getTime();
  const cooldownMs = rejections.length >= 2 ? 24 * 60 * 60 * 1000 : 10 * 60 * 1000;
  return { blockedUntil: new Date(last + cooldownMs) };
}

/**
 * W5 (4.2c): "request more info" resubmission — updates the SAME application
 * (preserving the admin's notes/history) and puts it back in the pending queue.
 */
export async function resubmitApplication(
  userId: string,
  data: SubmitApplicationData
): Promise<OrganizerApplication> {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from('organizer_applications')
    .select('id, status')
    .eq('user_id', userId)
    .eq('status', 'more_info_requested')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!existing) throw new Error('No application awaiting more information');

  const { data: updated, error } = await supabase
    .from('organizer_applications')
    .update({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone ?? null,
      role_title: data.role_title ?? null,
      organization_name: data.organization_name,
      organization_type: data.organization_type ?? null,
      website: data.website ?? null,
      instagram: data.instagram ?? null,
      linkedin: data.linkedin ?? null,
      country: data.country ?? null,
      city: data.city ?? null,
      organization_description: data.organization_description ?? null,
      event_categories: data.event_categories ?? null,
      expected_events_per_month: data.expected_events_per_month ?? null,
      expected_avg_attendees: data.expected_avg_attendees ?? null,
      terms_accepted: data.terms_accepted,
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single();
  if (error || !updated) throw new Error(`Failed to resubmit application: ${error?.message}`);
  return updated as OrganizerApplication;
}
