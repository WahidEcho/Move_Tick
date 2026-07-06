'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCSV } from '@/lib/helpers';
import { exportEventsAction } from './actions';

export function EventsExportButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { csv, error } = await exportEventsAction();
      if (error) throw new Error(error);
      if (csv) downloadCSV(csv, 'events.csv');
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
