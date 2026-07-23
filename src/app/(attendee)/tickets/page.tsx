import { requireAuth } from '@/lib/auth';
import { getUserTickets } from '@/services/tickets.service';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/layout/empty-state';
import { Sparkles, Ticket } from 'lucide-react';
import { isToday } from 'date-fns';
import { TicketsList } from './tickets-list';

export default async function TicketsPage() {
  const profile = await requireAuth();
  const tickets = await getUserTickets(profile.id);

  const now = new Date().toISOString();
  const activeTickets = tickets.filter((t) => t.is_active);
  const todayTickets = activeTickets.filter((t) => t.event && isToday(new Date(t.event.start_date)) && new Date(t.event.end_date) >= new Date(now));
  const upcomingTickets = activeTickets.filter((t) => t.event && new Date(t.event.end_date) >= new Date(now) && !isToday(new Date(t.event.start_date)));
  const pastTickets = tickets.filter(
    (t) => t.is_active && t.event && new Date(t.event.end_date) < new Date(now)
  );
  const inactiveTickets = tickets.filter((ticket) => !ticket.is_active);

  return (
    <div className="-m-4 min-h-[calc(100vh-3.5rem)] bg-background p-4 text-foreground md:-m-6 md:p-8 lg:-m-8 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_80%_20%,rgba(91,59,232,.15),transparent_30rem),linear-gradient(135deg,var(--card),var(--background))] p-6 dark:border-white/10 dark:bg-[radial-gradient(circle_at_80%_20%,rgba(91,59,232,.28),transparent_30rem),linear-gradient(135deg,#131625,#090a10)] sm:p-9">
        <div aria-hidden className="cinematic-grid absolute inset-0 opacity-40" />
        <div className="relative"><p className="cinematic-kicker flex items-center gap-2"><Sparkles className="size-3.5" /> Your experiences</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          My Tickets
        </h1>
        <p className="mt-2 max-w-lg text-muted-foreground dark:text-white/55">Your next event, directions, entry QR and ticket benefits—all in one place.</p></div>
      </div>

      <Tabs defaultValue={todayTickets.length ? 'today' : 'upcoming'} className="w-full">
        <TabsList className="mb-5 h-auto flex-wrap rounded-2xl border border-border bg-muted/50 p-1.5 dark:border-white/10 dark:bg-white/[.04]">
          <TabsTrigger value="today">Today ({todayTickets.length})</TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingTickets.length})
          </TabsTrigger>
          <TabsTrigger value="past">Past ({pastTickets.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({inactiveTickets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="today">{todayTickets.length ? <TicketsList tickets={todayTickets} /> : <EmptyState icon={Ticket} title="Nothing happening today" description="Your event-day tickets will appear here." />}</TabsContent>

        <TabsContent value="upcoming">
          {upcomingTickets.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No upcoming tickets"
              description="You don't have any upcoming event tickets. Explore events to register."
              action={{ label: 'Explore Events', href: '/events' }}
            />
          ) : (
            <TicketsList tickets={upcomingTickets} />
          )}
        </TabsContent>

        <TabsContent value="past">
          {pastTickets.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No past tickets"
              description="Your past event tickets will appear here."
            />
          ) : (
            <TicketsList tickets={pastTickets} />
          )}
        </TabsContent>
        <TabsContent value="inactive">{inactiveTickets.length ? <TicketsList tickets={inactiveTickets} /> : <EmptyState icon={Ticket} title="No inactive tickets" description="Cancelled and inactive tickets remain available here for your records." />}</TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
