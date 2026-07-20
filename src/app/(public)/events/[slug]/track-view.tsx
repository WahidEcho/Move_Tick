'use client';

import { useEffect } from 'react';

/**
 * W7: fires a single fire-and-forget page-view beacon per mount. Dedup and
 * session handling live server-side (unique per session per day), so a refresh
 * is harmless. Never blocks or affects the page if it fails.
 */
export function TrackEventView({ eventId, authed }: { eventId: string; authed: boolean }) {
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/track/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, authed }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {});
    return () => controller.abort();
  }, [eventId, authed]);

  return null;
}
