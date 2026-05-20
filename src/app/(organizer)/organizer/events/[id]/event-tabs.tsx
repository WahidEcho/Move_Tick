'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Mail,
  Users,
  Ticket,
  LayoutGrid,
  Gift,
  UsersRound,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TAB_ITEMS = [
  { value: 'overview', label: 'Overview', href: '', icon: LayoutDashboard },
  { value: 'invitations', label: 'Invitations', href: 'invitations', icon: Mail },
  { value: 'attendees', label: 'Attendees', href: 'attendees', icon: Users },
  { value: 'tickets', label: 'Tickets', href: 'tickets', icon: Ticket },
  { value: 'spaces', label: 'Spaces', href: 'spaces', icon: LayoutGrid },
  { value: 'redeems', label: 'Redeems', href: 'redeems', icon: Gift },
  { value: 'team', label: 'Team', href: 'team', icon: UsersRound },
  { value: 'analytics', label: 'Analytics', href: 'analytics', icon: BarChart3 },
  { value: 'settings', label: 'Settings', href: 'settings', icon: Settings },
] as const;

interface EventTabsProps {
  eventId: string;
}

export function EventTabs({ eventId }: EventTabsProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 overflow-x-auto pb-0">
      {TAB_ITEMS.map((tab) => {
        const Icon = tab.icon;
        const href = tab.href
          ? `/organizer/events/${eventId}/${tab.href}`
          : `/organizer/events/${eventId}`;
        const isActive =
          href === pathname || (tab.href && pathname.startsWith(href + '/'));

        return (
          <Link
            key={tab.value}
            href={href}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="size-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
