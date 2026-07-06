import { createServiceClient } from '@/lib/supabase-server';
import type { Json } from '@/types/database.types';

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
