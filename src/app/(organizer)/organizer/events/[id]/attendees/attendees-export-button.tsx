'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportAttendeesAction } from './actions';
import { downloadCSV } from '@/lib/helpers';

interface AttendeesExportButtonProps {
  eventId: string;
}

export function AttendeesExportButton({ eventId }: AttendeesExportButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { csv, error } = await exportAttendeesAction(eventId);
      if (error) throw new Error(error);
      if (csv) downloadCSV(csv, `event-${eventId}-attendees.csv`);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleExport}
      disabled={loading}
      className="gap-1.5"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <FileDown className="size-4" />
      )}
      Export CSV
    </Button>
  );
}
