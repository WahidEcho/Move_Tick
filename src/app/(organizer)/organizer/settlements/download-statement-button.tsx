'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadOrganizerStatementAction } from './actions';

function base64ToBlob(base64: string, mime: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function DownloadStatementButton({ settlementId }: { settlementId: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const bundle = await downloadOrganizerStatementAction(settlementId);
      if (bundle) {
        const blob = base64ToBlob(bundle.base64, 'application/pdf');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = bundle.filename;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleDownload} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      Statement
    </Button>
  );
}
