'use client';

import { useState } from 'react';
import { Bell, CheckCheck, CalendarDays, CreditCard, Ticket, Users, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow, isToday } from 'date-fns';
import Link from 'next/link';
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

  const destinationFor = (n: AppNotification) => {
    if (!n.related_entity_id) return null;
    if (n.related_entity_type === 'ticket') return `/tickets/${n.related_entity_id}`;
    if (n.related_entity_type === 'event') return '/events';
    if (n.related_entity_type === 'invitation') return '/invitations';
    return null;
  };

  const iconFor = (n: AppNotification) => {
    const value = `${n.notification_type} ${n.related_entity_type ?? ''}`.toLowerCase();
    if (value.includes('payment')) return CreditCard;
    if (value.includes('ticket')) return Ticket;
    if (value.includes('invitation') || value.includes('organization')) return Users;
    return CalendarDays;
  };

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

      <div className="space-y-7">
        {(['Today', 'Earlier'] as const).map((group) => {
          const grouped = notifications.filter((n) => (group === 'Today' ? isToday(new Date(n.created_at)) : !isToday(new Date(n.created_at))));
          if (!grouped.length) return null;
          return <section key={group} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{group}</h2>
            {grouped.map((n) => {
              const Icon = iconFor(n);
              const href = destinationFor(n);
              const content = <CardContent className="flex items-start gap-4 py-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2"><p className="flex-1 text-sm font-semibold text-foreground">{n.title}</p>{!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-green shadow-[0_0_12px_rgba(126,255,0,.65)]" />}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground/70">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
                {href && <ArrowUpRight className="size-4 text-muted-foreground" />}
              </CardContent>;
              return <Card
            key={n.id}
            className={cn(
              'overflow-hidden border-border/70 bg-card/70 transition-all hover:border-primary/30 hover:bg-card',
              !n.is_read && 'border-brand-purple/30 bg-primary/[0.06]'
            )}
            onClick={() => handleItemClick(n)}
          >
            {href ? <Link href={href}>{content}</Link> : content}
          </Card>})}
          </section>;
        })}
      </div>
    </div>
  );
}
