'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CSVUpload } from '@/components/forms/csv-upload';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { importInvitations } from './actions';
import type { CSVParseResult } from '@/types/domain.types';

const REQUIRED_COLUMNS = ['name', 'email'];

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  orgId: string;
  existingEmails: string[];
  templateHeaders: string[];
}

type Step = 'upload' | 'confirm' | 'results';

export function CsvImportDialog({
  open,
  onOpenChange,
  eventId,
  orgId,
  existingEmails,
  templateHeaders,
}: CsvImportDialogProps) {
  const [step, setStep] = React.useState<Step>('upload');
  const [parseResult, setParseResult] = React.useState<CSVParseResult | null>(
    null
  );
  const [importLoading, setImportLoading] = React.useState(false);
  const [importResult, setImportResult] = React.useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleParsed = React.useCallback((result: CSVParseResult) => {
    setParseResult(result);
    setStep('confirm');
  }, []);

  const handleConfirm = React.useCallback(async () => {
    if (!parseResult || parseResult.valid.length === 0) return;
    setImportLoading(true);
    try {
      const result = await importInvitations(eventId, orgId, parseResult.valid);
      setImportResult(result);
      setStep('results');
    } catch (e) {
      setImportResult({
        created: 0,
        skipped: 0,
        errors: [e instanceof Error ? e.message : 'Import failed'],
      });
      setStep('results');
    } finally {
      setImportLoading(false);
    }
  }, [eventId, orgId, parseResult]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        setStep('upload');
        setParseResult(null);
        setImportResult(null);
      }
      onOpenChange(next);
    },
    [onOpenChange]
  );

  const handleReset = React.useCallback(() => {
    setStep('upload');
    setParseResult(null);
    setImportResult(null);
  }, []);

  const skippedCount =
    parseResult != null
      ? parseResult.duplicates.length + parseResult.already_invited.length
      : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Invitations from CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <CSVUpload
              onParsed={handleParsed}
              requiredColumns={REQUIRED_COLUMNS}
              existingEmails={existingEmails}
              templateHeaders={templateHeaders}
            />
          </div>
        )}

        {step === 'confirm' && parseResult && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="gap-1">
                <CheckCircle className="size-3" />
                Valid: {parseResult.valid.length}
              </Badge>
              {parseResult.invalid.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" />
                  Invalid: {parseResult.invalid.length}
                </Badge>
              )}
              {parseResult.duplicates.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  Duplicates: {parseResult.duplicates.length}
                </Badge>
              )}
              {parseResult.already_invited.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  Already invited: {parseResult.already_invited.length}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {parseResult.valid.length} invitation
              {parseResult.valid.length !== 1 ? 's' : ''} will be created.
              {skippedCount > 0 && ` ${skippedCount} will be skipped.`}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={importLoading || parseResult.valid.length === 0}
              >
                {importLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Confirm Import
              </Button>
            </div>
          </div>
        )}

        {step === 'results' && importResult && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="gap-1">
                <CheckCircle className="size-3" />
                Created: {importResult.created}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                Skipped: {importResult.skipped}
              </Badge>
              {importResult.errors.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" />
                  Errors: {importResult.errors.length}
                </Badge>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <ul className="list-inside list-disc text-sm text-destructive">
                {importResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <Button onClick={handleReset}>Import More</Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
