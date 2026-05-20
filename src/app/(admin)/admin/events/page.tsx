import { requireAdmin } from '@/lib/auth';
import { getEvents, getEventStats } from '@/services/events.service';
import { EventsListClient } from './events-list-client';

interface EventsPageProps {
  searchParams: Promise<{
    search?: string;
    visibility?: string;
    published?: string;
    page?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const search = params.search ?? '';
  const visibility = params.visibility as
    | 'public'
    | 'private'
    | 'invite_only'
    | 'members_only'
    | undefined;
  const is_published =
    params.published === 'true'
      ? true
      : params.published === 'false'
        ? false
        : undefined;
  const page = Number(params.page) || 1;

  const result = await getEvents({
    search: search || undefined,
    visibility,
    is_published,
    page,
    page_size: 20,
  });

  const registrationCounts = await Promise.all(
    result.data.map((e) =>
      getEventStats(e.id).then((s) => ({ eventId: e.id, count: s.registrations }))
    )
  );
  const countsMap = Object.fromEntries(
    registrationCounts.map((c) => [c.eventId, c.count])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage all events on the platform.
        </p>
      </div>
      <EventsListClient
        result={result}
        searchParams={params}
        registrationCounts={countsMap}
      />
    </div>
  );
}
