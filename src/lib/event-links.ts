interface EventLocationFields {
  maps_url: string | null;
  location: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
}

/** Resolves the best "open in maps" URL: explicit maps_url, else a location that's already a URL, else a Google Maps search built from venue/city/country. */
export function resolveMapsUrl(event: EventLocationFields): string | null {
  if (event.maps_url) return event.maps_url;
  if (event.location && /^https?:\/\//i.test(event.location)) return event.location;

  const query = [event.venue, event.location, event.city, event.country].filter(Boolean).join(', ');
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

interface CalendarEventFields {
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  venue: string | null;
  location: string | null;
  city: string | null;
}

function toGoogleCalendarDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Builds a "Add to Google Calendar" URL — no API/auth required, opens the prefilled event form. */
export function googleCalendarUrl(event: CalendarEventFields): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toGoogleCalendarDate(event.start_date)}/${toGoogleCalendarDate(event.end_date)}`,
  });
  const location = [event.venue, event.location, event.city].filter(Boolean).join(', ');
  if (location) params.set('location', location);
  if (event.description) params.set('details', event.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
