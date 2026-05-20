import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TicketWithJoins } from '@/services/tickets.service';
import { QrCode, Calendar, MapPin, Ticket } from 'lucide-react';
import { format } from 'date-fns';

interface TicketsListProps {
  tickets: TicketWithJoins[];
}

export function TicketsList({ tickets }: TicketsListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tickets.map((ticket) => {
        const event = ticket.event;
        const ticketType = ticket.ticket_type;
        if (!event) return null;

        return (
          <Card key={ticket.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base line-clamp-2">{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4 shrink-0" />
                <span>{format(new Date(event.start_date), 'EEE, MMM d · h:mm a')}</span>
              </div>
              {(event.venue || event.city) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4 shrink-0" />
                  <span className="line-clamp-1">
                    {[event.venue, event.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {ticketType && (
                <div className="flex items-center gap-2 text-sm">
                  <Ticket className="size-4 shrink-0 text-muted-foreground" />
                  <span>{ticketType.name}</span>
                </div>
              )}
              {ticket.qr_code && (
                <div className="flex justify-center rounded-lg border border-border bg-muted/30 p-4">
                  <img
                    src={ticket.qr_code}
                    alt="Ticket QR code"
                    className="size-24 object-contain"
                  />
                </div>
              )}
              <div className="flex items-center justify-between gap-2 pt-2">
                <Badge variant={ticket.is_active ? 'default' : 'secondary'}>
                  {ticket.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/tickets/${ticket.id}`}>View</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/events/${event.slug}`}>Event</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
