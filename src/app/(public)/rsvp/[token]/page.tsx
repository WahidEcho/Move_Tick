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
        <Card>
          <CardContent className="flex flex-col items-center p-8">
            <div className="rounded-xl bg-white p-4">
              {/* QR is a data-URL PNG generated at issuance */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ticket.qr_code} alt="Your ticket QR code" className="size-48 object-contain" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Show this QR at the entrance — it also came attached to your email as a PDF.
            </p>
            {(appleUrl || googleUrl) && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
