'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import {
  Upload,
  Download,
  RefreshCw,
  FileDown,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CsvImportDialog } from './csv-import-dialog';
import {
  resendFailedInvitations,
  exportInvitations,
} from './actions';
import { downloadCSV } from '@/lib/helpers';

interface InvitationsActionsBarProps {
  eventId: string;
  orgId: string;
  existingEmails: string[];
  csvTemplateHeaders: string[];
  failedCount?: number;
}

function downloadTemplate(headers: string[]) {
  const row = headers.reduce((acc, h) => ({ ...acc, [h]: '' }), {} as Record<string, string>);
  const csv = Papa.unparse([row]);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'invitees_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function InvitationsActionsBar({
  eventId,
  orgId,
  existingEmails,
  csvTemplateHeaders,
  failedCount = 0,
}: InvitationsActionsBarProps) {
  const router = useRouter();
  const [csvOpen, setCsvOpen] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleResendFailed = async () => {
    setResendLoading(true);
    try {
      const { count, error } = await resendFailedInvitations(eventId);
      if (error) throw new Error(error);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setResendLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const { csv, error } = await exportInvitations(eventId);
      if (error) throw new Error(error);
      if (csv) downloadCSV(csv, `event-${eventId}-invitations.csv`);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCsvOpen(true)}
          className="gap-1.5"
        >
          <Upload className="size-4" />
          Upload CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadTemplate(csvTemplateHeaders)}
          className="gap-1.5"
        >
          <Download className="size-4" />
          Download Template
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleResendFailed}
          disabled={resendLoading || failedCount === 0}
          className="gap-1.5"
        >
          {resendLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Resend Failed
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          disabled={exportLoading}
          className="gap-1.5"
        >
          {exportLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileDown className="size-4" />
          )}
          Export
        </Button>
      </div>

      <CsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        eventId={eventId}
        orgId={orgId}
        existingEmails={existingEmails}
        templateHeaders={csvTemplateHeaders}
      />
    </>
  );
}
