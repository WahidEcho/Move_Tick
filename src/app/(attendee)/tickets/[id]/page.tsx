import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { getTicket } from '@/services/tickets.service';
import { getMovementsByTicketId } from '@/services/eventMovements.service';
import { getTicketRedeemBalances } from '@/services/redeems.service';
import { walletAvailability } from '@/lib/wallet/config';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  QrCode,
  Calendar,
  MapPin,
  Ticket,
  ArrowLeft,
  Clock,
  Gift,
} from 'lucide-react';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

/** QR/ticket validity ends 24h after the event end (evaluated at request time). */
function isTicketExpired(endDate: string | null | undefined): boolean {
  if (!endDate) return false;
  return Date.now() > new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const profile = await requireAuth();
  const { id } = await params;

  const ticket = await getTicket(id);
  if (!ticket || ticket.user_id !== profile.id) notFound();

  const [movements, redeemBalances] = await Promise.all([
    getMovementsByTicketId(id),
    getTicketRedeemBalances(id),
  ]);

  const event = ticket.event;
  const ticketType = ticket.ticket_type;
  const eventSlug = event?.slug;
  const wallet = walletAvailability();

  // QR/ticket validity ends 24h after the event end.
  const isExpired = isTicketExpired(event?.end_date);
  const isUsable = ticket.is_active && !isExpired;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to tickets
      </Link>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {event?.title ?? 'Event'}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {ticketType?.name ?? 'Ticket'}
            </p>
          </div>
          <Badge variant={isUsable ? 'default' : 'secondary'}>
            {!ticket.is_active ? 'Inactive' : isExpired ? 'Expired' : 'Active'}
          </Badge>
        </div>

        {/* Large QR code */}
        {ticket.qr_code && (
          <Card className="overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <div className="rounded-xl bg-white p-4">
                <img
                  src={ticket.qr_code}
                  alt="Ticket QR code"
                  className="size-48 object-contain"
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Show this QR code at the event entrance
              </p>
            </CardContent>
          </Card>
        )}

        {/* Add to mobile wallet (shown only when configured) */}
        {ticket.qr_token && isUsable && (wallet.apple || wallet.google) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {wallet.apple && (
              <a
                href={`/api/tickets/${ticket.id}/apple-pass`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-medium text-white hover:bg-black/85"
              >
                 Add to Apple Wallet
              </a>
            )}
            {wallet.google && (
              <a
                href={`/api/tickets/${ticket.id}/google-pass`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Add to Google Wallet
              </a>
            )}
          </div>
        )}

        {/* Event details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="size-4" />
              Event details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {event?.start_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  {format(new Date(event.start_date), 'EEE, MMM d, yyyy · h:mm a')}
                  {event?.end_date &&
                    ` – ${format(new Date(event.end_date), 'h:mm a')}`}
                </span>
              </div>
            )}
            {(event?.venue || event?.city) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  {[event?.venue, event?.city, event?.country]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
            {event?.location && (
              <p className="text-sm text-muted-foreground">{event.location}</p>
            )}
          </CardContent>
        </Card>

        {/* Ticket type info */}
        {ticketType && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="size-4" />
                Ticket type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{ticketType.name}</p>
              {ticketType.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {ticketType.description}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Movement history */}
        {movements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4" />
                Movement history
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Check-in and check-out timestamps
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {movements.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="font-medium capitalize">
                      {m.movement_type.replace('_', ' ')}
                    </span>
                    <span className="text-muted-foreground">
                      {format(new Date(m.scanned_at), 'MMM d, h:mm a')}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Redeem balances */}
        {redeemBalances.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gift className="size-4" />
                Redeem balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {redeemBalances.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {b.redeem_item?.name ?? 'Item'}
                    </span>
                    <span className="text-muted-foreground">
                      {b.remaining} of {b.total_allowed} remaining
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* View Event link */}
        {eventSlug && (
          <Link
            href={`/events/${eventSlug}`}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 sm:w-auto"
          >
            View Event
          </Link>
        )}
      </div>
    </div>
  );
}
