'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Refreshes the server component every `seconds` while payment is still pending. */
export function AutoRefresh({ seconds = 3, active = true }: { seconds?: number; active?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds, active]);
  return null;
}
