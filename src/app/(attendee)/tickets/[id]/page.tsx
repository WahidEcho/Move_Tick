import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { getTicket } from '@/services/tickets.service';
import { getMovementsByTicketId } from '@/services/eventMovements.service';
import { getTicketRedeemBalances } from '@/services/redeems.service';
import { getRefundStateForPayment } from '@/services/refunds.service';
import { walletAvailability } from '@/lib/wallet/config';
import { RefundRequestButton } from './refund-request-button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
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

  // Paid tickets (linked to an XPay payment) can request a refund until the
  // event has ended; the request is decided by the Move Beyond team.
  let refundProps: { paymentId: string; amountLabel: string; refundState: 'none' | 'pending' | 'approved' | 'rejected' } | null = null;
  if (ticket.payment_id && !isExpired) {
    const supabase = createServiceClient();
    const { data: payment } = await supabase
      .from('payments')
      .select('id, status, amount_total')
      .eq('id', ticket.payment_id)
      .maybeSingle();
    if (payment && (payment.status === 'paid' || payment.status === 'refunded')) {
      const { status: refundState } = await getRefundStateForPayment(payment.id as string, profile.id);
      refundProps = {
        paymentId: payment.id as string,
        amountLabel: `${(Number(payment.amount_total) / 100).toFixed(2)} EGP`,
        refundState: payment.status === 'refunded' && refundState === 'none' ? 'approved' : refundState,
      };
    }
  }

  return (
    <div className="-m-4 min-h-[calc(100vh-3.5rem)] bg-background p-4 text-foreground md:-m-6 md:p-8 lg:-m-8 lg:p-10">
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

        {/* Wallet-style ticket card */}
        {ticket.qr_code && (
          <div
            className="ticket-cutout relative mx-auto w-full max-w-sm overflow-hidden rounded-[28px] border border-white/15 px-6 pb-8 pt-9 text-white shadow-2xl shadow-brand-purple/20"
            style={{
              background: 'linear-gradient(180deg, #120E28 0%, #251A66 55%, #4C33D6 100%)',
              WebkitMask: 'radial-gradient(circle 16px at 50% 0, transparent 97%, #000 100%)',
              mask: 'radial-gradient(circle 16px at 50% 0, transparent 97%, #000 100%)',
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -left-1/4 bottom-8 h-24 w-[150%] -rotate-6 bg-gradient-to-r from-transparent via-white/15 to-transparent blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -left-1/4 bottom-0 h-32 w-[150%] -rotate-6 bg-gradient-to-r from-transparent via-brand-green/10 to-transparent blur-3xl"
            />

            <div className="relative space-y-5">
              <div>
                <p className="font-display text-xl font-bold leading-none">MoveTick</p>
                <p className="mt-1 text-[11px] text-white/65">by Move Beyond</p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A99BFF]">Event</p>
                <p className="mt-1 text-xl font-bold leading-tight">{event?.title ?? 'Event'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A99BFF]">Date</p>
                  <p className="mt-1 font-semibold">
                    {event?.start_date ? format(new Date(event.start_date), 'd MMM yyyy') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A99BFF]">Venue</p>
                  <p className="mt-1 font-semibold">
                    {[event?.venue, event?.city].filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A99BFF]">Ticket</p>
                  <p className="mt-1 font-semibold">{ticketType?.name ?? 'Ticket'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A99BFF]">Attendee</p>
                  <p className="mt-1 font-semibold">{profile.full_name || 'Guest'}</p>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <div className={`rounded-2xl bg-white p-4 text-center ${isUsable ? 'qr-pulse' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ticket.qr_code} alt="Ticket QR code" className="size-44 object-contain" />
                  <p className="mt-2 text-xs font-semibold text-foreground">{ticketType?.name ?? 'Ticket'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <p className="text-center text-sm text-muted-foreground">
          Show this QR code at the event entrance
        </p>

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
        <Card className="border border-border bg-card dark:border-white/10 dark:bg-white/[.04]">
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
          <Card className="border border-border bg-card dark:border-white/10 dark:bg-white/[.04]">
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
          <Card className="border border-border bg-card dark:border-white/10 dark:bg-white/[.04]">
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
          <Card className="border border-border bg-card dark:border-white/10 dark:bg-white/[.04]">
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

        {/* Refund request (paid tickets only) */}
        {refundProps && (
          <RefundRequestButton
            paymentId={refundProps.paymentId}
            amountLabel={refundProps.amountLabel}
            refundState={refundProps.refundState}
          />
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
    </div>
  );
}
