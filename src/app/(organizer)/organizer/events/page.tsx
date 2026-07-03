import Link from 'next/link';
import { getOrganizerContext, getAccessibleEvents } from '@/lib/auth';
import {
  getOrganizationEvents,
  getRegistrationCountsByEvent,
  type EventWithDetails,
} from '@/services/events.service';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, ExternalLink, Pencil } from 'lucide-react';
import { formatDateTime } from '@/lib/helpers';
import { EventsListClient } from './events-list-client';

export default async function OrganizerEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; page?: string }>;
}) {
  const { profile, org } = await getOrganizerContext();
  const params = await searchParams;
  const tab = params.tab ?? 'all';
  const search = params.search ?? '';
  const page = Number(params.page) || 1;

  const now = new Date().toISOString();
  const filters: Parameters<typeof getOrganizationEvents>[1] = {
    page,
    page_size: 12,
  };

  if (search.trim()) filters.search = search.trim();
  switch (tab) {
    case 'upcoming':
      filters.is_published = true;
      filters.start_date_gte = now;
      filters.is_cancelled = false;
      break;
    case 'past':
      filters.end_date_lt = now;
      break;
    case 'draft':
      filters.is_published = false;
      filters.is_cancelled = false;
      break;
    default:
      filters.is_cancelled = false;
  }

  const ownedResult = org
    ? await getOrganizationEvents(org.id, filters)
    : { data: [] as EventWithDetails[], total: 0, total_pages: 1, page: 1, page_size: 12 };

  // Events shared with the user as an assigned co-organizer (excluding their own org's).
  const { assigned } = await getAccessibleEvents(profile.id);
  const sharedEvents = assigned.filter((e) => !org || e.organization_id !== org.id);

  const registrationCounts = await getRegistrationCountsByEvent([
    ...ownedResult.data.map((e) => e.id),
    ...sharedEvents.map((e) => e.id),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Events</h2>
          <p className="text-sm text-muted-foreground">
            {org ? 'Create and manage your events' : 'Events shared with you'}
          </p>
        </div>
        {org && (
          <Link
            href="/organizer/events/new"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create Event
          </Link>
        )}
      </div>

      {org && (
        <EventsListClient
          events={ownedResult.data}
          registrationCounts={registrationCounts}
          total={ownedResult.total}
          totalPages={ownedResult.total_pages}
          currentPage={page}
          currentTab={tab}
          searchValue={search}
        />
      )}

      {sharedEvents.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Shared with me</h3>
            <p className="text-sm text-muted-foreground">
              Events you were assigned to as a co-organizer
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sharedEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <Link
                      href={`/organizer/events/${event.id}`}
                      className="min-w-0 flex-1 font-semibold text-foreground hover:underline line-clamp-2"
                    >
                      {event.title}
                    </Link>
                    <Badge variant="secondary">Shared</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.start_date)}
                  </p>
                  {event.venue && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {event.venue}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="size-3.5" />
                    {registrationCounts[event.id] ?? 0} registrations
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/organizer/events/${event.id}/edit`} className="gap-1.5">
                        <Pencil className="size-3.5" />
                        Manage
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/organizer/events/${event.id}`} className="gap-1.5">
                        <ExternalLink className="size-3.5" />
                        Open
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
