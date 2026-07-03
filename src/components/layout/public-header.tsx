'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/hooks/use-auth';
import { CalendarDays, LogOut, LayoutDashboard, Menu, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PublicHeader() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Approved organizers already have events to manage — send them straight
  // to their dashboard instead of the apply-to-become-an-organizer form.
  const isOrganizer = user?.platform_role === 'organizer';
  const navLinks = [
    { href: '/events', label: 'Explore Events', icon: CalendarDays },
    isOrganizer
      ? { href: '/organizer/overview', label: 'Manage Events' }
      : { href: '/apply-organizer', label: 'Host Your Event' },
  ];

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2 font-display text-lg font-bold tracking-tight text-foreground transition-colors hover:text-foreground/90"
        >
          <span className="inline-block size-2 rounded-full bg-brand-green transition-transform group-hover:scale-125" />
          Move-Tick
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-1.5 text-sm font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {Icon && <Icon className="size-4" />}
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-full p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="size-8">
                  <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name ?? user.email} />
                  <AvatarFallback className="text-xs">
                    {getInitials(user.full_name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Account menu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Hard navigation: router.push() from inside a dropdown item
                    intermittently left users stuck on the same page (same
                    class of bug fixed on login/register — see git history). */}
                <DropdownMenuItem
                  onSelect={() =>
                    window.location.assign(isOrganizer ? '/organizer/overview' : '/dashboard')
                  }
                >
                  <LayoutDashboard className="size-4 shrink-0" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => signOut()}>
                  <LogOut className="size-4 shrink-0" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: 'ghost' })}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className={buttonVariants({ variant: 'default' })}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <XIcon className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </nav>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-border/40 bg-background md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {Icon && <Icon className="size-4" />}
                  {link.label}
                </Link>
              );
            })}
            <div className="my-2 h-px bg-border" />
            {user ? (
              <>
                <Link
                  href={isOrganizer ? '/organizer/overview' : '/dashboard'}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className={buttonVariants({
                    variant: 'ghost',
                    className: 'justify-start',
                  })}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className={buttonVariants({
                    variant: 'default',
                    className: 'justify-start',
                  })}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
