'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { DataTable } from '@/components/tables/data-table';
import { TableFilters } from '@/components/tables/table-filters';
import { Pagination } from '@/components/tables/pagination';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { EmailLogEntry } from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';
import { Mail } from 'lucide-react';

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Sent', value: 'sent' },
  { label: 'Failed', value: 'failed' },
];

interface EmailLogClientProps {
  result: PaginatedResult<EmailLogEntry>;
  searchParams: { search?: string; status?: string; page?: string };
}

export function EmailLogClient({ result, searchParams }: EmailLogClientProps) {
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
        if (value === '' || value === undefined) params.delete(key);
        else params.set(key, String(value));
      });
      params.delete('page');
      if ('page' in updates) params.set('page', String(updates.page));
      return `/admin/emails?${params.toString()}`;
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
      key: 'recipient_email',
      label: 'Recipient',
      render: (row: EmailLogEntry) => <span className="font-medium">{row.recipient_email}</span>,
    },
    {
      key: 'email_type',
      label: 'Type',
      render: (row: EmailLogEntry) => <Badge variant="outline">{row.email_type}</Badge>,
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (row: EmailLogEntry) => <span className="text-sm text-muted-foreground">{row.subject}</span>,
    },
    {
      key: 'delivery_status',
      label: 'Status',
      render: (row: EmailLogEntry) => (
        <div className="flex flex-col gap-0.5">
          <Badge
            variant="outline"
            className={
              row.delivery_status === 'sent'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }
          >
            {row.delivery_status}
          </Badge>
          {row.failure_reason && (
            <span className="max-w-[220px] truncate text-xs text-muted-foreground" title={row.failure_reason}>
              {row.failure_reason}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'sent_at',
      label: 'When',
      render: (row: EmailLogEntry) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.sent_at), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <TableFilters
        searchPlaceholder="Search by recipient or subject..."
        searchValue={search}
        onSearchChange={handleSearchChange}
        filters={[{ key: 'status', label: 'Status', options: STATUS_OPTIONS }]}
        onFilterChange={handleFilterChange}
        filterValues={{ status }}
      />
      <DataTable<EmailLogEntry>
        columns={columns}
        data={data}
        loading={isPending}
        emptyMessage="No emails logged yet"
        emptyIcon={Mail}
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
