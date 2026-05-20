'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types/ui.types';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import type { Profile } from '@/types/database.types';

interface DashboardSidebarProps {
  items: NavItem[];
  currentPath: string;
  organizationName?: string;
  user?: Profile | null;
}

export function DashboardSidebar({
  items,
  currentPath,
  organizationName,
  user,
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const getInitials = (name: string | null, email: string) => {
    if (name?.trim()) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link
          href="/dashboard"
          className={cn(
            'font-semibold text-foreground transition-opacity',
            collapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
          )}
        >
          Move Beyond
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0 lg:flex hidden"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPath === item.href || currentPath.startsWith(`${item.href}/`);

            const linkContent = (
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                {Icon && <Icon className="size-4 shrink-0" />}
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.badge && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );

            return (
              <div key={item.href}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">{item.title}</TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {(organizationName || user) && (
        <>
          <Separator />
          <div
            className={cn(
              'space-y-2 p-4',
              collapsed ? 'flex flex-col items-center' : ''
            )}
          >
            {organizationName && !collapsed && (
              <p className="truncate text-xs font-medium text-muted-foreground">
                {organizationName}
              </p>
            )}
            {user && (
              <div
                className={cn(
                  'flex items-center gap-2',
                  collapsed ? 'flex-col' : ''
                )}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {getInitials(user.full_name, user.email)}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {user.full_name || 'User'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          }
        />
        <SheetContent side="left" className="w-72 p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden border-r bg-card transition-[width] duration-200 lg:flex lg:flex-col',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
