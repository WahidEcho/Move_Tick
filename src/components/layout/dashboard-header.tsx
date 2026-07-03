'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/hooks/use-auth';
import { Menu, LayoutDashboard, LogOut, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/ui.types';
import type { Profile } from '@/types/database.types';

interface DashboardHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  onMobileMenuToggle?: () => void;
}

function getInitials(name: string | null, email: string): string {
  if (name?.trim()) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

export function DashboardHeader({
  title,
  description,
  actions,
  breadcrumbs,
  onMobileMenuToggle,
}: DashboardHeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={onMobileMenuToggle}
            aria-label="Toggle menu"
          >
            <Menu className="size-5" />
          </Button>

          <div className="min-w-0 flex-1">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="mb-1 flex items-center gap-1 text-sm text-muted-foreground">
                {breadcrumbs.map((item, index) => (
                  <span key={index} className="flex items-center gap-1">
                    {index > 0 && (
                      <ChevronRight className="size-3.5 shrink-0" />
                    )}
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            <h1 className="truncate text-lg font-semibold text-foreground">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="rounded-full" />}
            >
              <Avatar size="sm" className="size-8">
                <AvatarImage
                  src={user?.avatar_url ?? undefined}
                  alt={user?.full_name ?? user?.email ?? 'User'}
                />
                <AvatarFallback className="text-xs">
                  {user ? getInitials(user.full_name, user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">Account menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* onClick, not onSelect: @base-ui/react's MenuItem has no
                  onSelect prop — it silently no-ops, which is why this menu
                  didn't navigate/sign out despite closing on click. */}
              <DropdownMenuItem onClick={() => window.location.assign('/dashboard')}>
                <LayoutDashboard className="size-4 shrink-0" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
                <LogOut className="size-4 shrink-0" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
