import Link from 'next/link';
import Image from 'next/image';
import { requireAuth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { getUserTickets } from '@/services/tickets.service';
import { getUserInvitations } from '@/services/invitations.service';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Ticket, Mail, Clock, MapPin, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { isOptimizableImage } from '@/lib/helpers';
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
  const nextRegistration = [...upcomingEvents].sort((a, b) => new Date(a.event!.start_date).getTime() - new Date(b.event!.start_date).getTime())[0];
  const nextEvent = nextRegistration?.event ?? null;
  const nextTicket = nextEvent ? tickets.find((ticket) => ticket.event_id === nextEvent.id && ticket.is_active) : null;

  return (
    <div className="space-y-8">
      <section className="cinematic-noise relative overflow-hidden rounded-3xl border border-border bg-card text-card-foreground dark:border-white/10 dark:bg-[#0a0c13] dark:text-white">
        {nextEvent?.cover_image_url && <Image src={nextEvent.cover_image_url} alt="" fill priority sizes="100vw" unoptimized={!isOptimizableImage(nextEvent.cover_image_url)} className="object-cover opacity-15 dark:opacity-55" />}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/45 dark:from-[#08090d] dark:via-[#08090d]/85 dark:to-transparent" />
        <div className="relative max-w-2xl p-6 sm:p-10">
          <p className="cinematic-kicker flex items-center gap-2"><Sparkles className="size-3.5" /> Your next experience</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{nextEvent?.title ?? `Welcome back, ${profile.full_name?.split(' ')[0] ?? 'there'}`}</h1>
          {nextEvent ? <><p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground dark:text-white/65"><Calendar className="size-4 text-[#8067e8] dark:text-[#a98fff]" />{format(new Date(nextEvent.start_date), 'EEEE, MMMM d · h:mm a')}</p><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground dark:text-white/65"><MapPin className="size-4 text-brand-green" />{[nextEvent.venue, nextEvent.city].filter(Boolean).join(', ') || 'Venue TBA'}</p></> : <p className="mt-3 text-muted-foreground dark:text-white/60">Discover something worth showing up for.</p>}
          <div className="mt-7 flex flex-wrap gap-3">
            {nextTicket && <Button asChild className="bg-brand-green text-brand-black hover:bg-brand-green/90"><Link href={`/tickets/${nextTicket.id}`}><Ticket className="size-4" /> Open ticket</Link></Button>}
            <Button asChild variant="outline" className="border-border bg-background/65 text-foreground hover:bg-muted dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"><Link href={nextEvent ? `/events/${nextEvent.slug}` : '/events'}>{nextEvent ? 'Event details' : 'Explore events'} <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard href="/tickets" icon={Ticket} value={upcomingTickets.length} label="Active tickets" action="Open wallet" />
        <ActionCard href="/invitations" icon={Mail} value={pendingInvitations.length} label="Invitations need you" action="Respond now" />
        <ActionCard href="/events" icon={Calendar} value={upcomingEvents.length} label="Upcoming events" action="Discover more" />
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

function ActionCard({ href, icon: Icon, value, label, action }: { href: string; icon: typeof Ticket; value: number; label: string; action: string }) {
  return <Link href={href} className="group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-1 hover:border-brand-purple/40 hover:shadow-lg"><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-brand-purple/10 text-brand-purple"><Icon className="size-5" /></span><span className="font-display text-2xl font-bold">{value}</span></div><p className="mt-4 font-semibold">{label}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-brand-purple">{action}<ArrowRight className="size-3" /></p></Link>;
}
