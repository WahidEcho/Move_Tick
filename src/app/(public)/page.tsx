import { getPublicEvents, getConfirmedCountsByEvent, getPublicLandingStats, type PublicLandingStats } from '@/services/events.service';
import { Landing, type LandingEvent } from './landing';
import { getPlatformSettings } from '@/services/platform-settings.service';

export default async function HomePage() {
  // Surface real upcoming events on the landing page ("Happening soon").
  // Best-effort: the landing must render even if the query fails.
  let events: LandingEvent[] = [];
  let heroVideoUrl: string | null = null;
  let heroPosterUrl: string | null = null;
  let stats: PublicLandingStats = { upcomingEvents: 0, ticketsIssued: 0, organizers: 0, cities: 0 };
  try {
    const { data } = await getPublicEvents({ page: 1, page_size: 6 });
    const counts = await getConfirmedCountsByEvent(data.map((e) => e.id));
    events = data.map((e) => {
      const publicPrices = (e.ticket_types ?? []).filter((ticket) => ticket.is_active && ticket.visibility === 'public').map((ticket) => ticket.price);
      return {
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
        organizer: e.organization?.name ?? null,
        priceFrom: publicPrices.length ? Math.min(...publicPrices) : null,
        isFeatured: e.is_featured ?? false,
        shortSummary: e.short_summary ?? null,
      };
    });
    events.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  } catch {
    // ignore — hero and the rest of the landing still render
  }

  try {
    const settings = await getPlatformSettings();
    heroVideoUrl = settings.landing_hero_video_url ?? null;
    heroPosterUrl = settings.landing_hero_poster_url ?? null;
  } catch {
    // The public landing remains available while settings are unavailable.
  }

  try {
    stats = await getPublicLandingStats();
  } catch {
    // Trust signals are omitted when live counts are unavailable.
  }

  return <Landing events={events} stats={stats} heroVideoUrl={heroVideoUrl} heroPosterUrl={heroPosterUrl} />;
}
