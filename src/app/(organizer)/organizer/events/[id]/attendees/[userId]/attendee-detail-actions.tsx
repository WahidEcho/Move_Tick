'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  Ban,
  ArrowUp,
  Send,
  Loader2,
} from 'lucide-react';
import {
  approveAttendeeAction,
  rejectAttendeeAction,
  cancelRegistrationAction,
  promoteFromWaitlistAction,
} from '../actions';

interface AttendeeDetailActionsProps {
  eventId: string;
  userId: string;
  registrationId: string;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  isWaitlisted: boolean;
}

export function AttendeeDetailActions({
  eventId,
  registrationId,
  canApprove,
  canReject,
  canCancel,
  isWaitlisted,
}: AttendeeDetailActionsProps) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const { success } = await approveAttendeeAction(registrationId, eventId);
      if (success) router.refresh();
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      const { success } = await rejectAttendeeAction(registrationId, eventId);
      if (success) router.refresh();
    } finally {
      setRejecting(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { success } = await cancelRegistrationAction(registrationId, eventId);
      if (success) router.refresh();
    } finally {
      setCancelling(false);
    }
  };

  const handlePromote = async () => {
    setPromoting(true);
    try {
      const { success } = await promoteFromWaitlistAction(registrationId, eventId);
      if (success) router.refresh();
    } finally {
      setPromoting(false);
    }
  };

  const handleResendTicket = () => {
    // Placeholder: Integrate with ticket email service when available
    // eslint-disable-next-line no-console
    console.log('Resend ticket for', registrationId);
  };

  return (
    <div className="flex flex-col gap-2">
      {canApprove && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleApprove}
          disabled={approving}
        >
          {approving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle className="size-4" />
          )}
          Approve
        </Button>
      )}
      {isWaitlisted && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handlePromote}
          disabled={promoting}
        >
          {promoting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4" />
          )}
          Promote from Waitlist
        </Button>
      )}
      {canReject && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={handleReject}
          disabled={rejecting}
        >
          {rejecting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <XCircle className="size-4" />
          )}
          Reject
        </Button>
      )}
      {canCancel && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Ban className="size-4" />
          )}
          Cancel Registration
        </Button>
      )}
      {!canApprove && !canReject && !canCancel && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleResendTicket}
        >
          <Send className="size-4" />
          Resend Ticket
        </Button>
      )}
    </div>
  );
}
