'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { DataTable } from '@/components/tables/data-table';
import { TableFilters } from '@/components/tables/table-filters';
import { Pagination } from '@/components/tables/pagination';
import { Badge } from '@/components/ui/badge';
import type { Profile } from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';
import { Users } from 'lucide-react';

const ROLE_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Attendee', value: 'attendee' },
  { label: 'Organizer', value: 'organizer' },
  { label: 'Admin', value: 'admin' },
];

const ROLE_BADGE_CLASSES: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  organizer: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  attendee: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

interface UsersListClientProps {
  result: PaginatedResult<Profile>;
  searchParams: { search?: string; role?: string; page?: string };
}

export function UsersListClient({
  result,
  searchParams,
}: UsersListClientProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { data, total, page, page_size, total_pages } = result;
  const search = searchParams.search ?? '';
  const role = searchParams.role ?? '';
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
      return `/admin/users?${params.toString()}`;
    },
    [urlSearchParams]
  );

  const handleSearchChange = (value: string) => {
    startTransition(() => router.push(buildUrl({ search: value, role })));
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
      render: (row: Profile) => (
        <span className="font-medium">
          {row.full_name || <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (row: Profile) => (
        <span className="text-muted-foreground">{row.email}</span>
      ),
    },
    {
      key: 'platform_role',
      label: 'Platform Role',
      render: (row: Profile) => (
        <Badge
          variant="outline"
          className={
            ROLE_BADGE_CLASSES[row.platform_role] ??
            'bg-muted text-muted-foreground'
          }
        >
          {row.platform_role.charAt(0).toUpperCase() + row.platform_role.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: Profile) =>
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
        searchPlaceholder="Search by name or email..."
        searchValue={search}
        onSearchChange={handleSearchChange}
        filters={[{ key: 'role', label: 'Role', options: ROLE_FILTER_OPTIONS }]}
        onFilterChange={handleFilterChange}
        filterValues={{ role }}
      />
      <DataTable<Profile>
        columns={columns}
        data={data}
        loading={isPending}
        emptyMessage="No users found"
        emptyIcon={Users}
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
