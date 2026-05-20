import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { getUserTickets } from '@/services/tickets.service';
import { getUserInvitations } from '@/services/invitations.service';
import { StatCard } from '@/components/layout/stat-card';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Ticket, Mail, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import type { Registration } from '@/types/database.types';
import type { Event } from '@/types/database.types';

type RegistrationWithEvent = Registration & {
  event?: Event | null;
  ticket_type?: { name: string } | null;
};

export default async function AttendeeDashboardPage() {
  const profile = await requireAuth();
  const supabase = createServiceClient();

  const now = new Date().toISOString();

  const [ticketsResult, invitationsResult, registrationsResult] = await Promise.all([
    getUserTickets(profile.id),
    getUserInvitations(profile.id),
    supabase
      .from('registrations')
      .select('*, event:events(*)')
      .eq('user_id', profile.id)
      .in('status', ['confirmed', 'approved'])
      .order('created_at', { ascending: false }),
  ]);

  const tickets = ticketsResult;
  const invitations = invitationsResult;
  const registrations = (registrationsResult.data ?? []) as RegistrationWithEvent[];

  const upcomingEvents = registrations.filter(
    (r) => r.event && new Date(r.event.end_date) >= new Date(now)
  );

  const upcomingTickets = tickets.filter(
    (t) => t.event && new Date(t.event.end_date) >= new Date(now)
  );

  const pendingInvitations = invitations.filter(
    (i) => ['pending', 'sent', 'delivered', 'opened'].includes(i.status)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {profile.full_name ?? 'there'}!
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s an overview of your events and tickets.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Upcoming Events"
          value={upcomingEvents.length}
          description="Events you're registered for"
          icon={Calendar}
        />
        <StatCard
          title="Active Tickets"
          value={upcomingTickets.length}
          description="Tickets for upcoming events"
          icon={Ticket}
        />
        <StatCard
          title="Pending Invitations"
          value={pendingInvitations.length}
          description="Awaiting your response"
          icon={Mail}
        />
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Upcoming Events
        </h2>
        {upcomingEvents.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming events"
            description="Discover events and register to see them here."
            action={{ label: 'Explore Events', href: '/events' }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.slice(0, 6).map((reg) => {
              const event = reg.event;
              if (!event) return null;
              const ticket = tickets.find(
                (t) => t.event_id === event.id && t.user_id === profile.id
              );
              const status = ticket?.is_active ? 'Confirmed' : reg.status;
              return (
                <Card key={reg.id} size="sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-2 text-base">
                      <Link
                        href={`/events/${event.slug}`}
                        className="hover:text-primary"
                      >
                        {event.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="size-4 shrink-0" />
                      {format(new Date(event.start_date), 'EEE, MMM d · h:mm a')}
                    </div>
                    {(event.venue || event.city) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="size-4 shrink-0" />
                        {[event.venue, event.city].filter(Boolean).join(', ')}
                      </div>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {status}
                    </Badge>
                    <Link href={`/events/${event.slug}`}>
                      <Button size="sm" variant="outline" className="mt-2">
                        View Event
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Recent Activity
        </h2>
        {registrations.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No registrations yet"
            description="Your event registrations will appear here."
            action={{ label: 'Explore Events', href: '/events' }}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {registrations.slice(0, 5).map((reg) => {
                  const event = reg.event;
                  if (!event) return null;
                  return (
                    <li key={reg.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Registered {format(new Date(reg.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge variant="outline">{reg.status}</Badge>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
