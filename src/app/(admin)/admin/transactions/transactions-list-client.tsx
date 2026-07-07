'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { DataTable } from '@/components/tables/data-table';
import { TableFilters } from '@/components/tables/table-filters';
import { Pagination } from '@/components/tables/pagination';
import { Badge } from '@/components/ui/badge';
import { Wallet } from 'lucide-react';
import { TransactionRowActions } from './transaction-row-actions';
import type { SettlementListRow } from '@/services/settlements.service';
import type { PaginatedResult } from '@/types/domain.types';

const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending calculation', value: 'pending_calculation' },
  { label: 'Ready for payment', value: 'ready_for_payment' },
  { label: 'Partially paid', value: 'partially_paid' },
  { label: 'Paid', value: 'paid' },
  { label: 'Invoice sent', value: 'invoice_sent' },
  { label: 'Completed', value: 'completed' },
  { label: 'Disputed', value: 'disputed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const STATUS_LABELS: Record<string, string> = {
  pending_calculation: 'Pending calculation',
  ready_for_payment: 'Ready for payment',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  invoice_sent: 'Invoice sent',
  completed: 'Completed',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending_calculation: 'bg-muted text-muted-foreground',
  ready_for_payment: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  partially_paid: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  invoice_sent: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  disputed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-muted text-muted-foreground',
};

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface TransactionsListClientProps {
  result: PaginatedResult<SettlementListRow>;
  searchParams: { search?: string; organizationId?: string; status?: string; page?: string };
  organizationOptions: { label: string; value: string }[];
}

export function TransactionsListClient({ result, searchParams, organizationOptions }: TransactionsListClientProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { data, total, page, page_size, total_pages } = result;
  const search = searchParams.search ?? '';
  const organizationId = searchParams.organizationId ?? '';
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
      return `/admin/transactions?${params.toString()}`;
    },
    [urlSearchParams]
  );

  const handleSearchChange = (value: string) => {
    startTransition(() => router.push(buildUrl({ search: value, organizationId, status })));
  };
  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => router.push(buildUrl({ [key]: value, search })));
  };
  const handlePageChange = (newPage: number) => {
    startTransition(() => router.push(buildUrl({ page: newPage })));
  };

  const columns = [
    {
      key: 'event',
      label: 'Event',
      render: (row: SettlementListRow) => (
        <div>
          <p className="font-medium">{row.event.title}</p>
          <p className="text-xs text-muted-foreground">{new Date(row.event.start_date).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'organization',
      label: 'Organization',
      render: (row: SettlementListRow) => row.organization.name,
    },
    {
      key: 'tickets',
      label: 'Paid / Free',
      render: (row: SettlementListRow) => `${row.computed.paidTicketCount} / ${row.computed.freeTicketCount}`,
    },
    {
      key: 'gross',
      label: 'Gross (EGP)',
      render: (row: SettlementListRow) => money(row.computed.grossTicketRevenue),
    },
    {
      key: 'fees',
      label: 'Fees (EGP)',
      render: (row: SettlementListRow) => money(row.computed.totalPlatformFees),
    },
    {
      key: 'net',
      label: 'Net profit (EGP)',
      render: (row: SettlementListRow) => money(row.computed.organizerNetProfit),
    },
    {
      key: 'paid',
      label: 'Paid (EGP)',
      render: (row: SettlementListRow) => money(row.settlement?.amount_paid_to_organizer ?? 0),
    },
    {
      key: 'remaining',
      label: 'Remaining (EGP)',
      render: (row: SettlementListRow) =>
        money(row.settlement?.remaining_amount_due ?? row.computed.organizerNetProfit),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: SettlementListRow) => {
        const s = row.settlement?.settlement_status ?? 'pending_calculation';
        return (
          <Badge variant="outline" className={STATUS_BADGE_CLASSES[s] ?? 'bg-muted text-muted-foreground'}>
            {STATUS_LABELS[s] ?? s}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      className: 'w-10 text-right',
      render: (row: SettlementListRow) => <TransactionRowActions row={row} />,
    },
  ];

  return (
    <div className="space-y-4">
      <TableFilters
        searchPlaceholder="Search by event name..."
        searchValue={search}
        onSearchChange={handleSearchChange}
        filters={[
          { key: 'organizationId', label: 'Organization', options: [{ label: 'All', value: '' }, ...organizationOptions] },
          { key: 'status', label: 'Status', options: STATUS_FILTER_OPTIONS },
        ]}
        onFilterChange={handleFilterChange}
        filterValues={{ organizationId, status }}
      />
      <DataTable<SettlementListRow>
        columns={columns}
        data={data}
        loading={isPending}
        emptyMessage="No transactions found"
        emptyIcon={Wallet}
      />
      {total_pages > 1 && (
        <Pagination page={currentPage} totalPages={total_pages} onPageChange={handlePageChange} pageSize={page_size} total={total} />
      )}
    </div>
  );
}
