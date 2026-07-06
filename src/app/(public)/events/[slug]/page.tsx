import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getEventBySlug, getEventStats } from '@/services/events.service';
import { getTicketTypes } from '@/services/tickets.service';
import { getProfile, getOrgRole, getEventStaffRole } from '@/lib/auth';
import { getExpiryThresholdISO, isExpired } from '@/lib/event-visibility';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  MapPin,
  Users,
  Building2,
  Ticket,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { RegisterDialog } from './register-dialog';
import { isOptimizableImage } from '../event-card';
import { formatEgp } from '@/lib/helpers';

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event || event.is_cancelled) {
    notFound();
  }

  // Auto-expiry + manual hide/archive: hidden from the public, but the
  // owning organization, its assigned staff, or a platform admin can still
  // open the page directly (they just see an status badge instead).
  const threshold = await getExpiryThresholdISO();
  const hasEnded = isExpired(event, threshold);
  const isHidden = event.is_hidden || Boolean(event.archived_at);
  let statusBadge: string | null = null;

  if (hasEnded || isHidden) {
    const profile = await getProfile();
    let hasAccess = false;
    if (profile) {
      if (profile.platform_role === 'admin') {
        hasAccess = true;
      } else {
        const [orgRole, staffRole] = await Promise.all([
          getOrgRole(profile.id, event.organization_id),
          getEventStaffRole(profile.id, event.id),
        ]);
        hasAccess = Boolean(orgRole) || Boolean(staffRole);
      }
    }
    if (!hasAccess) notFound();

    statusBadge = event.archived_at ? 'Archived' : event.is_hidden ? 'Hidden' : 'Ended';
  }

  const [ticketTypes, stats] = await Promise.all([
    getTicketTypes(event.id),
    getEventStats(event.id),
  ]);

  const settings = event.event_settings;
  const capacity = event.capacity ?? null;
  const isFull = capacity !== null && stats.confirmed >= capacity;
  const showRemainingSeats = settings?.show_remaining_seats ?? true;
  const showRegisteredCount = settings?.show_registered_count ?? true;
  const isInviteOnly = event.visibility === 'invite_only';
  const approvalRequired = settings?.approval_required ?? false;
  const enableWaitlist = settings?.enable_waitlist ?? false;

  const publicTicketTypes = ticketTypes.filter((tt) => tt.visibility === 'public');

  return (
    <div className="min-h-screen">
      {/* Cover */}
      <div className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-primary/30 via-primary/20 to-muted sm:h-80">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            priority
            sizes="100vw"
            unoptimized={!isOptimizableImage(event.cover_image_url)}
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="-mt-24 relative z-10 space-y-8 sm:flex sm:gap-8 sm:space-y-0">
          {/* Main content */}
          <div className="flex-1 space-y-6">
            {/* Header */}
            <div>
              {(event.category || statusBadge) && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {event.category && <Badge variant="secondary">{event.category}</Badge>}
                  {statusBadge && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                      {statusBadge}
                    </Badge>
                  )}
                </div>
              )}
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {event.title}
              </h1>
              {event.organization && (
                <Link
                  href={`/organizations/${event.organization.slug}`}
                  className="mt-2 flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Building2 className="size-4" />
                  {event.organization.name}
                </Link>
              )}
            </div>

            {/* Date & location */}
            <div className="flex flex-wrap gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="size-5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    {format(new Date(event.start_date), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm">
                    {format(new Date(event.start_date), 'h:mm a')} –{' '}
                    {format(new Date(event.end_date), 'h:mm a')}
                  </p>
                </div>
              </div>
              {(event.venue || event.location || event.city) && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-5 shrink-0" />
                  <div>
                    {event.venue && (
                      <p className="font-medium text-foreground">{event.venue}</p>
                    )}
                    <p className="text-sm">
                      {[event.location, event.city, event.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Invite only / approval messaging */}
            {isInviteOnly && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <Shield className="size-5 shrink-0" />
                  This event is invite-only. You need an invitation to register.
                </p>
              </div>
            )}
            {!isInviteOnly && approvalRequired && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <p className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Shield className="size-5 shrink-0" />
                  Registration requires organizer approval. You will be notified once your
                  registration is confirmed.
                </p>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <h2 className="text-xl font-semibold">About this event</h2>
                <div className="whitespace-pre-wrap text-muted-foreground">
                  {event.description.split('\n').map((p, i) => (
                    <p key={i} className="mb-2 last:mb-0">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Social proof */}
            {(showRegisteredCount || (showRemainingSeats && capacity)) && (
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {showRegisteredCount && (
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4" />
                    {stats.registrations} registered
                  </span>
                )}
                {showRemainingSeats && capacity && (
                  <span
                    className={`flex items-center gap-1.5 ${
                      isFull ? 'text-destructive font-medium' : ''
                    }`}
                  >
                    <Ticket className="size-4" />
                    {isFull ? 'Event full' : `${Math.max(0, capacity - stats.confirmed)} spots left`}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Ticket types & CTA */}
          <div className="w-full sm:w-80 shrink-0">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="size-5" />
                  Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {publicTicketTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tickets available.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {publicTicketTypes.map((tt) => {
                      const available =
                        tt.capacity == null
                          ? Infinity
                          : Math.max(0, tt.capacity - (tt.sold_count ?? 0));
                      const soldOut = tt.capacity != null && available <= 0;
                      return (
                        <div
                          key={tt.id}
                          className="flex flex-col gap-2 rounded-lg border border-border p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{tt.name}</p>
                              {tt.description && (
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                  {tt.description}
                                </p>
                              )}
                            </div>
                            <span className="shrink-0 font-semibold">
                              {formatEgp(tt.price)}
                            </span>
                          </div>
                          {tt.capacity != null && (
                            <p className="text-xs text-muted-foreground">
                              {soldOut ? 'Sold out' : `${available} available`}
                            </p>
                          )}
                          <RegisterDialog
                            event={event}
                            ticketType={tt}
                            disabled={isInviteOnly || soldOut}
                            approvalRequired={approvalRequired}
                            isFull={isFull}
                            enableWaitlist={enableWaitlist}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
