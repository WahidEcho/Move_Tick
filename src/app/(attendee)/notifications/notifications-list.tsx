'use client';

import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { cn } from '@/lib/utils';
import { markNotificationRead, markAllNotificationsRead } from '@/components/notifications/actions';
import type { AppNotification } from '@/types/database.types';

export function NotificationsList({
  initialNotifications,
}: {
  initialNotifications: AppNotification[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleItemClick = async (n: AppNotification) => {
    if (n.is_read) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    await markNotificationRead(n.id);
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    await markAllNotificationsRead();
    setMarkingAll(false);
  };

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications yet"
        description="Updates about your applications, organizations, and events will show up here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={markingAll}>
            <CheckCheck className="size-4" />
            Mark all as read
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((n) => (
          <Card
            key={n.id}
            className={cn(
              'cursor-pointer transition-colors',
              !n.is_read && 'border-brand-purple/30 bg-primary/5'
            )}
            onClick={() => handleItemClick(n)}
          >
            <CardContent className="flex items-start gap-3 py-4">
              {!n.is_read && (
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-purple" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-2 text-xs text-muted-foreground/70">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
