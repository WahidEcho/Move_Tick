'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { DataTable } from '@/components/tables/data-table';
import { TableFilters } from '@/components/tables/table-filters';
import { Pagination } from '@/components/tables/pagination';
import { Badge } from '@/components/ui/badge';
import type { OrganizationWithCounts } from '@/services/organizations.service';
import type { PaginatedResult } from '@/types/domain.types';
import { Building2 } from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

interface OrganizationsListClientProps {
  result: PaginatedResult<OrganizationWithCounts>;
  searchParams: { search?: string; status?: string; page?: string };
}

export function OrganizationsListClient({
  result,
  searchParams,
}: OrganizationsListClientProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { data, total, page, page_size, total_pages } = result;
  const search = searchParams.search ?? '';
  const status = searchParams.status ?? '';
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
      if ('page' in updates) params.set('page', String(updates.page));
      return `/admin/organizations?${params.toString()}`;
    },
    [urlSearchParams]
  );

  const handleSearchChange = (value: string) => {
    startTransition(() => router.push(buildUrl({ search: value, status })));
  };

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => router.push(buildUrl({ [key]: value, search })));
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() => router.push(buildUrl({ page: newPage })));
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row: OrganizationWithCounts) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      key: 'owner',
      label: 'Owner',
      render: () => <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'members_count',
      label: 'Members',
      render: (row: OrganizationWithCounts) => row.members_count,
    },
    {
      key: 'events_count',
      label: 'Events',
      render: (row: OrganizationWithCounts) => row.events_count,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: OrganizationWithCounts) => (
        <Badge
          variant="outline"
          className={
            row.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          }
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: OrganizationWithCounts) =>
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
        searchPlaceholder="Search by name or city..."
        searchValue={search}
        onSearchChange={handleSearchChange}
        filters={[
          { key: 'status', label: 'Status', options: STATUS_FILTER_OPTIONS },
        ]}
        onFilterChange={handleFilterChange}
        filterValues={{ status }}
      />
      <DataTable<OrganizationWithCounts>
        columns={columns}
        data={data}
        loading={isPending}
        emptyMessage="No organizations found"
        emptyIcon={Building2}
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
