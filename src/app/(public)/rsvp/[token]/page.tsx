import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { createServiceClient } from '@/lib/supabase-server';
import { getAppUrl } from '@/lib/app-url';
import { walletAvailability } from '@/lib/wallet/config';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { RsvpActions } from './rsvp-actions-client';

/**
 * Public RSVP page — reached from the invitation email. The rsvp_token IS the
 * authorization (same trust as the QR PDF in the same email), so no login is
 * required. Shows the event, the guest's ticket QR, wallet buttons, and
 * accept/decline.
 */
export default async function RsvpPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/i.test(token)) notFound();

  const supabase = createServiceClient();
  const { data: invitation } = await supabase
    .from('event_invitations')
    .select(
      `id, status, invitee_name, invitee_email,
       event:events(id, title, slug, start_date, end_date, venue, city, cover_image_url),
       organization:organizations(name),
       ticket_type:ticket_types(name)`
    )
    .eq('rsvp_token', token)
    .maybeSingle();

  if (!invitation) notFound();

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, qr_code, qr_token, is_active')
    .eq('invitation_id', invitation.id)
    .maybeSingle();

  const event = invitation.event as unknown as {
    id: string; title: string; slug: string; start_date: string;
    end_date: string | null; venue: string | null; city: string | null;
    cover_image_url: string | null;
  } | null;
  const orgName = (invitation.organization as { name?: string } | null)?.name;
  const ticketTypeName =
    (invitation.ticket_type as { name?: string } | null)?.name ?? 'Invitation';

  const status = invitation.status as string;
  const accepted = status === 'accepted' || status === 'checked_in';
  const declined = status === 'declined';

  const wallet = walletAvailability();
  const walletToken = ticket?.qr_token ? `?t=${ticket.qr_token}` : '';
  const appleUrl =
    wallet.apple && ticket ? `${getAppUrl()}/api/tickets/${ticket.id}/apple-pass${walletToken}` : null;
  const googleUrl =
    wallet.google && ticket ? `${getAppUrl()}/api/tickets/${ticket.id}/google-pass${walletToken}` : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          {orgName ? `${orgName} invited you` : "You're invited"}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{event?.title}</h1>
        <div className="mt-4 flex flex-col items-center gap-2 text-sm text-muted-foreground">
          {event?.start_date && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" />
              {format(new Date(event.start_date), "EEE, MMM d, yyyy · h:mm a")}
            </span>
          )}
          {(event?.venue || event?.city) && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" />
              {[event?.venue, event?.city].filter(Boolean).join(', ')}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Ticket className="size-4" />
            {ticketTypeName} — complimentary
          </span>
        </div>
        <div className="mt-4">
          {accepted && <Badge>You&apos;re going 🎉</Badge>}
          {declined && <Badge variant="secondary">You declined</Badge>}
          {!accepted && !declined && (
            <Badge variant="outline">Awaiting your response</Badge>
          )}
        </div>
      </div>

      <Card className="mb-8">
        <CardContent className="space-y-6 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Hi {invitation.invitee_name || invitation.invitee_email} — let{' '}
            {orgName ?? 'the host'} know if you can make it:
          </p>
          <RsvpActions token={token} status={status} />
        </CardContent>
      </Card>

      {!declined && ticket?.qr_code && (
        <>
          <div
            className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[28px] px-6 pb-8 pt-9 text-white shadow-xl"
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
                <p className="mt-1 text-xl font-bold leading-tight">{event?.title}</p>
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
                  <p className="mt-1 font-semibold">{ticketTypeName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A99BFF]">Attendee</p>
                  <p className="mt-1 font-semibold">{invitation.invitee_name || 'Guest'}</p>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <div className="rounded-2xl bg-white p-4 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ticket.qr_code} alt="Your ticket QR code" className="size-44 object-contain" />
                  <p className="mt-2 text-xs font-semibold text-foreground">{ticketTypeName}</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Show this QR at the entrance — it also came attached to your email as a PDF.
          </p>
          {(appleUrl || googleUrl) && (
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {appleUrl && (
                <a
                  href={appleUrl}
                  className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
                >
                   Add to Apple Wallet
                </a>
              )}
              {googleUrl && (
                <a
                  href={googleUrl}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold"
                >
                  Add to Google Wallet
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
