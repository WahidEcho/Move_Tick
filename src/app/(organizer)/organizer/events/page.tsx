import Link from 'next/link';
import { getActiveOrganizerOrg } from '@/lib/auth';
import {
  getOrganizationEvents,
  getEventStats,
} from '@/services/events.service';
import { EventsListClient } from './events-list-client';

export default async function OrganizerEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; page?: string }>;
}) {
  const { org } = await getActiveOrganizerOrg();
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

  const result = await getOrganizationEvents(org.id, filters);

  const registrationCounts: Record<string, number> = {};
  await Promise.all(
    result.data.map(async (e) => {
      const stats = await getEventStats(e.id);
      registrationCounts[e.id] = stats.registrations;
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Events</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage your events
          </p>
        </div>
        <Link
          href="/organizer/events/new"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create Event
        </Link>
      </div>

      <EventsListClient
        events={result.data}
        registrationCounts={registrationCounts}
        total={result.total}
        totalPages={result.total_pages}
        currentPage={page}
        currentTab={tab}
        searchValue={search}
      />
    </div>
  );
}
