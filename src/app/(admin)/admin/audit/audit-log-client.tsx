'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { DataTable } from '@/components/tables/data-table';
import { TableFilters } from '@/components/tables/table-filters';
import { Pagination } from '@/components/tables/pagination';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { AdminAuditLogEntry } from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';
import { ShieldAlert } from 'lucide-react';

const TARGET_TYPE_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Events', value: 'event' },
  { label: 'Organizations', value: 'organization' },
  { label: 'Users', value: 'profile' },
  { label: 'Applications', value: 'organizer_application' },
  { label: 'Platform settings', value: 'platform_settings' },
];

interface AuditLogClientProps {
  result: PaginatedResult<AdminAuditLogEntry>;
  searchParams: { search?: string; targetType?: string; page?: string };
}

export function AuditLogClient({ result, searchParams }: AuditLogClientProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { data, total, page, page_size, total_pages } = result;
  const search = searchParams.search ?? '';
  const targetType = searchParams.targetType ?? '';
  const currentPage = Number(searchParams.page) || 1;

  const buildUrl = useCallback(
    (updates: Record<string, string | number>) => {
      const params = new URLSearchParams(urlSearchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === '' || value === undefined) params.delete(key);
        else params.set(key, String(value));
      });
      params.delete('page');
      if ('page' in updates) params.set('page', String(updates.page));
      return `/admin/audit?${params.toString()}`;
    },
    [urlSearchParams]
  );

  const handleSearchChange = (value: string) => {
    startTransition(() => router.push(buildUrl({ search: value, targetType })));
  };

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => router.push(buildUrl({ [key]: value, search })));
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() => router.push(buildUrl({ page: newPage })));
  };

  const columns = [
    {
      key: 'actor',
      label: 'Actor',
      render: (row: AdminAuditLogEntry) => (
        <span className="font-medium">{row.actor?.full_name || row.actor?.email || 'System'}</span>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (row: AdminAuditLogEntry) => <Badge variant="outline">{row.action}</Badge>,
    },
    {
      key: 'target',
      label: 'Target',
      render: (row: AdminAuditLogEntry) => (
        <span className="text-muted-foreground">
          {row.target_type}
          {row.target_id ? ` · ${row.target_id.slice(0, 8)}` : ''}
        </span>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (row: AdminAuditLogEntry) => (
        <span className="text-sm text-muted-foreground">{row.reason || '—'}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'When',
      render: (row: AdminAuditLogEntry) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <TableFilters
        searchPlaceholder="Search by action or reason..."
        searchValue={search}
        onSearchChange={handleSearchChange}
        filters={[{ key: 'targetType', label: 'Target', options: TARGET_TYPE_OPTIONS }]}
        onFilterChange={handleFilterChange}
        filterValues={{ targetType }}
      />
      <DataTable<AdminAuditLogEntry>
        columns={columns}
        data={data}
        loading={isPending}
        emptyMessage="No audit entries found"
        emptyIcon={ShieldAlert}
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
