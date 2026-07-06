import { createServiceClient } from '@/lib/supabase-server';
import type { AppNotification, NotificationType } from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';

export interface CreateNotificationData {
  userId: string;
  organizationId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

/**
 * Writes an in-app notification. Never throws — notifications are a
 * side-effect of some other action and must not block it on failure.
 */
export async function createNotification(data: CreateNotificationData): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from('notifications').insert({
    user_id: data.userId,
    organization_id: data.organizationId ?? null,
    notification_type: data.type,
    title: data.title,
    message: data.message,
    related_entity_type: data.relatedEntityType ?? null,
    related_entity_id: data.relatedEntityId ?? null,
  });
  if (error) {
    console.error(`[notifications] failed to create notification for ${data.userId}:`, error.message);
  }
}

export async function getUserNotifications(
  userId: string,
  opts: { page?: number; page_size?: number } = {}
): Promise<PaginatedResult<AppNotification>> {
  const { page = 1, page_size = 20 } = opts;
  const supabase = createServiceClient();

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  const { data, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to fetch notifications: ${error.message}`);

  const total = count ?? 0;
  return {
    data: (data ?? []) as AppNotification[],
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw new Error(`Failed to count unread notifications: ${error.message}`);
  return count ?? 0;
}

export async function markRead(notificationId: string, userId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to mark notification read: ${error.message}`);
}

export async function markAllRead(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw new Error(`Failed to mark all notifications read: ${error.message}`);
}
