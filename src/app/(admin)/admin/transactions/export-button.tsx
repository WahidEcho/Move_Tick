'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCSV } from '@/lib/helpers';
import { exportTransactionsAction } from './actions';

interface TransactionsExportButtonProps {
  searchParams: { search?: string; organizationId?: string; status?: string };
}

export function TransactionsExportButton({ searchParams }: TransactionsExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { csv } = await exportTransactionsAction(searchParams);
      if (csv) downloadCSV(csv, 'transactions.csv');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleExport} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      Export CSV
    </Button>
  );
}
