import { requireAdmin } from '@/lib/auth';
import { getSettlementsForAdmin } from '@/services/settlements.service';
import { getOrganizations } from '@/services/organizations.service';
import { TransactionsListClient } from './transactions-list-client';
import { TransactionsExportButton } from './export-button';
import type { SettlementStatus } from '@/types/database.types';

interface TransactionsPageProps {
  searchParams: Promise<{
    search?: string;
    organizationId?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const search = params.search ?? '';
  const organizationId = params.organizationId || undefined;
  const status = (params.status || undefined) as SettlementStatus | 'pending_calculation' | undefined;
  const page = Number(params.page) || 1;

  const [result, orgResult] = await Promise.all([
    getSettlementsForAdmin({ search: search || undefined, organizationId, status, page, page_size: 20 }),
    getOrganizations({ page_size: 500 }),
  ]);

  const organizationOptions = orgResult.data.map((o) => ({ label: o.name, value: o.id }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Commission, fees, and organizer settlement status for every event.
          </p>
        </div>
        <TransactionsExportButton searchParams={params} />
      </div>
      <TransactionsListClient result={result} searchParams={params} organizationOptions={organizationOptions} />
    </div>
  );
}
