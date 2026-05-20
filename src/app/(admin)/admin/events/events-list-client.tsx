'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/tables/data-table';
import { TableFilters } from '@/components/tables/table-filters';
import { Pagination } from '@/components/tables/pagination';
import { Badge } from '@/components/ui/badge';
import type { EventWithDetails } from '@/services/events.service';
import type { PaginatedResult } from '@/types/domain.types';
import { CalendarDays } from 'lucide-react';

const VISIBILITY_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
  { label: 'Invite Only', value: 'invite_only' },
  { label: 'Members Only', value: 'members_only' },
];

const PUBLISHED_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Published', value: 'true' },
  { label: 'Draft', value: 'false' },
];

interface EventsListClientProps {
  result: PaginatedResult<EventWithDetails>;
  searchParams: {
    search?: string;
    visibility?: string;
    published?: string;
    page?: string;
  };
  registrationCounts: Record<string, number>;
}

function formatVisibility(v: string): string {
  return v
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
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
  const visibility = searchParams.visibility ?? '';
  const published = searchParams.published ?? '';
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
      router.push(buildUrl({ search: value, visibility, published }));
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      const updates: Record<string, string> = { search, visibility, published };
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
      key: 'visibility',
      label: 'Visibility',
      render: (row: EventWithDetails) => (
        <Badge variant="outline" className="bg-muted/60">
          {formatVisibility(row.visibility)}
        </Badge>
      ),
    },
    {
      key: 'published',
      label: 'Published',
      render: (row: EventWithDetails) => (
        <Badge
          variant="outline"
          className={
            row.is_published
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          }
        >
          {row.is_published ? 'Yes' : 'Draft'}
        </Badge>
      ),
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
  ];

  return (
    <div className="space-y-4">
      <TableFilters
        searchPlaceholder="Search by title or venue..."
        searchValue={search}
        onSearchChange={handleSearchChange}
        filters={[
          { key: 'visibility', label: 'Visibility', options: VISIBILITY_OPTIONS },
          { key: 'published', label: 'Status', options: PUBLISHED_OPTIONS },
        ]}
        onFilterChange={handleFilterChange}
        filterValues={{ visibility, published }}
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
