import { createServiceClient } from './supabase-server';
import type { Event } from '@/types/database.types';

/**
 * Auto-expiry rule: an event stops appearing in public discovery
 * `event_expiry_buffer_hours` (default 2h, configurable in platform_settings)
 * after its `end_date`. The event row is never deleted or altered — only
 * hidden from public listings/detail. Organizers and admins can still see
 * their own (expired) events everywhere else in the app; this only gates the
 * public-facing surfaces (landing, /events, /events/[slug] for non-owners).
 *
 * Timestamps are stored as `timestamptz` (absolute instants), so this
 * comparison is correct regardless of the platform's display timezone
 * (`platform_settings.default_timezone`, default 'Africa/Cairo' — used for
 * display/labels only, not for the underlying instant comparison).
 */

let cachedBufferHours: { value: number; fetchedAt: number } | null = null;
const SETTINGS_CACHE_MS = 60_000; // 1 min — avoids a query on every page render

/** The current event-expiry buffer in hours, from platform_settings (cached ~1min). */
export async function getEventExpiryBufferHours(): Promise<number> {
  if (cachedBufferHours && Date.now() - cachedBufferHours.fetchedAt < SETTINGS_CACHE_MS) {
    return cachedBufferHours.value;
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('platform_settings')
    .select('event_expiry_buffer_hours')
    .limit(1)
    .maybeSingle();
  const value = data?.event_expiry_buffer_hours ?? 2;
  cachedBufferHours = { value, fetchedAt: Date.now() };
  return value;
}

/** ISO timestamp such that events with `end_date < threshold` have expired. */
export async function getExpiryThresholdISO(): Promise<string> {
  const bufferHours = await getEventExpiryBufferHours();
  return new Date(Date.now() - bufferHours * 60 * 60 * 1000).toISOString();
}

/**
 * Whether an event should appear in public discovery right now. Mirrors the
 * DB-level filter used by getPublicEvents/landing (is_published, public
 * visibility, not cancelled, not hidden, not archived, not expired) — use
 * this for the single-event detail page where the DB filter isn't applied.
 */
export function isPubliclyVisible(
  event: Pick<Event, 'is_published' | 'visibility' | 'is_cancelled' | 'is_hidden' | 'archived_at' | 'end_date'>,
  thresholdISO: string
): boolean {
  return (
    event.is_published &&
    event.visibility === 'public' &&
    !event.is_cancelled &&
    !event.is_hidden &&
    !event.archived_at &&
    event.end_date >= thresholdISO
  );
}

/** True once `end_date + buffer hours` has passed, regardless of publish state. */
export function isExpired(event: Pick<Event, 'end_date'>, thresholdISO: string): boolean {
  return event.end_date < thresholdISO;
}

/**
 * Org-aware expiry threshold: organizations can override the platform buffer
 * (organizations.event_expiry_buffer_hours). Returns the ISO instant an event
 * of that org must end after to still be publicly visible.
 */
export async function getOrgAwareThresholdISO(orgBufferHours: number | null | undefined): Promise<string> {
  const hours = orgBufferHours ?? (await getEventExpiryBufferHours());
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/** Widest DB-level prefilter (matches the 72h anon RLS backstop); JS narrows per org. */
export function maxExpiryThresholdISO(): string {
  return new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
}
