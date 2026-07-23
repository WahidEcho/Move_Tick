import { createServiceClient } from '@/lib/supabase-server';
import { getExpiryThresholdISO, getEventExpiryBufferHours, maxExpiryThresholdISO } from '@/lib/event-visibility';
import type {
  Event,
  EventAgendaItem,
  EventFaq,
  EventHighlight,
  EventMedia,
  EventSettings,
  EventSpeaker,
  TicketType,
  EventVisibility,
} from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';

export type EventWithDetails = Event & {
  event_settings: EventSettings | null;
  organization?: { id: string; name: string; slug: string; logo_url: string | null } | null;
  ticket_types?: TicketType[];
};

export interface CreateEventData {
  title: string;
  slug: string;
  description?: string | null;
  short_summary?: string | null;
  cover_image_url?: string | null;
  promo_video_url?: string | null;
  promo_video_poster_url?: string | null;
  start_date: string;
  end_date: string;
  location?: string | null;
  venue?: string | null;
  city?: string | null;
  country?: string | null;
  category?: string | null;
  visibility?: EventVisibility;
  capacity?: number | null;
  doors_open_time?: string | null;
  maps_url?: string | null;
  facilities?: string[];
  age_restriction?: string | null;
  accessibility_notes?: string | null;
  refund_policy?: string | null;
  dress_code?: string | null;
}

export interface UpdateEventData {
  title?: string;
  slug?: string;
  is_published?: boolean;
  is_cancelled?: boolean;
  description?: string | null;
  short_summary?: string | null;
  cover_image_url?: string | null;
  promo_video_url?: string | null;
  promo_video_poster_url?: string | null;
  start_date?: string;
  end_date?: string;
  location?: string | null;
  venue?: string | null;
  city?: string | null;
  country?: string | null;
  category?: string | null;
  visibility?: EventVisibility;
  capacity?: number | null;
  doors_open_time?: string | null;
  maps_url?: string | null;
  facilities?: string[];
  age_restriction?: string | null;
  accessibility_notes?: string | null;
  refund_policy?: string | null;
  dress_code?: string | null;
}

export interface UpdateEventSettingsData {
  approval_required?: boolean;
  enable_waitlist?: boolean;
  show_guest_list?: boolean;
  show_registered_count?: boolean;
  show_remaining_seats?: boolean;
  show_attendee_preview?: boolean;
  show_company_badges?: boolean;
  allow_referrals?: boolean;
  allow_chat?: boolean;
  allow_networking?: boolean;
}

export interface GetEventsFilters {
  orgId?: string;
  category?: string;
  city?: string;
  search?: string;
  visibility?: EventVisibility;
  is_published?: boolean;
  page?: number;
  page_size?: number;
  /**
   * Public-discovery gate: excludes cancelled/hidden/archived/expired events
   * (end_date past the expiry buffer). Set internally by getPublicEvents —
   * admin/organizer listings never set this so they keep seeing everything.
   */
  excludeExpiredAndHidden?: boolean;
}

export interface GetOrganizationEventsFilters {
  category?: string;
  is_published?: boolean;
  is_cancelled?: boolean;
  search?: string;
  start_date_gte?: string;
  start_date_lt?: string;
  end_date_lt?: string;
  page?: number;
  page_size?: number;
}

export interface EventStats {
  registrations: number;
  confirmed: number;
  checked_in: number;
  capacity: number | null;
}

export interface EventStoryContent {
  media: EventMedia[];
  highlights: EventHighlight[];
  agenda: EventAgendaItem[];
  speakers: EventSpeaker[];
  faqs: EventFaq[];
}

const EMPTY_EVENT_STORY: EventStoryContent = {
  media: [],
  highlights: [],
  agenda: [],
  speakers: [],
  faqs: [],
};

/**
 * Optional rich content. This deliberately degrades to empty collections so
 * legacy databases and events render the cinematic shell before the migration
 * is deployed or before an organizer has authored any story sections.
 */
