import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { getUserTickets } from '@/services/tickets.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/layout/empty-state';
import { QrCode, Calendar, MapPin, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { TicketsList } from './tickets-list';

export default async function TicketsPage() {
  const profile = await requireAuth();
  const tickets = await getUserTickets(profile.id);

  const now = new Date().toISOString();
  const upcomingTickets = tickets.filter(
    (t) => t.event && new Date(t.event.end_date) >= new Date(now)
  );
  const pastTickets = tickets.filter(
    (t) => t.event && new Date(t.event.end_date) < new Date(now)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          My Tickets
        </h1>
        <p className="mt-1 text-muted-foreground">
          View and manage your event tickets
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingTickets.length})
          </TabsTrigger>
          <TabsTrigger value="past">Past ({pastTickets.length})</TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}
