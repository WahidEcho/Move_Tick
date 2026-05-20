'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { respondToInvitation } from './actions';
import { Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface InvitationActionsProps {
  invitationId: string;
  onSuccess?: () => void;
}

export function InvitationActions({ invitationId, onSuccess }: InvitationActionsProps) {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);

  const handleRespond = async (response: 'accepted' | 'declined') => {
    setLoading(response === 'accepted' ? 'accept' : 'decline');
    try {
      await respondToInvitation(invitationId, response);
      toast.success(
        response === 'accepted' ? 'Invitation accepted' : 'Invitation declined'
      );
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(null);
    } finally {
      if (loading) setLoading(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="default"
        onClick={() => handleRespond('accepted')}
        disabled={loading !== null}
      >
        {loading === 'accept' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleRespond('declined')}
        disabled={loading !== null}
      >
        {loading === 'decline' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <X className="size-4" />
        )}
        Decline
      </Button>
    </div>
  );
}