export async function getEventStoryContent(eventId: string): Promise<EventStoryContent> {
  const supabase = createServiceClient();
  const [media, highlights, agenda, speakers, faqs] = await Promise.all([
    supabase.from('event_media').select('*').eq('event_id', eventId).order('sort_order'),
    supabase.from('event_highlights').select('*').eq('event_id', eventId).order('sort_order'),
    supabase.from('event_agenda_items').select('*').eq('event_id', eventId).order('starts_at'),
    supabase.from('event_speakers').select('*').eq('event_id', eventId).order('sort_order'),
    supabase.from('event_faqs').select('*').eq('event_id', eventId).order('sort_order'),
  ]);

  return {
    media: media.error ? EMPTY_EVENT_STORY.media : (media.data ?? []) as EventMedia[],
    highlights: highlights.error ? EMPTY_EVENT_STORY.highlights : (highlights.data ?? []) as EventHighlight[],
    agenda: agenda.error ? EMPTY_EVENT_STORY.agenda : (agenda.data ?? []) as EventAgendaItem[],
    speakers: speakers.error ? EMPTY_EVENT_STORY.speakers : (speakers.data ?? []) as EventSpeaker[],
    faqs: faqs.error ? EMPTY_EVENT_STORY.faqs : (faqs.data ?? []) as EventFaq[],
  };
}

const EVENT_SETTINGS_DEFAULTS = {
  approval_required: false,
  enable_waitlist: false,
  show_guest_list: false,
  show_registered_count: true,
  show_remaining_seats: true,
  show_attendee_preview: false,
  show_company_badges: false,
  allow_referrals: false,
  allow_chat: true,
  allow_networking: true,
};

export async function createEvent(
  orgId: string,
  data: CreateEventData
): Promise<Event> {
  const supabase = createServiceClient();

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      organization_id: orgId,
      title: data.title,
      slug: data.slug,
      description: data.description ?? null,
      short_summary: data.short_summary ?? null,
      cover_image_url: data.cover_image_url ?? null,
      promo_video_url: data.promo_video_url ?? null,
      promo_video_poster_url: data.promo_video_poster_url ?? null,
      start_date: data.start_date,
      end_date: data.end_date,
      location: data.location ?? null,
      venue: data.venue ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
      category: data.category ?? null,
      visibility: data.visibility ?? 'public',
      capacity: data.capacity ?? null,
      doors_open_time: data.doors_open_time ?? null,
      maps_url: data.maps_url ?? null,
      facilities: data.facilities ?? [],
      age_restriction: data.age_restriction ?? null,
      accessibility_notes: data.accessibility_notes ?? null,
      refund_policy: data.refund_policy ?? null,
      dress_code: data.dress_code ?? null,
      is_published: false,
      is_cancelled: false,
    })
    .select()
    .single();

  if (eventError) throw new Error(`Failed to create event: ${eventError.message}`);

  const { error: settingsError } = await supabase
    .from('event_settings')
    .insert({
      event_id: event.id,
      ...EVENT_SETTINGS_DEFAULTS,
    });

  if (settingsError) {
    await supabase.from('events').delete().eq('id', event.id);
    throw new Error(`Failed to create event settings: ${settingsError.message}`);
  }

  return event as Event;
}

export async function getEvent(id: string): Promise<EventWithDetails | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      event_settings:event_settings(*),
      organization:organizations(id, name, slug)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch event: ${error.message}`);
  return data as EventWithDetails | null;
}

export async function getEventBySlug(
  slug: string
): Promise<EventWithDetails | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      event_settings:event_settings(*),
      organization:organizations(id, name, slug, logo_url)
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch event: ${error.message}`);
  return data as EventWithDetails | null;
}

