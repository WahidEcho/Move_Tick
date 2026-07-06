'use server';

import { getUser } from '@/lib/auth';
import {
  getUserNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from '@/services/notifications.service';
import type { AppNotification } from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';

export async function getMyNotifications(page = 1): Promise<PaginatedResult<AppNotification> | null> {
  const user = await getUser();
  if (!user) return null;
  return getUserNotifications(user.id, { page, page_size: 20 });
}

export async function getMyUnreadCount(): Promise<number> {
  const user = await getUser();
  if (!user) return 0;
  return getUnreadCount(user.id);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  await markRead(notificationId, user.id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  await markAllRead(user.id);
}
