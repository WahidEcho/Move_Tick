import { getPublicEvents, getConfirmedCountsByEvent } from '@/services/events.service';
import { Landing, type LandingEvent } from './landing';

export default async function HomePage() {
  // Surface real upcoming events on the landing page ("Happening soon").
  // Best-effort: the landing must render even if the query fails.
  let events: LandingEvent[] = [];
  try {
    const { data } = await getPublicEvents({ page: 1, page_size: 6 });
    const counts = await getConfirmedCountsByEvent(data.map((e) => e.id));
    events = data.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      startDate: e.start_date,
      venue: e.venue ?? null,
      city: e.city ?? null,
      category: e.category ?? null,
      coverImageUrl: e.cover_image_url ?? null,
      capacity: e.capacity ?? null,
      confirmed: counts[e.id] ?? 0,
    }));
  } catch {
    // ignore — hero and the rest of the landing still render
  }

  return <Landing events={events} />;
}
