'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X } from 'lucide-react';
import { respondToRsvp, type RsvpResponse } from './actions';

export function RsvpActions({
  token,
  status,
}: {
  token: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<RsvpResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (response: RsvpResponse) => {
    setError(null);
    setPending(response);
    const result = await respondToRsvp(token, response);
    if (!result.success) {
      setError(result.message ?? 'Something went wrong');
      setPending(null);
      return;
    }
    router.refresh();
    setPending(null);
  };

  const accepted = status === 'accepted';
  const declined = status === 'declined';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        {!accepted && (
          <Button
            className="sm:min-w-44"
            onClick={() => respond('accepted')}
            disabled={pending !== null}
          >
            {pending === 'accepted' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {declined ? "I'll come after all" : "Yes, I'll be there"}
          </Button>
        )}
        {!declined && (
          <Button
            variant="outline"
            className="sm:min-w-44"
            onClick={() => respond('declined')}
            disabled={pending !== null}
          >
            {pending === 'declined' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <X className="size-4" />
            )}
            {accepted ? "I can't make it anymore" : "Can't make it"}
          </Button>
        )}
      </div>
      {error && (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