export async function getEvents(
  filters: GetEventsFilters = {}
): Promise<PaginatedResult<EventWithDetails>> {
  const supabase = createServiceClient();
  const {
    orgId,
    category,
    city,
    search,
    visibility,
    is_published,
    excludeExpiredAndHidden,
    page = 1,
    page_size = 20,
  } = filters;

  let query = supabase
    .from('events')
    .select(
      `
      *,
      organization:organizations(id, name, slug, logo_url, event_expiry_buffer_hours),
      ticket_types(id, name, price, capacity, sold_count, visibility, is_active, sort_order)
    `,
      { count: 'exact' }
    );

  if (orgId) query = query.eq('organization_id', orgId);
  if (category) query = query.eq('category', category);
  if (city) query = query.eq('city', city);
  if (visibility) query = query.eq('visibility', visibility);
  if (is_published !== undefined) query = query.eq('is_published', is_published);
  if (search && search.trim()) {
    query = query.or(
      `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%,venue.ilike.%${search.trim()}%`
    );
  }
  if (excludeExpiredAndHidden) {
    // DB prefilter at the widest allowed window (72h); the per-organization
    // buffer override (organizations.event_expiry_buffer_hours, else the
    // platform default) is applied per row below.
    query = query
      .eq('is_cancelled', false)
      .eq('is_hidden', false)
      .is('archived_at', null)
      .gte('end_date', maxExpiryThresholdISO());
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.order('start_date', { ascending: true }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch events: ${error.message}`);

  let rows = (data ?? []) as EventWithDetails[];
  let total = count ?? 0;
  if (excludeExpiredAndHidden) {
    const defaultBuffer = await getEventExpiryBufferHours();
    const now = Date.now();
    const before = rows.length;
    rows = rows.filter((ev) => {
      const orgBuffer = (ev.organization as unknown as { event_expiry_buffer_hours?: number | null } | null)
        ?.event_expiry_buffer_hours;
      const bufferHours = orgBuffer ?? defaultBuffer;
      return new Date(ev.end_date).getTime() + bufferHours * 60 * 60 * 1000 > now;
    });
    total -= before - rows.length;
  }

  return {
    data: rows,
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}

export async function getPublicEvents(
  filters: GetEventsFilters = {}
): Promise<PaginatedResult<EventWithDetails>> {
  return getEvents({
    ...filters,
    is_published: true,
    visibility: 'public',
    excludeExpiredAndHidden: true,
  });
}

export interface PublicLandingStats {
  upcomingEvents: number;
  ticketsIssued: number;
  organizers: number;
  cities: number;
}

/** Real, public-safe platform signals used on the landing page. */
export async function getPublicLandingStats(): Promise<PublicLandingStats> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const [events, tickets, organizers, cityRows] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('is_published', true).eq('is_cancelled', false).eq('is_hidden', false).is('archived_at', null).gte('end_date', now),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('events').select('city').eq('is_published', true).eq('is_cancelled', false).eq('is_hidden', false).is('archived_at', null).gte('end_date', now).not('city', 'is', null),
  ]);
  return {
    upcomingEvents: events.count ?? 0,
    ticketsIssued: tickets.count ?? 0,
    organizers: organizers.count ?? 0,
    cities: new Set((cityRows.data ?? []).map((row) => row.city?.trim().toLowerCase()).filter(Boolean)).size,
  };
}

export type AdminEventStatus = 'all' | 'draft' | 'published' | 'hidden' | 'cancelled' | 'expired' | 'archived';

export interface GetEventsForAdminFilters {
  search?: string;
  status?: AdminEventStatus;
  page?: number;
  page_size?: number;
}

/**
 * Admin events list query — sees every event regardless of organization,
 * with status categories that combine publish state, manual hide, soft
 * delete, and computed expiry (unlike getEvents/getPublicEvents, which only
 * ever show what a given viewer is allowed to see).
 */
export async function getEventsForAdmin(
  filters: GetEventsForAdminFilters = {}
): Promise<PaginatedResult<EventWithDetails>> {
  const { search, status = 'all', page = 1, page_size = 20 } = filters;
  const supabase = createServiceClient();

  let query = supabase
    .from('events')
    .select(`*, organization:organizations(id, name, slug)`, { count: 'exact' });

  if (search && search.trim()) {
    query = query.or(
      `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%,venue.ilike.%${search.trim()}%`
    );
  }

  if (status === 'draft') {
    query = query.eq('is_published', false);
  } else if (status === 'hidden') {
    query = query.eq('is_hidden', true);
  } else if (status === 'cancelled') {
    query = query.eq('is_cancelled', true);
  } else if (status === 'archived') {
    query = query.not('archived_at', 'is', null);
  } else if (status === 'published') {
    const threshold = await getExpiryThresholdISO();
    query = query
      .eq('is_published', true)
      .eq('is_cancelled', false)
      .eq('is_hidden', false)
      .is('archived_at', null)
      .gte('end_date', threshold);
  } else if (status === 'expired') {
    const threshold = await getExpiryThresholdISO();
    query = query.eq('is_cancelled', false).is('archived_at', null).lt('end_date', threshold);
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.order('start_date', { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch events: ${error.message}`);

  const total = count ?? 0;
  return {
    data: (data ?? []) as EventWithDetails[],
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}

export async function updateEvent(
  id: string,
  data: UpdateEventData
): Promise<Event> {
  const supabase = createServiceClient();

  const updates = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  const { data: event, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update event: ${error.message}`);
  return event as Event;
}

export async function updateEventSettings(
  eventId: string,
  data: UpdateEventSettingsData
): Promise<EventSettings> {
  const supabase = createServiceClient();

  const updates = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  const { data: settings, error } = await supabase
    .from('event_settings')
    .update(updates)
    .eq('event_id', eventId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update event settings: ${error.message}`);
  return settings as EventSettings;
}

export async function publishEvent(id: string): Promise<Event> {
  return updateEvent(id, { is_published: true });
}

export async function cancelEvent(id: string): Promise<Event> {
  return updateEvent(id, { is_cancelled: true });
}

export async function getOrganizationEvents(
  orgId: string,
  filters: GetOrganizationEventsFilters = {}
): Promise<PaginatedResult<EventWithDetails>> {
  const {
    category,
    is_published,
    is_cancelled,
    search,
    start_date_gte,
    start_date_lt,
    end_date_lt,
    page = 1,
    page_size = 20,
  } = filters;

  const supabase = createServiceClient();

  let dbQuery = supabase
    .from('events')
    .select(
      `
      *,
      organization:organizations(id, name, slug, event_expiry_buffer_hours)
    `,
      { count: 'exact' }
    )
    .eq('organization_id', orgId)
    .is('archived_at', null);

  if (category) dbQuery = dbQuery.eq('category', category);
  if (is_published !== undefined) dbQuery = dbQuery.eq('is_published', is_published);
  if (is_cancelled !== undefined) dbQuery = dbQuery.eq('is_cancelled', is_cancelled);
  if (search && search.trim()) {
    dbQuery = dbQuery.or(
      `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%,venue.ilike.%${search.trim()}%`
    );
  }
  if (start_date_gte) dbQuery = dbQuery.gte('start_date', start_date_gte);
  if (start_date_lt) dbQuery = dbQuery.lt('start_date', start_date_lt);
  if (end_date_lt) dbQuery = dbQuery.lt('end_date', end_date_lt);

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  dbQuery = dbQuery.order('start_date', { ascending: false }).range(from, to);

  const { data, error, count } = await dbQuery;

  if (error) throw new Error(`Failed to fetch organization events: ${error.message}`);

  const total = count ?? 0;
  return {
    data: (data ?? []) as EventWithDetails[],
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}

/**
 * Total registration counts for a set of events in ONE query (the organizer
 * events list previously called getEventStats per event — an N+1 that cost
 * ~4 queries per card).
 */
export async function getRegistrationCountsByEvent(
  eventIds: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (eventIds.length === 0) return counts;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('registrations')
    .select('event_id')
    .in('event_id', eventIds);

  for (const id of eventIds) counts[id] = 0;
  for (const row of data ?? []) {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  }
  return counts;
}

/**
 * Confirmed/approved registration counts for a set of events in one query —
 * used by the public events grid ("spots left" badge) instead of a
 * per-card getEventStats call.
 */
export async function getConfirmedCountsByEvent(
  eventIds: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (eventIds.length === 0) return counts;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('registrations')
    .select('event_id')
    .in('event_id', eventIds)
    .in('status', ['confirmed', 'approved']);

  for (const id of eventIds) counts[id] = 0;
  for (const row of data ?? []) {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  }
  return counts;
}

export async function getEventStats(eventId: string): Promise<EventStats> {
  const supabase = createServiceClient();

  // Independent counts — run them in parallel instead of one after another.
  const [eventRes, registrationsRes, confirmedRes, checkInRes] = await Promise.all([
    supabase.from('events').select('capacity').eq('id', eventId).single(),
    supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId),
    supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .in('status', ['confirmed', 'approved']),
    supabase
      .from('event_movements')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('movement_type', 'check_in'),
  ]);

  const event = eventRes.data;
  const registrationsCount = registrationsRes.count;
  const confirmedCount = confirmedRes.count;
  const checkedIn = checkInRes.count ?? 0;

  return {
    registrations: registrationsCount ?? 0,
    confirmed: confirmedCount ?? 0,
    checked_in: checkedIn,
    capacity: event?.capacity ?? null,
  };
}
