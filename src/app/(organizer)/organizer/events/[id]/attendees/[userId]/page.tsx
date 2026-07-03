import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireEventAccess } from '@/lib/auth';
import { getAttendeeDetails } from '@/services/attendees.service';
import { getEventSpaces } from '@/services/spaces.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  MapPin,
  Phone,
} from 'lucide-react';
import { formatDateTime, getInitials, getPresenceColor, getPresenceLabel } from '@/lib/helpers';
import { REGISTRATION_STATUS_COLORS } from '@/lib/constants';
import { AttendeeDetailActions } from './attendee-detail-actions';

interface AttendeeDetailPageProps {
  params: Promise<{ id: string; userId: string }>;
}

export default async function AttendeeDetailPage({
  params,
}: AttendeeDetailPageProps) {
  const { id: eventId, userId } = await params;

  await requireEventAccess(eventId);

  const [attendee, spaces] = await Promise.all([
    getAttendeeDetails(eventId, userId),
    getEventSpaces(eventId),
  ]);

  if (!attendee) {
    notFound();
  }

  const spaceMap = new Map(spaces.map((s) => [s.id, s.name]));
  const profile = attendee.profile as {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;

  const registration = attendee.registration;
  const ticketType = registration?.ticket_type;

  const lastMovement = attendee.movements[attendee.movements.length - 1];
  const canApprove =
    registration.status === 'pending' || registration.status === 'waitlisted';
  const canReject =
    registration.status === 'pending' || registration.status === 'waitlisted';
  const canCancel = ['approved', 'confirmed'].includes(registration.status);
  const isWaitlisted = registration.status === 'waitlisted';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/organizer/events/${eventId}/attendees`}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Attendees
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-16">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(profile?.full_name ?? profile?.email ?? '?')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {profile?.full_name ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.email}
                  </p>
                </div>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="size-4 text-muted-foreground" />
                  {profile.phone}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendeeDetailActions
                eventId={eventId}
                userId={userId}
                registrationId={registration.id}
                canApprove={canApprove}
                canReject={canReject}
                canCancel={canCancel}
                isWaitlisted={isWaitlisted}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Ticket Type
                  </p>
                  <p className="mt-1">
                    {ticketType?.name ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Source
                  </p>
                  <p className="mt-1 capitalize">{registration.source}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={
                        REGISTRATION_STATUS_COLORS[registration.status] ??
                        'bg-muted text-muted-foreground'
                      }
                    >
                      {registration.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Registered
                  </p>
                  <p className="mt-1">
                    {formatDateTime(registration.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    getPresenceColor(attendee.presence) ??
                    'bg-muted text-muted-foreground'
                  }
                >
                  {getPresenceLabel(attendee.presence)}
                </Badge>
              </div>
              {lastMovement && (
                <p className="text-sm text-muted-foreground">
                  Last movement: {formatDateTime(lastMovement.created_at ?? (lastMovement as { scanned_at?: string }).scanned_at)}
                </p>
              )}
            </CardContent>
          </Card>

          {attendee.movements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Movement History</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Check-in and check-out timeline
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attendee.movements.map((m, i) => {
                    const mov = m as { movement_type: string; created_at?: string; scanned_at?: string };
                    const ts = mov.created_at ?? mov.scanned_at ?? '';
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        {mov.movement_type === 'check_in' ? (
                          <MapPin className="size-4 text-green-600" />
                        ) : (
                          <MapPin className="size-4 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">
                            {mov.movement_type.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(ts)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {attendee.space_participations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Space Participation</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Spaces attended with timestamps
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attendee.space_participations.map((sm, i) => {
                    const sp = sm as { space_id: string; movement_type: string; created_at?: string; scanned_at?: string };
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <span className="font-medium">
                          {spaceMap.get(sp.space_id) ?? sp.space_id}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(sp.created_at ?? sp.scanned_at ?? '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {attendee.redeem_history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Redeem History</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Redeemed items with quantities
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attendee.redeem_history.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="font-medium">{r.item_name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">×{r.quantity}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(r.redeemed_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {registration.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {registration.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
