'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import Link from 'next/link';
import {
  DataTable,
  type DataTableColumn,
} from '@/components/tables/data-table';
import { TableFilters } from '@/components/tables/table-filters';
import { Pagination } from '@/components/tables/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PaginatedResult } from '@/types/domain.types';
import type { EventInvitationWithTicketType as InvitationType } from '@/services/invitations.service';
import { Mail, RefreshCw, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/helpers';
import { resendInvitation } from './actions';

interface InvitationsTableClientProps {
  result: PaginatedResult<InvitationType>;
  eventId: string;
  searchParams: { status: string; search: string; page: string };
  tabs: readonly { value: string; label: string }[];
  statusColors: Record<string, string>;
}

const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Sent', value: 'sent' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Declined', value: 'declined' },
  { label: 'Failed', value: 'failed' },
];

export function InvitationsTableClient({
  result,
  eventId,
  searchParams,
  tabs,
  statusColors,
}: InvitationsTableClientProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { data, total, page, page_size, total_pages } = result;
  const currentPage = Number(searchParams.page) || 1;

  const buildUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(urlSearchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === '') params.delete(key);
        else params.set(key, value);
      });
      return `/organizer/events/${eventId}/invitations?${params.toString()}`;
    },
    [eventId, urlSearchParams]
  );

  const handleSearchChange = (value: string) => {
    startTransition(() =>
      router.push(buildUrl({ search: value, status: searchParams.status, page: '1' }))
    );
  };

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() =>
      router.push(buildUrl({ [key]: value, search: searchParams.search, page: '1' }))
    );
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() =>
      router.push(buildUrl({ page: String(newPage) }))
    );
  };

  const handleResend = async (invitationId: string) => {
    const { success } = await resendInvitation(invitationId, eventId);
    if (success) router.refresh();
  };

  const columns: DataTableColumn<InvitationType>[] = [
    {
      key: 'invitee_name',
      label: 'Name',
      render: (row) => (
        <span className="font-medium">
          {row.invitee_name || <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'invitee_email',
      label: 'Email',
      render: (row) => (
        <span className="text-muted-foreground">{row.invitee_email}</span>
      ),
    },
    {
      key: 'invitee_company',
      label: 'Company',
      render: (row) => (
        <span>{row.invitee_company || <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      key: 'ticket_type',
      label: 'Ticket Type',
      render: (row) => (
        <span>
          {(row.ticket_type as { name?: string } | null)?.name ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge
          variant="outline"
          className={statusColors[row.status] ?? 'bg-muted text-muted-foreground'}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'sent_at',
      label: 'Sent Date',
      render: (row) => (
        <span className="text-muted-foreground">
          {row.sent_at ? formatDate(row.sent_at) : '—'}
        </span>
      ),
    },
    {
      key: 'responded_at',
      label: 'Responded Date',
      render: (row) => (
        <span className="text-muted-foreground">
          {row.responded_at ? formatDate(row.responded_at) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1"
          onClick={() => handleResend(row.id)}
        >
          <RefreshCw className="size-3.5" />
          Resend
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b">
        {tabs.map((tab) => {
          const href = buildUrl({
            status: tab.value,
            search: searchParams.search,
          });
          const isActive = searchParams.status === tab.value;
          return (
            <Link
              key={tab.value || 'all'}
              href={href}
              className={`inline-flex items-center rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <TableFilters
        searchPlaceholder="Search by name, email, or company..."
        searchValue={searchParams.search}
        onSearchChange={handleSearchChange}
        filters={[{ key: 'status', label: 'Status', options: STATUS_FILTER_OPTIONS }]}
        onFilterChange={handleFilterChange}
        filterValues={{ status: searchParams.status }}
      />

      <DataTable<InvitationType>
        columns={columns}
        data={data}
        loading={isPending}
        emptyMessage="No invitations found"
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
