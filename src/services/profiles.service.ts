import { createServiceClient } from '@/lib/supabase-server';
import type { Profile, UserRole } from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';

export interface GetProfilesFilters {
  search?: string;
  platform_role?: UserRole;
  page?: number;
  page_size?: number;
}

export async function getProfilesForAdmin(
  filters: GetProfilesFilters = {}
): Promise<PaginatedResult<Profile>> {
  const supabase = createServiceClient();
  const { search, platform_role, page = 1, page_size = 20 } = filters;

  let query = supabase.from('profiles').select('*', { count: 'exact' });

  if (platform_role) {
    query = query.eq('platform_role', platform_role);
  }

  if (search && search.trim()) {
    query = query.or(
      `full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`
    );
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch profiles: ${error.message}`);

  const total = count ?? 0;
  return {
    data: (data ?? []) as Profile[],
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}
