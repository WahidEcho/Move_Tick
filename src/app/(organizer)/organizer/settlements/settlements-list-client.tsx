'use client';

import { DataTable } from '@/components/tables/data-table';
import { Badge } from '@/components/ui/badge';
import { Wallet } from 'lucide-react';
import { DownloadStatementButton } from './download-statement-button';
import type { OrganizerSettlementRow } from '@/services/settlements.service';

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

export function SettlementsListClient({ settlements }: { settlements: OrganizerSettlementRow[] }) {
  const columns = [
    {
      key: 'event',
      label: 'Event',
      render: (row: OrganizerSettlementRow) => (
        <div>
          <p className="font-medium">{row.event.title}</p>
          <p className="text-xs text-muted-foreground">{new Date(row.event.start_date).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'gross',
      label: 'Gross revenue (EGP)',
      render: (row: OrganizerSettlementRow) => money(row.gross_ticket_revenue),
    },
    {
      key: 'commission',
      label: 'Commission',
      render: (row: OrganizerSettlementRow) => `${row.applied_commission_percentage}%`,
    },
    {
      key: 'fixed_fee',
      label: 'Fixed fees (EGP)',
      render: (row: OrganizerSettlementRow) => money(row.fixed_ticket_fee_amount),
    },
    {
      key: 'fees',
      label: 'Total fees (EGP)',
      render: (row: OrganizerSettlementRow) => money(row.total_platform_fees),
    },
    {
      key: 'net',
      label: 'Net profit (EGP)',
      render: (row: OrganizerSettlementRow) => money(row.organizer_net_profit),
    },
    {
      key: 'paid',
      label: 'Amount paid (EGP)',
      render: (row: OrganizerSettlementRow) => money(row.amount_paid_to_organizer),
    },
    {
      key: 'remaining',
      label: 'Remaining (EGP)',
      render: (row: OrganizerSettlementRow) => money(row.remaining_amount_due),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: OrganizerSettlementRow) => (
        <Badge variant="outline" className={STATUS_BADGE_CLASSES[row.settlement_status] ?? 'bg-muted text-muted-foreground'}>
          {STATUS_LABELS[row.settlement_status] ?? row.settlement_status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-10 text-right',
      render: (row: OrganizerSettlementRow) => <DownloadStatementButton settlementId={row.settlement_id} />,
    },
  ];

  return (
    <DataTable<OrganizerSettlementRow>
      columns={columns}
      data={settlements}
      emptyMessage="No settlements yet — this appears once one of your events has a paid ticket."
      emptyIcon={Wallet}
    />
  );
}
