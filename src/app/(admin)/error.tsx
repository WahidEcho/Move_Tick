'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="max-w-md text-muted-foreground">
        This page hit an unexpected error. If you&apos;ve had this tab open for a while, a fresh
        reload usually fixes it — we ship updates often.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <Button variant="outline" onClick={() => window.location.assign('/admin')}>
          Back to dashboard
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground/60">Reference: {error.digest}</p>
      )}
    </div>
  );
}
