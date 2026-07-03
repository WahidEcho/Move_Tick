'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Refreshes the server component every `seconds` while a payment is still
 * pending, but only up to `maxAttempts` so it never spins forever. Once the
 * budget is exhausted it stops polling and shows a manual "Check again" control
 * (the server component reconciles with XPay directly on every render).
 */
export function AutoRefresh({
  seconds = 3,
  active = true,
  maxAttempts = 14,
}: {
  seconds?: number;
  active?: boolean;
  maxAttempts?: number;
}) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  const exhausted = attempts >= maxAttempts;

  useEffect(() => {
    if (!active || exhausted) return;
    const id = setInterval(() => {
      setAttempts((a) => a + 1);
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds, active, exhausted]);

  const checkAgain = useCallback(() => {
    setAttempts(0);
    router.refresh();
  }, [router]);

  if (!active || !exhausted) return null;

  return (
    <div className="mb-4 w-full rounded-lg border border-border bg-muted/40 p-4 text-center">
      <p className="text-sm text-muted-foreground">
        This is taking longer than usual. If you completed the payment, your
        ticket will still be issued and emailed to you shortly.
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={checkAgain}>
        Check again
      </Button>
    </div>
  );
}
