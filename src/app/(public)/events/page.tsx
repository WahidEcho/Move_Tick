import Link from 'next/link';
import { getPublicEvents, getConfirmedCountsByEvent } from '@/services/events.service';
import { EVENT_CATEGORIES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { EventCard } from './event-card';

interface EventsPageProps {
  searchParams: Promise<{ search?: string; category?: string; city?: string; page?: string }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const search = params.search ?? '';
  const category = params.category ?? '';
  const city = params.city ?? '';
  const page = parseInt(params.page ?? '1', 10);

  const { data: events, total, total_pages } = await getPublicEvents({
    search: search || undefined,
    category: category || undefined,
    city: city || undefined,
    page,
    page_size: 12,
  });

  // One batched query for all "spots left" badges (was a per-card query).
  const confirmedCounts = await getConfirmedCountsByEvent(events.map((e) => e.id));

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Discover Events
        </h1>
        <p className="mt-2 text-muted-foreground">
          Find and join events that matter to you.
        </p>
      </div>

      {/* Filters */}
      <form
        method="get"
        action="/events"
        className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-end"
      >
        <div className="flex-1">
          <label htmlFor="search" className="mb-1.5 block text-sm font-medium text-foreground">
            Search
          </label>
          <Input
            id="search"
            name="search"
            type="search"
            placeholder="Search events..."
            defaultValue={search}
            className="w-full"
          />
        </div>
        <div className="w-full md:w-48">
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-foreground">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category}
            className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">All categories</option>
            {EVENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-48">
          <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-foreground">
            City
          </label>
          <Input
            id="city"
            name="city"
            type="text"
            placeholder="City"
            defaultValue={city}
            className="w-full"
          />
        </div>
        <Button type="submit" variant="default">
          Apply filters
        </Button>
      </form>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16">
          <Calendar className="size-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            No events found
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {search || category || city
              ? 'Try adjusting your filters to see more results.'
              : 'Check back soon for upcoming events.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                confirmedCount={confirmedCounts[event.id] ?? 0}
              />
            ))}
          </div>

          {total_pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/events?${new URLSearchParams({
                    ...(search && { search }),
                    ...(category && { category }),
                    ...(city && { city }),
                    page: String(page - 1),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                </Link>
              )}
              <span className="px-4 text-sm text-muted-foreground">
                Page {page} of {total_pages}
              </span>
              {page < total_pages && (
                <Link
                  href={`/events?${new URLSearchParams({
                    ...(search && { search }),
                    ...(category && { category }),
                    ...(city && { city }),
                    page: String(page + 1),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
