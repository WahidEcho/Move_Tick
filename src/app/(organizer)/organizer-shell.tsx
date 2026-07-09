'use client';

import { usePathname } from 'next/navigation';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { SlimFooter } from '@/components/layout/slim-footer';
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  Settings,
} from 'lucide-react';
import type { NavItem } from '@/types/ui.types';
import type { Profile } from '@/types/database.types';
import type { Organization } from '@/types/database.types';

const organizerNavItems: NavItem[] = [
  { title: 'Overview', href: '/organizer/overview', icon: LayoutDashboard },
  { title: 'Events', href: '/organizer/events', icon: Calendar },
  { title: 'Settlements', href: '/organizer/settlements', icon: Wallet },
  { title: 'Settings', href: '/organizer/settings', icon: Settings },
];

interface OrganizerShellProps {
  profile: Profile;
  org: Organization;
  children: React.ReactNode;
}

export function OrganizerShell({ profile, org, children }: OrganizerShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <DashboardSidebar
        items={organizerNavItems}
        currentPath={pathname ?? '/organizer'}
        organizationName={org.name}
        user={profile}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          title="Organizer Dashboard"
          description={org.name}
        />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
        <SlimFooter />
      </div>
    </div>
  );
}
