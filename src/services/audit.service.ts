import { createServiceClient } from '@/lib/supabase-server';
import type { AdminAuditLogEntry, Json } from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';

export interface LogAdminActionParams {
  actorId: string | null;
  /** Dot-namespaced verb, e.g. "organization.approve", "event.hide". */
  action: string;
  targetType: string;
  targetId?: string | null;
  previousValue?: Json | null;
  newValue?: Json | null;
  reason?: string | null;
}

/**
 * Appends a row to the admin audit trail. Never throws — the trail is a
 * side-effect of the real action and must not block it on failure. Writes go
 * through the service-role client only; there is no client INSERT policy on
 * admin_audit_log, so this is the sole path that can create entries.
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from('admin_audit_log').insert({
    actor_id: params.actorId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    previous_value: params.previousValue ?? null,
    new_value: params.newValue ?? null,
    reason: params.reason ?? null,
  });
  if (error) {
    console.error(`[audit] failed to log action "${params.action}":`, error.message);
  }
}

export interface GetAuditLogFilters {
  targetType?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function getAuditLog(
  filters: GetAuditLogFilters = {}
): Promise<PaginatedResult<AdminAuditLogEntry>> {
  const supabase = createServiceClient();
  const { targetType, search, page = 1, page_size = 30 } = filters;

  let query = supabase
    .from('admin_audit_log')
    .select('*, actor:profiles(id, full_name, email, avatar_url)', { count: 'exact' });

  if (targetType) query = query.eq('target_type', targetType);
  if (search && search.trim()) {
    query = query.or(`action.ilike.%${search.trim()}%,reason.ilike.%${search.trim()}%`);
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch audit log: ${error.message}`);

  const total = count ?? 0;
  return {
    data: (data ?? []) as AdminAuditLogEntry[],
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}
