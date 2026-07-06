import { createServiceClient } from '@/lib/supabase-server';
import type {
  Organization,
  OrganizationMember,
  OrganizationStatus,
  OrgRole,
} from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';

export type OrganizationMemberWithProfile = OrganizationMember & {
  profile?: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
};

export type OrganizationWithRole = Organization & { role: OrgRole };

export interface GetOrganizationsFilters {
  search?: string;
  is_active?: boolean;
  status?: OrganizationStatus;
  page?: number;
  page_size?: number;
}

export interface UpdateOrganizationData {
  name?: string;
  slug?: string;
  description?: string | null;
  logo_url?: string | null;
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  country?: string | null;
  city?: string | null;
  type?: string | null;
  is_active?: boolean;
  status?: OrganizationStatus;
  contact_email?: string | null;
  contact_phone?: string | null;
  max_events?: number | null;
  max_published_events?: number | null;
  can_create_paid?: boolean;
  requires_publish_approval?: boolean;
  commission_percentage?: number | null;
  fixed_fee_egp?: number | null;
  suspended_reason?: string | null;
  hide_events_on_suspend?: boolean;
  archived_at?: string | null;
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch organization: ${error.message}`);
  return data as Organization | null;
}

export async function getOrganizationBySlug(
  slug: string
): Promise<Organization | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch organization: ${error.message}`);
  return data as Organization | null;
}

export type OrganizationWithCounts = Organization & {
  members_count: number;
  events_count: number;
};

export type GetOrganizationsForAdminFilters = GetOrganizationsFilters;

export async function getOrganizations(
  filters: GetOrganizationsFilters = {}
): Promise<PaginatedResult<Organization>> {
  const supabase = createServiceClient();
  const { search, is_active, status, page = 1, page_size = 20 } = filters;

  let query = supabase.from('organizations').select('*', { count: 'exact' });

  if (is_active !== undefined) {
    query = query.eq('is_active', is_active);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (search && search.trim()) {
    query = query.or(
      `name.ilike.%${search.trim()}%,slug.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%`
    );
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.order('name', { ascending: true }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch organizations: ${error.message}`);

  const total = count ?? 0;
  return {
    data: (data ?? []) as Organization[],
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}

export async function getOrganizationsForAdmin(
  filters: GetOrganizationsForAdminFilters = {}
): Promise<PaginatedResult<OrganizationWithCounts>> {
  const result = await getOrganizations(filters);
  const supabase = createServiceClient();
  const orgs = result.data;

  const counts = await Promise.all(
    orgs.map(async (org) => {
      const [membersRes, eventsRes] = await Promise.all([
        supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', org.id),
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', org.id),
      ]);
      return {
        members_count: membersRes.count ?? 0,
        events_count: eventsRes.count ?? 0,
      };
    })
  );

  const data: OrganizationWithCounts[] = orgs.map((org, i) => ({
    ...org,
    members_count: counts[i].members_count,
    events_count: counts[i].events_count,
  }));

  return { ...result, data };
}

export async function updateOrganization(
  id: string,
  data: UpdateOrganizationData
): Promise<Organization> {
  const supabase = createServiceClient();

  const updates = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  const { data: org, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update organization: ${error.message}`);
  return org as Organization;
}

export async function getOrganizationMembers(
  orgId: string
): Promise<OrganizationMemberWithProfile[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('*, profile:profiles(id, full_name, email, avatar_url)')
    .eq('organization_id', orgId)
    .order('role', { ascending: true });

  if (error) throw new Error(`Failed to fetch organization members: ${error.message}`);
  return (data ?? []) as OrganizationMemberWithProfile[];
}

export async function addOrganizationMember(
  orgId: string,
  userId: string,
  role: OrgRole
): Promise<OrganizationMember> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: userId,
      role,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add organization member: ${error.message}`);
  return data as OrganizationMember;
}

export async function updateMemberRole(
  memberId: string,
  role: OrgRole
): Promise<OrganizationMember> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('organization_members')
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update member role: ${error.message}`);
  return data as OrganizationMember;
}

export async function removeMember(memberId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId);

  if (error) throw new Error(`Failed to remove member: ${error.message}`);
}

export async function getUserOrganizations(
  userId: string
): Promise<OrganizationWithRole[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organization:organizations(*)')
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to fetch user organizations: ${error.message}`);

  return ((data ?? []) as unknown as Array<{ role: OrgRole; organization: Organization }>).map(
    ({ role, organization }) => ({ ...organization, role })
  );
}
