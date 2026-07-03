import Link from 'next/link';
import { requireEventAccess } from '@/lib/auth';
import { getEventStats } from '@/services/events.service';
import { getEventAnalytics } from '@/services/analytics.service';
import { StatCard } from '@/components/layout/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  UserCheck,
  MapPin,
  Mail,
  Pencil,
  Calendar,
  Eye,
  Settings,
  Ticket,
  LayoutGrid,
  Gift,
  UsersRound,
  BarChart3,
} from 'lucide-react';
import { formatDateTime } from '@/lib/helpers';

const SECTIONS = [
  { label: 'Invitations', href: 'invitations', icon: Mail },
  { label: 'Attendees', href: 'attendees', icon: Users },
  { label: 'Tickets', href: 'tickets', icon: Ticket },
  { label: 'Spaces', href: 'spaces', icon: LayoutGrid },
  { label: 'Redeems', href: 'redeems', icon: Gift },
  { label: 'Team', href: 'team', icon: UsersRound },
  { label: 'Analytics', href: 'analytics', icon: BarChart3 },
  { label: 'Settings', href: 'edit', icon: Settings },
] as const;

const VISIBILITY_LABELS: Record<string, string> = {
  public: 'Public',
  private: 'Private',
  invite_only: 'Invite Only',
  members_only: 'Members Only',
};

export default async function EventManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event } = await requireEventAccess(id);

  const [stats, analytics] = await Promise.all([
    getEventStats(id),
    getEventAnalytics(id),
  ]);

  const invitationsSent = analytics.invitation_funnel.total;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{event.title}</h2>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(event.start_date)}
            {event.venue && ` · ${event.venue}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/organizer/events/${id}/edit`} className="gap-1.5">
              <Pencil className="size-3.5" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/events/${event.slug}`} className="gap-1.5" target="_blank">
              <Eye className="size-3.5" />
              View Public Page
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Registrations"
          value={stats.registrations}
          icon={Users}
        />
        <StatCard
          title="Checked In"
          value={stats.checked_in}
          icon={UserCheck}
        />
        <StatCard
          title="Currently Inside"
          value={analytics.currently_inside}
          icon={UserCheck}
        />
        <StatCard
          title="Invitations Sent"
          value={invitationsSent}
          icon={Mail}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Summary of your event configuration
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={event.is_published ? 'default' : 'secondary'}>
                  {event.is_published ? 'Published' : 'Draft'}
                </Badge>
                {event.is_cancelled && (
                  <Badge variant="destructive">Cancelled</Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Visibility</p>
              <p className="mt-1">{VISIBILITY_LABELS[event.visibility] ?? event.visibility}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date & Time</p>
              <p className="mt-1">{formatDateTime(event.start_date)} – {formatDateTime(event.end_date)}</p>
            </div>
            {event.venue && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Venue</p>
                <p className="mt-1 flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {event.venue}
                  {event.city && `, ${event.city}`}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Capacity</p>
              <p className="mt-1">{event.capacity ?? 'Unlimited'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage invitations, attendees, tickets, and more
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const href = s.href === 'edit'
                ? `/organizer/events/${id}/edit`
                : `/organizer/events/${id}/${s.href}`;
              return (
                <Button
                  key={s.href}
                  variant="outline"
                  className="justify-start gap-2"
                  asChild
                >
                  <Link href={href}>
                    <Icon className="size-4" />
                    {s.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
