import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { getUserInvitations } from '@/services/invitations.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/layout/empty-state';
import { InvitationActions } from './invitation-actions';
import { Mail, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { InvitationStatus } from '@/types/database.types';
import type { EventInvitationWithTicketType } from '@/services/invitations.service';

function getStatusBadgeVariant(status: InvitationStatus) {
  switch (status) {
    case 'pending':
    case 'sent':
    case 'opened':
    case 'delivered':
      return 'secondary';
    case 'accepted':
    case 'checked_in':
      return 'default';
    case 'declined':
      return 'destructive';
    default:
      return 'outline';
  }
}

function InvitationCard({
  inv,
  showActions,
}: {
  inv: EventInvitationWithTicketType;
  showActions: boolean;
}) {
  const event = inv.event as { slug?: string; title?: string; start_date?: string; venue?: string | null; city?: string | null } | null;
  const eventSlug = event?.slug;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">
              {event?.title ?? 'Event'}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Invited as {inv.invitee_name || inv.invitee_email}
            </p>
          </div>
          <Badge variant={getStatusBadgeVariant(inv.status)}>
            {inv.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {event?.start_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="size-4 shrink-0" />
            <span>{format(new Date(event.start_date), 'EEE, MMM d, yyyy')}</span>
          </div>
        )}
        {(event?.venue || event?.city) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            <span>
              {[event?.venue, event?.city].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Received {format(new Date(inv.created_at), 'MMM d, yyyy')}
        </p>

        {showActions && (
          <div className="pt-2">
            <InvitationActions invitationId={inv.id} />
          </div>
        )}

        {inv.status === 'accepted' && inv.rsvp_token && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              RSVP link
            </p>
            <Link
              href={`/rsvp/${inv.rsvp_token}`}
              className="mt-1 flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              View RSVP details
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        )}

        {inv.status === 'accepted' && eventSlug && (
          <Link
            href={`/events/${eventSlug}`}
            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
          >
            View Event
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default async function InvitationsPage() {
  const profile = await requireAuth();
  const invitations = await getUserInvitations(profile.id);

  const pending = invitations.filter((i) =>
    ['pending', 'sent', 'opened', 'delivered'].includes(i.status)
  );
  const accepted = invitations.filter((i) => i.status === 'accepted');
  const declined = invitations.filter((i) => i.status === 'declined');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Invitations
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your event invitations
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All ({invitations.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({accepted.length})</TabsTrigger>
          <TabsTrigger value="declined">Declined ({declined.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {invitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No invitations"
              description="You don't have any event invitations yet."
              action={{ label: 'Explore Events', href: '/events' }}
            />
          ) : (
            <div className="space-y-4">
              {invitations.map((inv) => (
                <InvitationCard
                  key={inv.id}
                  inv={inv}
                  showActions={pending.includes(inv)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {pending.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No pending invitations"
              description="You're all caught up!"
            />
          ) : (
            <div className="space-y-4">
              {pending.map((inv) => (
                <InvitationCard key={inv.id} inv={inv} showActions={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted">
          {accepted.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No accepted invitations"
              description="Invitations you accept will appear here."
            />
          ) : (
            <div className="space-y-4">
              {accepted.map((inv) => (
                <InvitationCard key={inv.id} inv={inv} showActions={false} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="declined">
          {declined.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No declined invitations"
              description="Invitations you decline will appear here."
            />
          ) : (
            <div className="space-y-4">
              {declined.map((inv) => (
                <InvitationCard key={inv.id} inv={inv} showActions={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
