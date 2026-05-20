import { getTicketTypes } from '@/services/tickets.service';
import { StatCard } from '@/components/layout/stat-card';
import { Ticket } from 'lucide-react';
import { TicketsClient } from './tickets-client';

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const ticketTypes = await getTicketTypes(eventId);

  const totalSold = ticketTypes.reduce((sum, tt) => sum + (tt.sold_count ?? 0), 0);
  const totalCapacity = ticketTypes.reduce((sum, tt) => {
    const cap = tt.capacity;
    return sum + (cap != null ? cap : 0);
  }, 0);
  const availabilityPercent =
    totalCapacity > 0 ? Math.round(((totalCapacity - totalSold) / totalCapacity) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Ticket Types</h2>
        <TicketsClient
          eventId={eventId}
          ticketTypes={ticketTypes}
          mode="button"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Ticket Types"
          value={ticketTypes.length}
          icon={Ticket}
        />
        <StatCard title="Total Sold" value={totalSold} icon={Ticket} />
        <StatCard
          title="Total Capacity"
          value={totalCapacity === 0 ? '∞' : totalCapacity}
          description={totalCapacity > 0 ? `${availabilityPercent}% available` : undefined}
          icon={Ticket}
        />
      </div>

      <TicketsClient
        eventId={eventId}
        ticketTypes={ticketTypes}
        mode="cards"
      />
    </div>
  );
}
