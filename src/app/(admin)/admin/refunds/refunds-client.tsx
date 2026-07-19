'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Check, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { RefundRequestRow } from '@/services/refunds.service';
import { decideRefundAction } from './actions';

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function RefundsClient({ requests }: { requests: RefundRequestRow[] }) {
  const router = useRouter();
  const [deciding, setDeciding] = useState<{ row: RefundRequestRow; approve: boolean } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = requests.filter((r) => r.status === 'pending');
  const decided = requests.filter((r) => r.status !== 'pending');

  const confirm = async () => {
    if (!deciding) return;
    setBusy(true);
    setError(null);
    try {
      const result = await decideRefundAction(deciding.row.id, deciding.approve, note.trim() || null);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setDeciding(null);
      setNote('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const Table = ({ rows, showActions }: { rows: RefundRequestRow[]; showActions: boolean }) => (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5">Requested</th>
            <th className="px-4 py-2.5">Attendee</th>
            <th className="px-4 py-2.5">Event</th>
            <th className="px-4 py-2.5 text-right">Amount</th>
            <th className="px-4 py-2.5">Reason</th>
            {showActions ? <th className="px-4 py-2.5 text-right">Decide</th> : <th className="px-4 py-2.5">Outcome</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/60 align-top">
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {format(new Date(r.created_at), 'MMM d, h:mm a')}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{r.requester_name ?? 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{r.requester_email}</p>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{r.event_title}</p>
                <p className="text-xs text-muted-foreground">{r.organization_name}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                {money(r.amount_egp)} EGP
              </td>
              <td className="max-w-xs px-4 py-3 text-muted-foreground">
                <p className="line-clamp-3 whitespace-pre-wrap">{r.reason}</p>
              </td>
              {showActions ? (
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <Button size="sm" onClick={() => setDeciding({ row: r, approve: true })}>
                      <Check className="size-4" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeciding({ row: r, approve: false })}>
                      <X className="size-4" />
                      Reject
                    </Button>
                  </div>
                </td>
              ) : (
                <td className="px-4 py-3">
                  <Badge variant={r.status === 'approved' ? 'default' : 'secondary'}>{r.status}</Badge>
                  {r.decision_note && (
                    <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">{r.decision_note}</p>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Awaiting decision ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No refund requests waiting.
          </p>
        ) : (
          <Table rows={pending} showActions />
        )}
      </section>

      {decided.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">History</h2>
          <Table rows={decided} showActions={false} />
        </section>
      )}

      <Dialog open={deciding !== null} onOpenChange={(open) => !open && setDeciding(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {deciding?.approve ? 'Approve refund' : 'Reject refund'} — {money(deciding?.row.amount_egp ?? 0)} EGP
            </DialogTitle>
            <DialogDescription>
              {deciding?.approve
                ? 'Refunds the full amount via XPay and deactivates every ticket from this purchase. The attendee is emailed immediately.'
                : 'The ticket stays valid. The attendee is emailed with your note.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder={deciding?.approve ? 'Optional note to the attendee…' : 'Why is this rejected? (required, sent to the attendee)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeciding(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={deciding?.approve ? 'default' : 'destructive'}
              onClick={confirm}
              disabled={busy || (!deciding?.approve && !note.trim())}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {deciding?.approve ? 'Approve & refund' : 'Reject request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
