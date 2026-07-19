'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { requestRefundAction } from './actions';

interface RefundRequestButtonProps {
  paymentId: string;
  amountLabel: string;
  refundState: 'none' | 'pending' | 'approved' | 'rejected';
}

/**
 * Attendee-side entry to the refund flow: a request with a reason, decided by
 * the Move Beyond team. Shows the request's current state after submission.
 */
export function RefundRequestButton({ paymentId, amountLabel, refundState }: RefundRequestButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (refundState === 'pending') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
        <span>Refund request under review</span>
        <Badge variant="secondary">Pending</Badge>
      </div>
    );
  }
  if (refundState === 'approved') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
        <span>This purchase was refunded</span>
        <Badge>Refunded</Badge>
      </div>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestRefundAction(paymentId, reason);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        <RotateCcw className="size-4" />
        Request a refund
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a refund</DialogTitle>
            <DialogDescription>
              This asks the Move Beyond team to refund your {amountLabel} purchase. If approved, the money goes
              back to your original payment method and the ticket(s) from this purchase stop working.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="Tell us why you need a refund…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {refundState === 'rejected' && (
            <p className="text-xs text-muted-foreground">
              A previous request wasn&rsquo;t approved — you can submit a new one if circumstances changed.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || !reason.trim()}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
