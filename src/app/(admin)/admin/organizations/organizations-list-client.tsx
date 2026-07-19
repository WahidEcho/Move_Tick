'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { DataTable } from '@/components/tables/data-table';
import { TableFilters } from '@/components/tables/table-filters';
import { Pagination } from '@/components/tables/pagination';
import { Badge } from '@/components/ui/badge';
import { OrgRowActions } from './org-row-actions';
import type { OrganizationWithCounts } from '@/services/organizations.service';
import type { PaginatedResult } from '@/types/domain.types';
import { Building2 } from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Pending', value: 'pending' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_BADGE_CLASSES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  on_hold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  pending: 'bg-muted text-muted-foreground',
  rejected: 'bg-muted text-muted-foreground',
};

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
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className={STATUS_BADGE_CLASSES[row.status] ?? 'bg-muted text-muted-foreground'}>
            {row.status.replace('_', ' ')}
          </Badge>
          {row.archived_at && (
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              Deleted
            </Badge>
          )}
        </div>
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
    {
      key: 'actions',
      label: '',
      className: 'w-10 text-right',
      render: (row: OrganizationWithCounts) => <OrgRowActions org={row} />,
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
