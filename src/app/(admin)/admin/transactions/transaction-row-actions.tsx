'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreVertical,
  Calculator,
  Percent,
  BanknoteArrowUp,
  Send,
  Download,
  History,
  Flag,
  StickyNote,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ReasonDialog } from '@/components/layout/reason-dialog';
import { uploadPayoutProof } from '@/lib/storage';
import type { SettlementListRow } from '@/services/settlements.service';
import type { OrganizerPayoutRecord } from '@/types/database.types';
import {
  setCommissionAction,
  recordPaymentAction,
  resendStatementAction,
  markDisputedAction,
  addNoteAction,
  getPayoutHistoryAction,
  downloadStatementAction,
  getPayoutProofSignedUrlAction,
} from './actions';

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function TransactionRowActions({ row }: { row: SettlementListRow }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [calcOpen, setCalcOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [resending, setResending] = useState(false);
  const [history, setHistory] = useState<OrganizerPayoutRecord[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [proofUrls, setProofUrls] = useState<Record<string, string | null>>({});

  const settlement = row.settlement;
  // Commission auto-locks the moment the first paid sale lands.
  const commissionAutoLocked = row.computed.paidTicketCount > 0;

  const [commissionForm, setCommissionForm] = useState({
    isCustomCommissionEnabled: false,
    customCommissionPercentage: '' as string,
    customFixedFeeEgp: '' as string,
    isLocked: false,
    reasonPreset: '',
    reasonText: '',
  });
  const [commissionError, setCommissionError] = useState<string | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    amountPaid: String(settlement?.remaining_amount_due ?? row.computed.organizerNetProfit),
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: '',
    paymentReference: '',
    internalNotes: '',
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);

  const [noteText, setNoteText] = useState('');

  const refresh = () => startTransition(() => router.refresh());

  const commissionReason =
    commissionForm.reasonPreset === 'other'
      ? commissionForm.reasonText.trim()
      : commissionForm.reasonPreset;

  const handleSaveCommission = async () => {
    setSaving(true);
    setCommissionError(null);
    try {
      const result = await setCommissionAction({
        eventId: row.event.id,
        isCustomCommissionEnabled: commissionForm.isCustomCommissionEnabled,
        customCommissionPercentage: commissionForm.customCommissionPercentage
          ? Number(commissionForm.customCommissionPercentage)
          : null,
        customFixedFeeEgp: commissionForm.customFixedFeeEgp ? Number(commissionForm.customFixedFeeEgp) : null,
        isLocked: commissionForm.isLocked,
        reason: commissionReason,
      });
      if (!result.success) {
        setCommissionError(('message' in result && result.message) || 'Failed to save commission');
        return;
      }
      setCommissionOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async () => {
    setSaving(true);
    try {
      let proofPath: string | null = null;
      if (proofFile) {
        setProofUploading(true);
        const result = await uploadPayoutProof(proofFile, row.event.id);
        proofPath = result.path;
        setProofUploading(false);
      }
      await recordPaymentAction({
        eventId: row.event.id,
        amountPaid: Number(paymentForm.amountPaid),
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        paymentReference: paymentForm.paymentReference || null,
        proofOfPaymentUrl: proofPath,
        internalNotes: paymentForm.internalNotes || null,
      });
      setPaymentOpen(false);
      setProofFile(null);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    if (!settlement) return;
    setResending(true);
    try {
      await resendStatementAction(settlement.id);
      refresh();
    } finally {
      setResending(false);
    }
  };

  const handleDownload = async () => {
    if (!settlement) return;
    setDownloading(true);
    try {
      const bundle = await downloadStatementAction(settlement.id);
      if (bundle) {
        const blob = base64ToBlob(bundle.base64, 'application/pdf');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = bundle.filename;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } finally {
      setDownloading(false);
    }
  };

  const openHistory = async () => {
    if (!settlement) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    const records = await getPayoutHistoryAction(settlement.id);
    setHistory(records);
    setHistoryLoading(false);
  };

  const viewProof = async (path: string) => {
    if (proofUrls[path] !== undefined) return;
    const url = await getPayoutProofSignedUrlAction(path);
    setProofUrls((prev) => ({ ...prev, [path]: url }));
  };

  const handleSaveNote = async () => {
    if (!settlement || !noteText.trim()) return;
    setSaving(true);
    try {
      await addNoteAction(settlement.id, noteText.trim());
      setNoteText('');
      setNoteOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
          <MoreVertical className="size-4" />
          <span className="sr-only">Transaction actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setCalcOpen(true)}>
            <Calculator className="size-4 shrink-0" />
            View calculation
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCommissionOpen(true)}>
            <Percent className="size-4 shrink-0" />
            Set commission
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPaymentOpen(true)}>
            <BanknoteArrowUp className="size-4 shrink-0" />
            Record payment
          </DropdownMenuItem>
          {settlement && (
            <>
              <DropdownMenuItem disabled={resending} onClick={handleResend}>
                <Send className="size-4 shrink-0" />
                Resend statement
              </DropdownMenuItem>
              <DropdownMenuItem disabled={downloading} onClick={handleDownload}>
                <Download className="size-4 shrink-0" />
                Download statement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openHistory}>
                <History className="size-4 shrink-0" />
                Payout history
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDisputeOpen(true)}>
                <Flag className="size-4 shrink-0" />
                Mark disputed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setNoteOpen(true)}>
                <StickyNote className="size-4 shrink-0" />
                Add internal note
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View calculation */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{row.event.title} — calculation</DialogTitle>
            <DialogDescription>{row.organization.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <Row label="Paid ticket count" value={String(row.computed.paidTicketCount)} />
            <Row label="Free ticket count" value={String(row.computed.freeTicketCount)} />
            <Row label="Gross ticket revenue" value={`${money(row.computed.grossTicketRevenue)} EGP`} bold />
            <Row label="Refunds" value={`${money(row.computed.refundAmount)} EGP`} />
            <Row label="Discounts (informational)" value={`${money(row.computed.discountAmount)} EGP`} />
            <div className="my-2 border-t border-border" />
            <Row label="Commission source" value={<Badge variant="outline">{row.computed.commissionSource.replace(/_/g, ' ')}</Badge>} />
            <Row label={`Commission (${row.computed.appliedCommissionPercentage}%)`} value={`${money(row.computed.percentageCommissionAmount)} EGP`} />
            <Row
              label={`Fixed fee (${money(row.computed.fixedFeePerPaidTicket)} × ${row.computed.paidTicketCount})`}
              value={`${money(row.computed.fixedTicketFeeAmount)} EGP`}
            />
            <Row label="XPay gateway fees (est., platform-absorbed)" value={row.computed.paymentGatewayFees != null ? `${money(row.computed.paymentGatewayFees)} EGP` : 'Not available'} />
            <Row label="Taxes" value={row.computed.taxesAmount != null ? `${money(row.computed.taxesAmount)} EGP` : 'Not available'} />
            <Row label="Total platform fees" value={`${money(row.computed.totalPlatformFees)} EGP`} bold />
            <div className="my-2 border-t border-border" />
            <Row label="Organizer net profit" value={`${money(row.computed.organizerNetProfit)} EGP`} bold />
            <Row label="Amount paid to organizer" value={`${money(settlement?.amount_paid_to_organizer ?? 0)} EGP`} />
            <Row label="Remaining amount due" value={`${money(settlement?.remaining_amount_due ?? row.computed.organizerNetProfit)} EGP`} bold />
            {settlement?.internal_notes && (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Internal notes</p>
                <p className="whitespace-pre-wrap text-sm">{settlement.internal_notes}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalcOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set commission */}
      <Dialog open={commissionOpen} onOpenChange={setCommissionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set commission — {row.event.title}</DialogTitle>
            <DialogDescription>
              Overrides the organization/platform default for this event only. Currently applying{' '}
              <strong>{row.computed.appliedCommissionPercentage}%</strong> + {money(row.computed.fixedFeePerPaidTicket)} EGP fixed fee
              ({row.computed.commissionSource.replace(/_/g, ' ')}).
            </DialogDescription>
          </DialogHeader>
          {commissionAutoLocked ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p className="font-medium">Commission is locked</p>
              <p className="mt-1 text-muted-foreground">
                This event has taken paid sales, so its commission terms froze automatically — the rate buyers
                purchased under can&rsquo;t be changed retroactively.
              </p>
            </div>
          ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Enable custom commission for this event</p>
              <Switch
                checked={commissionForm.isCustomCommissionEnabled}
                onCheckedChange={(v) => setCommissionForm((f) => ({ ...f, isCustomCommissionEnabled: v }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Custom commission %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  placeholder="Inherit"
                  value={commissionForm.customCommissionPercentage}
                  onChange={(e) => setCommissionForm((f) => ({ ...f, customCommissionPercentage: e.target.value }))}
                  disabled={!commissionForm.isCustomCommissionEnabled}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Custom fixed fee (EGP)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Inherit"
                  value={commissionForm.customFixedFeeEgp}
                  onChange={(e) => setCommissionForm((f) => ({ ...f, customFixedFeeEgp: e.target.value }))}
                  disabled={!commissionForm.isCustomCommissionEnabled}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason for this change (required)</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={commissionForm.reasonPreset}
                onChange={(e) => setCommissionForm((f) => ({ ...f, reasonPreset: e.target.value }))}
              >
                <option value="">Select a reason…</option>
                <option value="Contract amendment agreed with the organizer (mutual consent — Egyptian Civil Code art. 147)">
                  Contract amendment agreed with organizer
                </option>
                <option value="Promotional / launch rate agreed in writing with the organizer">
                  Promotional / launch rate (agreed in writing)
                </option>
                <option value="Volume-based rate per the signed organizer agreement">
                  Volume-based rate per signed agreement
                </option>
                <option value="Reduced rate for charity / non-profit event">Charity / non-profit event rate</option>
                <option value="Correction of a data-entry error in the original commission setup">
                  Correction of data-entry error
                </option>
                <option value="other">Other (describe below)</option>
              </select>
              {commissionForm.reasonPreset === 'other' && (
                <Textarea
                  rows={2}
                  placeholder="Describe the reason — stored permanently in the audit log"
                  value={commissionForm.reasonText}
                  onChange={(e) => setCommissionForm((f) => ({ ...f, reasonText: e.target.value }))}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Stored permanently in the audit log as evidence of the agreed contract variation.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Lock commission now</p>
                <p className="text-xs text-muted-foreground">
                  Locks immediately. Otherwise it locks automatically at the first paid sale.
                </p>
              </div>
              <Switch checked={commissionForm.isLocked} onCheckedChange={(v) => setCommissionForm((f) => ({ ...f, isLocked: v }))} />
            </div>
            {commissionError && <p className="text-sm text-destructive">{commissionError}</p>}
          </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommissionOpen(false)} disabled={saving}>
              {commissionAutoLocked ? 'Close' : 'Cancel'}
            </Button>
            {!commissionAutoLocked && (
              <Button onClick={handleSaveCommission} disabled={saving || !commissionReason}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save commission
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record payment */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment — {row.event.title}</DialogTitle>
            <DialogDescription>
              Only record this after the payout has actually been sent outside the platform — the organizer&rsquo;s
              settlement statement is emailed immediately once you save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Amount paid (EGP)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={paymentForm.amountPaid}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amountPaid: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment date</Label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Input
                  placeholder="Bank transfer, cash..."
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reference / transaction ID</Label>
              <Input
                value={paymentForm.paymentReference}
                onChange={(e) => setPaymentForm((f) => ({ ...f, paymentReference: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Internal notes</Label>
              <Textarea
                rows={2}
                value={paymentForm.internalNotes}
                onChange={(e) => setPaymentForm((f) => ({ ...f, internalNotes: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Proof of payment (optional)</Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-muted/30">
                <Paperclip className="size-4 shrink-0" />
                {proofFile ? proofFile.name : 'Attach image or PDF'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={saving || !paymentForm.amountPaid || !paymentForm.paymentMethod}>
              {(saving || proofUploading) && <Loader2 className="size-4 animate-spin" />}
              Record payment & send statement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout history */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payout history — {row.event.title}</DialogTitle>
          </DialogHeader>
          {historyLoading || !history ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((p) => (
                <div key={p.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{money(Number(p.amount_paid))} EGP</span>
                    <span className="text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {p.payment_method}
                    {p.payment_reference ? ` · Ref: ${p.payment_reference}` : ''}
                  </p>
                  {p.internal_notes && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{p.internal_notes}</p>}
                  {p.proof_of_payment_url && (
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-primary underline"
                      onClick={() => viewProof(p.proof_of_payment_url as string)}
                    >
                      {proofUrls[p.proof_of_payment_url] ? (
                        <a href={proofUrls[p.proof_of_payment_url] ?? undefined} target="_blank" rel="noreferrer">
                          Open proof of payment
                        </a>
                      ) : (
                        'View proof of payment'
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add internal note */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add internal note</DialogTitle>
            <DialogDescription>Visible to admins only — never shown to the organizer.</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add context..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote} disabled={saving || !noteText.trim()}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={disputeOpen}
        onOpenChange={setDisputeOpen}
        title={`Mark ${row.event.title} disputed?`}
        description="Flags this settlement as disputed until resolved manually."
        confirmLabel="Mark disputed"
        variant="destructive"
        reasonRequired
        onConfirm={async (reason) => {
          if (!settlement) return;
          await markDisputedAction(settlement.id, reason);
          refresh();
        }}
      />
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-semibold' : ''}>{value}</span>
    </div>
  );
}
