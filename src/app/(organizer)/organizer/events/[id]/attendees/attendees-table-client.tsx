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
import type { RegistrationWithJoins } from '@/services/attendees.service';
import { Users, CheckCircle, XCircle, Eye, Ban } from 'lucide-react';
import { formatDate, getPresenceColor, getPresenceLabel } from '@/lib/helpers';
import {
  approveAttendeeAction,
  rejectAttendeeAction,
  cancelRegistrationAction,
  promoteFromWaitlistAction,
} from './actions';

const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Waitlisted', value: 'waitlisted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PRESENCE_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Inside', value: 'inside_event' },
  { label: 'Left', value: 'outside_event' },
  { label: 'No-show', value: 'never_arrived' },
];

interface AttendeesTableClientProps {
  result: PaginatedResult<RegistrationWithJoins>;
  eventId: string;
  searchParams: { status: string; presence: string; search: string; page: string };
  tabs: readonly { value: string; label: string; status: string; presence: string }[];
  statusColors: Record<string, string>;
}

export function AttendeesTableClient({
  result,
  eventId,
  searchParams,
  tabs,
  statusColors,
}: AttendeesTableClientProps) {
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
      return `/organizer/events/${eventId}/attendees?${params.toString()}`;
    },
    [eventId, urlSearchParams]
  );

  const handleSearchChange = (value: string) => {
    startTransition(() =>
      router.push(
        buildUrl({
          search: value,
          status: searchParams.status,
          presence: searchParams.presence,
          page: '1',
        })
      )
    );
  };

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() =>
      router.push(
        buildUrl({
          [key]: value,
          search: searchParams.search,
          page: '1',
        })
      )
    );
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() => router.push(buildUrl({ page: String(newPage) })));
  };

  const handleApprove = async (registrationId: string) => {
    const { success } = await approveAttendeeAction(registrationId, eventId);
    if (success) router.refresh();
  };

  const handleReject = async (registrationId: string) => {
    const { success } = await rejectAttendeeAction(registrationId, eventId);
    if (success) router.refresh();
  };

  const handleCancel = async (registrationId: string) => {
    const { success } = await cancelRegistrationAction(registrationId, eventId);
    if (success) router.refresh();
  };

  const handlePromote = async (registrationId: string) => {
    const { success } = await promoteFromWaitlistAction(registrationId, eventId);
    if (success) router.refresh();
  };

  const profile = (r: RegistrationWithJoins) =>
    r.profile as { id: string; full_name: string | null; email: string; phone: string | null } | null;

  const columns: DataTableColumn<RegistrationWithJoins>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <Link
          href={`/organizer/events/${eventId}/attendees/${profile(row)?.id ?? row.user_id}`}
          className="font-medium hover:underline"
        >
          {profile(row)?.full_name ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </Link>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => (
        <span className="text-muted-foreground">
          {profile(row)?.email ?? '—'}
        </span>
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
          className={
            statusColors[row.status] ?? 'bg-muted text-muted-foreground'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'presence',
      label: 'Presence',
      render: (row) => (
        <Badge
          variant="outline"
          className={
            getPresenceColor(row.presence ?? 'never_arrived') ??
            'bg-muted text-muted-foreground'
          }
        >
          {getPresenceLabel(row.presence ?? 'never_arrived')}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Registered Date',
      render: (row) => (
        <span className="text-muted-foreground">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            asChild
          >
            <Link
              href={`/organizer/events/${eventId}/attendees/${profile(row)?.id ?? row.user_id}`}
            >
              <Eye className="size-3.5" />
              View
            </Link>
          </Button>
          {(row.status === 'pending' || row.status === 'waitlisted') && (
            <>
              {row.status === 'waitlisted' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => handlePromote(row.id)}
                >
                  <CheckCircle className="size-3.5" />
                  Promote
                </Button>
              )}
              {row.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => handleApprove(row.id)}
                >
                  <CheckCircle className="size-3.5" />
                  Approve
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-destructive hover:text-destructive"
                onClick={() => handleReject(row.id)}
              >
                <XCircle className="size-3.5" />
                Reject
              </Button>
            </>
          )}
          {['approved', 'confirmed'].includes(row.status) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-destructive hover:text-destructive"
              onClick={() => handleCancel(row.id)}
            >
              <Ban className="size-3.5" />
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b">
        {tabs.map((tab) => {
          const href = buildUrl({
            status: tab.status,
            presence: tab.presence,
            search: searchParams.search,
            page: '1',
          });
          const isActive =
            searchParams.status === tab.status &&
            searchParams.presence === tab.presence;
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
        searchPlaceholder="Search by name or email..."
        searchValue={searchParams.search}
        onSearchChange={handleSearchChange}
        filters={[
          { key: 'status', label: 'Status', options: STATUS_FILTER_OPTIONS },
          { key: 'presence', label: 'Presence', options: PRESENCE_FILTER_OPTIONS },
        ]}
        onFilterChange={handleFilterChange}
        filterValues={{
          status: searchParams.status,
          presence: searchParams.presence,
        }}
      />

      <DataTable<RegistrationWithJoins>
        columns={columns}
        data={data}
        loading={isPending}
        emptyMessage="No attendees found"
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
