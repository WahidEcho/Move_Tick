import Link from 'next/link';
import { getActiveOrganizerOrg } from '@/lib/auth';
import { getOrganizerDashboardSummary } from '@/services/analytics.service';
import { getOrganizationEvents } from '@/services/events.service';
import { StatCard } from '@/components/layout/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/helpers';
import { CapacityTable } from './capacity-table';
import {
  Calendar,
  Users,
  Mail,
  UserCheck,
  Plus,
  ArrowRight,
} from 'lucide-react';

export default async function OrganizerOverviewPage() {
  const { org } = await getActiveOrganizerOrg();
  const [summary, recentEventsResult] = await Promise.all([
    getOrganizerDashboardSummary(org.id),
    getOrganizationEvents(org.id, { page_size: 5 }),
  ]);

  const recentEvents = recentEventsResult.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">
            Monitor your events and registrations at a glance
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/organizer/events/new" className="gap-2">
              <Plus className="size-4" />
              Create Event
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/organizer/events" className="gap-2">
              Invite Attendees
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Upcoming Events"
          value={summary.upcoming_events}
          icon={Calendar}
        />
        <StatCard
          title="Total Registrations"
          value={summary.total_registrations}
          icon={Users}
        />
        <StatCard
          title="Total Invitations"
          value={summary.total_invitations}
          icon={Mail}
        />
        <StatCard
          title="Active Staff"
          value={summary.active_staff}
          icon={UserCheck}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Capacity Overview</CardTitle>
            <p className="text-sm text-muted-foreground">
              Event capacity vs. registered attendees
            </p>
          </CardHeader>
          <CardContent>
            <CapacityTable data={summary.capacity_overview} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Events</CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest events by start date
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/organizer/events">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Calendar className="mb-2 size-12 opacity-40" />
                <p className="text-sm">No events yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/organizer/events/new">Create your first event</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentEvents.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/organizer/events/${event.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(event.start_date)}
                          {event.venue && ` · ${event.venue}`}
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
