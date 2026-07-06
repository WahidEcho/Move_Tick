import { requireAdmin } from '@/lib/auth';
import { getEventsForAdmin, getRegistrationCountsByEvent, type AdminEventStatus } from '@/services/events.service';
import { EventsListClient } from './events-list-client';
import { EventsExportButton } from './export-button';

interface EventsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const search = params.search ?? '';
  const status = (params.status || 'all') as AdminEventStatus;
  const page = Number(params.page) || 1;

  const result = await getEventsForAdmin({
    search: search || undefined,
    status,
    page,
    page_size: 20,
  });

  const countsMap = await getRegistrationCountsByEvent(result.data.map((e) => e.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all events on the platform.
          </p>
        </div>
        <EventsExportButton />
      </div>
      <EventsListClient
        result={result}
        searchParams={params}
        registrationCounts={countsMap}
      />
    </div>
  );
}
