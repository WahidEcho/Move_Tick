'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/tables/data-table';
import { TableFilters } from '@/components/tables/table-filters';
import { Pagination } from '@/components/tables/pagination';
import { Badge } from '@/components/ui/badge';
import { EventRowActions } from './event-row-actions';
import type { EventWithDetails } from '@/services/events.service';
import type { PaginatedResult } from '@/types/domain.types';
import { CalendarDays } from 'lucide-react';

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Published (live)', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Hidden', value: 'hidden' },
  { label: 'Expired', value: 'expired' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Archived', value: 'archived' },
];

interface EventsListClientProps {
  result: PaginatedResult<EventWithDetails>;
  searchParams: {
    search?: string;
    status?: string;
    page?: string;
  };
  registrationCounts: Record<string, number>;
}

function StatusBadges({ event }: { event: EventWithDetails }) {
  if (event.archived_at) {
    return <Badge variant="outline" className="bg-muted text-muted-foreground">Archived</Badge>;
  }
  if (event.is_cancelled) {
    return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Cancelled</Badge>;
  }
  const badges = [];
  badges.push(
    <Badge
      key="published"
      variant="outline"
      className={
        event.is_published
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-muted text-muted-foreground'
      }
    >
      {event.is_published ? 'Published' : 'Draft'}
    </Badge>
  );
  if (event.is_hidden) {
    badges.push(
      <Badge key="hidden" variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        Hidden
      </Badge>
    );
  }
  if (new Date(event.end_date) < new Date()) {
    badges.push(
      <Badge key="expired" variant="outline" className="bg-muted text-muted-foreground">
        Ended
      </Badge>
    );
  }
  return <div className="flex flex-wrap gap-1">{badges}</div>;
}

export function EventsListClient({
  result,
  searchParams,
  registrationCounts = {},
}: EventsListClientProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { data, total, page, page_size, total_pages } = result;
  const search = searchParams.search ?? '';
  const status = searchParams.status ?? 'all';
  const currentPage = Number(searchParams.page) || 1;

  const buildUrl = useCallback(
    (updates: Record<string, string | number>) => {
      const params = new URLSearchParams(urlSearchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === '' || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      params.delete('page');
      if ('page' in updates) {
        params.set('page', String(updates.page));
      }
      return `/admin/events?${params.toString()}`;
    },
    [urlSearchParams]
  );

  const handleSearchChange = (value: string) => {
    startTransition(() => {
      router.push(buildUrl({ search: value, status }));
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      const updates: Record<string, string> = { search, status };
      updates[key] = value;
      router.push(buildUrl(updates));
    });
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      router.push(buildUrl({ page: newPage }));
    });
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (row: EventWithDetails) => (
        <Link
          href={`/events/${row.slug}`}
          className="font-medium text-primary hover:underline"
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: 'organization',
      label: 'Organization',
      render: (row: EventWithDetails) =>
        row.organization?.name ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (row: EventWithDetails) =>
        new Date(row.start_date).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: EventWithDetails) => <StatusBadges event={row} />,
    },
    {
      key: 'registrations',
      label: 'Registrations',
      render: (row: EventWithDetails) =>
        registrationCounts[row.id] ?? '—',
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: EventWithDetails) =>
        new Date(row.created_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-10 text-right',
      render: (row: EventWithDetails) => <EventRowActions event={row} />,
    },
  ];

  return (
    <div className="space-y-4">
      <TableFilters
        searchPlaceholder="Search by title or venue..."
        searchValue={search}
        onSearchChange={handleSearchChange}
        filters={[{ key: 'status', label: 'Status', options: STATUS_OPTIONS }]}
        onFilterChange={handleFilterChange}
        filterValues={{ status }}
      />
      <DataTable<EventWithDetails>
        columns={columns}
        data={data}
        loading={isPending}
        emptyMessage="No events found"
        emptyIcon={CalendarDays}
      />
      {total_pages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={total_pages}
          onPageChange={handlePageChange}
          pageSize={page_size}
          total={total}
        />
      )}
    </div>
  );
}
