import Link from 'next/link';
import { getPublicEvents, getConfirmedCountsByEvent } from '@/services/events.service';
import { EVENT_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EventCard } from './event-card';
import { AnimatedGrid } from './animated-grid';

interface EventsPageProps {
  searchParams: Promise<{ search?: string; category?: string; city?: string; page?: string }>;
}

/** Build an /events URL preserving the other active filters. */
function filterHref(params: { search?: string; category?: string; city?: string }) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.category) qs.set('category', params.category);
  if (params.city) qs.set('city', params.city);
  const s = qs.toString();
  return s ? `/events?${s}` : '/events';
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
    <div className="overflow-hidden">
      {/* ── Cinematic header ─────────────────────────────────────── */}
      <section className="relative isolate px-4 pt-16 pb-10 sm:pt-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="mt-aurora absolute -top-40 left-1/4 size-[42rem] rounded-full bg-brand-purple/20 blur-[130px]" />
          <div className="mt-aurora-slow absolute -top-24 right-1/5 size-[32rem] rounded-full bg-brand-green/12 blur-[130px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Find your next <span className="mt-gradient-text">experience</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {total > 0
              ? `${total} event${total === 1 ? '' : 's'} waiting for you`
              : 'Concerts, meetups, tournaments and more'}
          </p>

          {/* Big search bar (lu.ma style) */}
          <form method="get" action="/events" className="mx-auto mt-8 max-w-2xl">
            {category && <input type="hidden" name="category" value={category} />}
            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-[0_8px_40px_-12px_rgba(91,59,232,0.25)] backdrop-blur transition-colors focus-within:border-brand-purple/50 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  name="search"
                  type="search"
                  placeholder="Search events…"
                  defaultValue={search}
                  className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-2 border-white/10 px-3 sm:border-l">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <input
                  name="city"
                  type="text"
                  placeholder="City"
                  defaultValue={city}
                  className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:w-32"
                />
              </div>
              <Button type="submit" className="h-10 shrink-0 rounded-xl bg-brand-purple px-6 text-white hover:bg-brand-purple/90">
                Search
              </Button>
            </div>
          </form>
        </div>

        {/* Category pills */}
        <div className="mx-auto mt-8 max-w-5xl">
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
            <Link
              href={filterHref({ search, city })}
              className={cn(
                'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                !category
                  ? 'border-brand-purple bg-brand-purple text-white'
                  : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:border-brand-purple/40 hover:text-foreground'
              )}
            >
              All
            </Link>
            {EVENT_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={filterHref({ search, city, category: cat })}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  category === cat
                    ? 'border-brand-purple bg-brand-purple text-white'
                    : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:border-brand-purple/40 hover:text-foreground'
                )}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Results ──────────────────────────────────────────────── */}
      <section className="container mx-auto max-w-6xl px-4 pb-20">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-20">
            <Calendar className="size-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              No events found
            </h2>
            <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
              {search || category || city
                ? 'Try a different search or category — new events are added all the time.'
                : 'Check back soon for upcoming events.'}
            </p>
            {(search || category || city) && (
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link href="/events">Clear filters</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <AnimatedGrid className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  confirmedCount={confirmedCounts[event.id] ?? 0}
                />
              ))}
            </AnimatedGrid>

            {total_pages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
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
      </section>
    </div>
  );
}
