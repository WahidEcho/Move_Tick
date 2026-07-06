'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getMyNotifications, getMyUnreadCount, markNotificationRead } from './actions';
import type { AppNotification } from '@/types/database.types';

const POLL_MS = 60_000;

/** Bell + unread badge + recent-notifications dropdown, shared by every header. Renders nothing for logged-out visitors. */
export function NotificationBell({ userId }: { userId: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      const count = await getMyUnreadCount();
      if (!cancelled) setUnreadCount(count);
    };
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId]);

  if (!userId) return null;

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next) {
      setLoading(true);
      const result = await getMyNotifications(1);
      setNotifications(result?.data ?? []);
      setLoading(false);
    }
  };

  const handleItemClick = async (n: AppNotification) => {
    if (n.is_read) return;
    setNotifications((prev) => prev?.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)) ?? prev);
    setUnreadCount((c) => Math.max(0, c - 1));
    await markNotificationRead(n.id);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold leading-none text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
        </div>
        <DropdownMenuSeparator className="mx-0" />
        {loading ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            You&apos;re all caught up
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto p-1">
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={cn(
                  'flex flex-col items-start gap-0.5 whitespace-normal rounded-md py-2',
                  !n.is_read && 'bg-primary/5'
                )}
              >
                <div className="flex w-full items-center gap-2">
                  {!n.is_read && <span className="size-1.5 shrink-0 rounded-full bg-brand-purple" />}
                  <span className="text-sm font-medium">{n.title}</span>
                </div>
                <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
                <span className="text-[11px] text-muted-foreground/70">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator className="mx-0" />
        <Link
          href="/notifications"
          className="block px-3 py-2.5 text-center text-sm font-medium text-brand-purple hover:underline"
        >
          See all
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
