'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TableFilters } from '@/components/tables/table-filters';
import { Pagination } from '@/components/tables/pagination';
import { EmptyState } from '@/components/layout/empty-state';
import { Calendar, Pencil, ExternalLink, Users } from 'lucide-react';
import { formatDateTime } from '@/lib/helpers';
import type { EventWithDetails } from '@/services/events.service';

interface EventsListClientProps {
  events: EventWithDetails[];
  registrationCounts: Record<string, number>;
  total: number;
  totalPages: number;
  currentPage: number;
  currentTab: string;
  searchValue: string;
}

const VISIBILITY_LABELS: Record<string, string> = {
  public: 'Public',
  private: 'Private',
  invite_only: 'Invite Only',
  members_only: 'Members Only',
};

export function EventsListClient({
  events,
  registrationCounts,
  total,
  totalPages,
  currentPage,
  currentTab,
  searchValue,
}: EventsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    router.push(`/organizer/events?${next.toString()}`);
  };

  const setPage = (page: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('page', String(page));
    router.push(`/organizer/events?${next.toString()}`);
  };

  return (
    <div className="space-y-4">
      <TableFilters
        searchPlaceholder="Search events..."
        searchValue={searchValue}
        onSearchChange={(v) => setParam('search', v)}
      />

      <Tabs
        value={currentTab}
        onValueChange={(v) => setParam('tab', v)}
      >
        <TabsList variant="line" className="bg-transparent">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {events.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No events found"
              description={
                currentTab === 'draft'
                  ? 'Create a draft event to get started'
                  : currentTab === 'upcoming'
                    ? 'No upcoming published events'
                    : currentTab === 'past'
                      ? 'No past events yet'
                      : 'Create your first event to get started'
              }
              action={{
                label: 'Create Event',
                href: '/organizer/events/new',
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    registrationCount={registrationCounts[event.id] ?? 0}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  total={total}
                  onPageChange={setPage}
                />
              )}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}

function EventCard({
  event,
  registrationCount,
}: {
  event: EventWithDetails;
  registrationCount: number;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/organizer/events/${event.id}`}
              className="font-semibold text-foreground hover:underline line-clamp-2"
            >
              {event.title}
            </Link>
          </div>
          <div className="flex shrink-0 gap-1">
            <Badge variant={event.is_published ? 'default' : 'secondary'}>
              {event.is_published ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {formatDateTime(event.start_date)}
        </p>
        {event.venue && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            {event.venue}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {VISIBILITY_LABELS[event.visibility] ?? event.visibility}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            {registrationCount} registrations
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/organizer/events/${event.id}/edit`} className="gap-1.5">
              <Pencil className="size-3.5" />
              Edit
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/organizer/events/${event.id}`} className="gap-1.5">
              <ExternalLink className="size-3.5" />
              View
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
