import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  Accessibility,
  ArrowRight,
  Building2,
  Calendar,
  CalendarPlus,
  Check,
  DoorOpen,
  ExternalLink,
  Info,
  MapPin,
  Play,
  Shirt,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { getEventBySlug, getEventStats, getEventStoryContent } from '@/services/events.service';
import { getTicketTypes } from '@/services/tickets.service';
import { getProfile, getOrgRole, getEventStaffRole } from '@/lib/auth';
import { getExpiryThresholdISO, isExpired } from '@/lib/event-visibility';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RegisterDialog } from './register-dialog';
import { TrackEventView } from './track-view';
import { isOptimizableImage } from '../event-card';
import { formatEgp } from '@/lib/helpers';
import { linkify } from '@/lib/linkify';
import { resolveMapsUrl, googleCalendarUrl } from '@/lib/event-links';
import { FACILITIES } from '@/lib/facilities';
import { Reveal } from '@/components/motion/cinematic';
import { EventActions } from './event-actions';

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.is_cancelled) notFound();

  const threshold = await getExpiryThresholdISO();
  const hasEnded = isExpired(event, threshold);
  const isHidden = event.is_hidden || Boolean(event.archived_at);
  let statusBadge: string | null = null;

  if (hasEnded || isHidden) {
    const profile = await getProfile();
    let hasAccess = false;
    if (profile) {
      if (profile.platform_role === 'admin') {
        hasAccess = true;
      } else {
        const [orgRole, staffRole] = await Promise.all([
          getOrgRole(profile.id, event.organization_id),
          getEventStaffRole(profile.id, event.id),
        ]);
        hasAccess = Boolean(orgRole) || Boolean(staffRole);
      }
    }
    if (!hasAccess) notFound();
    statusBadge = event.archived_at ? 'Archived' : event.is_hidden ? 'Hidden' : 'Ended';
  }

  const [ticketTypes, stats, story] = await Promise.all([
    getTicketTypes(event.id),
    getEventStats(event.id),
    getEventStoryContent(event.id),
  ]);

  const settings = event.event_settings;
  const capacity = event.capacity ?? null;
  const isFull = capacity !== null && stats.confirmed >= capacity;
  const showRemainingSeats = settings?.show_remaining_seats ?? true;
  const showRegisteredCount = settings?.show_registered_count ?? true;
  const isInviteOnly = event.visibility === 'invite_only';
  const approvalRequired = settings?.approval_required ?? false;
  const enableWaitlist = settings?.enable_waitlist ?? false;
  const publicTicketTypes = ticketTypes.filter((ticketType) => ticketType.visibility === 'public');
  const mapsUrl = resolveMapsUrl(event);
  const calendarUrl = googleCalendarUrl(event);
  const eventFacilities = FACILITIES.filter((facility) => event.facilities?.includes(facility.value));
  const lowestPrice = publicTicketTypes.length
    ? Math.min(...publicTicketTypes.map((ticketType) => Number(ticketType.price)))
    : null;
  const summary = event.short_summary || event.description?.split('\n')[0] || null;
  const gallery = story.media.filter((media) => media.media_type === 'image').slice(0, 5);
  const speakerById = new Map(story.speakers.map((speaker) => [speaker.id, speaker]));

  return (
    <div className="cinematic-page min-h-screen pb-24 text-white lg:pb-0">
      <TrackEventView eventId={event.id} authed={false} />

      <section className="cinematic-noise relative isolate min-h-[31rem] overflow-hidden border-b border-white/10 lg:min-h-[38rem]">
        {event.cover_image_url ? (
          <>
            <Image
              src={event.cover_image_url}
              alt=""
              aria-hidden
              fill
              priority
              sizes="100vw"
              unoptimized={!isOptimizableImage(event.cover_image_url)}
              className="scale-105 object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,10,.97)_0%,rgba(5,6,10,.72)_42%,rgba(5,6,10,.16)_78%),linear-gradient(0deg,#08090d_0%,transparent_58%)]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(91,59,232,.38),transparent_38%),linear-gradient(135deg,#111526,#08090d)]" />
        )}
        <div aria-hidden className="cinematic-grid absolute inset-0 opacity-40" />

        <div className="relative mx-auto flex min-h-[31rem] max-w-7xl items-end px-4 pb-12 pt-20 sm:px-6 lg:min-h-[38rem] lg:px-8 lg:pb-16">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {event.category && <Badge className="border-0 bg-brand-purple px-3 py-1 text-white">{event.category}</Badge>}
              {statusBadge && <Badge variant="outline" className="border-amber-400/40 text-amber-300">{statusBadge}</Badge>}
              {isFull && <Badge className="bg-white text-black">Sold out</Badge>}
              {!isFull && showRemainingSeats && capacity && capacity - stats.confirmed <= 12 && (
                <Badge className="bg-brand-green text-brand-black">Selling fast</Badge>
              )}
            </div>

            <h1 className="max-w-4xl font-display text-4xl font-extrabold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
              {event.title}
            </h1>
            {summary && <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/68 sm:text-lg">{summary}</p>}

            {event.organization && (
              <Link href={`/organizations/${event.organization.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white">
                {event.organization.logo_url ? (
                  <Image src={event.organization.logo_url} alt="" width={28} height={28} unoptimized={!isOptimizableImage(event.organization.logo_url)} className="size-7 rounded-full object-cover ring-1 ring-white/20" />
                ) : (
                  <span className="grid size-7 place-items-center rounded-full bg-white/10"><Building2 className="size-3.5" /></span>
                )}
                by {event.organization.name}
              </Link>
            )}

            <div className="mt-7 grid gap-4 text-sm sm:grid-cols-3 sm:gap-8">
              <HeroFact icon={Calendar} title={format(new Date(event.start_date), 'EEEE, MMM d, yyyy')} detail={`${format(new Date(event.start_date), 'h:mm a')} – ${format(new Date(event.end_date), 'h:mm a')}`} />
              <HeroFact icon={MapPin} title={event.venue || event.city || 'Venue TBA'} detail={[event.city, event.country].filter(Boolean).join(', ')} />
              <HeroFact icon={Ticket} title={lowestPrice === null ? 'Tickets coming soon' : lowestPrice === 0 ? 'Free registration' : `From ${formatEgp(lowestPrice)}`} detail={isFull ? 'Join the waitlist if available' : 'Secure checkout · instant QR'} />
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {event.promo_video_url && (
                <Button asChild className="bg-white text-black hover:bg-white/90"><a href="#trailer"><Play className="size-4 fill-current" /> Watch trailer</a></Button>
              )}
              <Button variant="outline" size="sm" asChild className="border-white/20 bg-black/20 text-white hover:bg-white/10">
                <a href={calendarUrl} target="_blank" rel="noopener noreferrer"><CalendarPlus className="size-4" /> Add to calendar</a>
              </Button>
              {mapsUrl && (
                <Button variant="outline" size="sm" asChild className="border-white/20 bg-black/20 text-white hover:bg-white/10">
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"><MapPin className="size-4" /> Directions</a>
                </Button>
              )}
              <EventActions eventId={event.id} title={event.title} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:px-8 lg:py-14">
        <main className="min-w-0 space-y-8">
          {(isInviteOnly || approvalRequired) && (
            <div className="cinematic-panel flex gap-3 rounded-2xl p-4 text-sm text-white/75">
              <Info className="mt-0.5 size-5 shrink-0 text-[#a98fff]" />
              <p>{isInviteOnly ? 'This is an invite-only experience. Open your personal invitation to register.' : 'Registrations are reviewed by the organizer. You will be notified as soon as yours is approved.'}</p>
            </div>
          )}

          {gallery.length > 0 && (
            <Reveal>
              <section aria-labelledby="gallery-title">
                <SectionHeading eyebrow="Inside the experience" title="A glimpse of what awaits" id="gallery-title" />
                <div className="mt-5 grid auto-rows-[10rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] sm:grid-cols-4">
                  {gallery.map((media, index) => (
                    <figure key={media.id} className={`group relative overflow-hidden rounded-2xl border border-white/10 ${index === 0 ? 'col-span-2 row-span-2' : ''}`}>
                      <Image src={media.url} alt={media.alt_text || `${event.title} gallery image`} fill sizes={index === 0 ? '(max-width: 1024px) 100vw, 45vw' : '25vw'} unoptimized={!isOptimizableImage(media.url)} className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      {media.caption && <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-xs text-white/70">{media.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </section>
            </Reveal>
          )}

          {event.promo_video_url && (
            <Reveal>
              <section id="trailer" className="overflow-hidden rounded-3xl border border-white/10 bg-black">
                <video controls preload="metadata" poster={event.promo_video_poster_url || event.cover_image_url || undefined} className="aspect-video w-full object-cover">
                  <source src={event.promo_video_url} />
                </video>
              </section>
            </Reveal>
          )}

          {story.highlights.length > 0 && (
            <Reveal>
              <section>
                <SectionHeading eyebrow="Why you’ll love it" title="Event highlights" />
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {story.highlights.map((highlight) => (
                    <div key={highlight.id} className="cinematic-panel rounded-2xl p-4">
                      <div className="mb-3 grid size-9 place-items-center rounded-xl bg-brand-green/10 text-brand-green"><Sparkles className="size-4" /></div>
                      <h3 className="font-heading text-lg font-bold">{highlight.title}</h3>
                      {highlight.description && <p className="mt-1 text-sm leading-relaxed text-white/55">{highlight.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>
          )}

          {event.description && (
            <Reveal>
              <section className="cinematic-panel rounded-3xl p-6 sm:p-8">
                <SectionHeading eyebrow="About the event" title="The full story" />
                <div className="mt-5 space-y-3 text-[15px] leading-7 text-white/65">
                  {event.description.split('\n').filter(Boolean).map((paragraph, index) => <p key={index}>{linkify(paragraph)}</p>)}
                </div>
                <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-sm text-white/60">
                  {event.age_restriction && <StoryFact icon={Users} label="Age" value={event.age_restriction} />}
                  {event.dress_code && <StoryFact icon={Shirt} label="Dress code" value={event.dress_code} />}
                  {event.accessibility_notes && <StoryFact icon={Accessibility} label="Accessibility" value={event.accessibility_notes} />}
                </div>
              </section>
            </Reveal>
          )}

          {story.agenda.length > 0 && (
            <Reveal>
              <section>
                <SectionHeading eyebrow="Plan your experience" title="Schedule" />
                <ol className="cinematic-panel relative mt-5 overflow-hidden rounded-3xl p-5 sm:p-7">
                  <span aria-hidden className="absolute bottom-8 left-[6.75rem] top-8 w-px bg-gradient-to-b from-brand-purple via-brand-purple/50 to-transparent sm:left-[8.75rem]" />
                  {story.agenda.map((item) => (
                    <li key={item.id} className="relative grid grid-cols-[5.5rem_1fr] gap-5 py-4 sm:grid-cols-[7.5rem_1fr]">
                      <time className="font-mono text-xs font-semibold text-[#a98fff]">{format(new Date(item.starts_at), 'h:mm a')}</time>
                      <span aria-hidden className="absolute left-[5.25rem] top-[1.15rem] size-3 rounded-full border-2 border-brand-purple bg-[#0c0e16] sm:left-[7.25rem]" />
                      <div>
                        <h3 className="font-heading text-lg font-bold">{item.title}</h3>
                        {(item.location || item.speaker_id) && <p className="mt-1 text-sm text-white/50">{[speakerById.get(item.speaker_id ?? '')?.name, item.location].filter(Boolean).join(' · ')}</p>}
                        {item.description && <p className="mt-2 text-sm leading-relaxed text-white/55">{item.description}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </Reveal>
          )}

          <Reveal>
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="cinematic-panel rounded-3xl p-6">
                <SectionHeading eyebrow="Venue information" title={event.venue || 'Venue to be announced'} />
                <p className="mt-3 text-sm leading-relaxed text-white/55">{[event.location, event.city, event.country].filter(Boolean).join(', ') || 'Details will be shared before the event.'}</p>
                {event.doors_open_time && <p className="mt-4 flex items-center gap-2 text-sm text-white/70"><DoorOpen className="size-4 text-brand-green" /> Doors open {format(new Date(event.doors_open_time), 'h:mm a')}</p>}
                {mapsUrl && <Button variant="link" asChild className="mt-4 h-auto p-0 text-[#a98fff]"><a href={mapsUrl} target="_blank" rel="noopener noreferrer">Get directions <ExternalLink className="size-3.5" /></a></Button>}
              </div>
              <div className="cinematic-panel rounded-3xl p-6">
                <SectionHeading eyebrow="Available on site" title="Facilities" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {eventFacilities.length ? eventFacilities.map((facility) => { const Icon = facility.icon; return <span key={facility.value} className="flex items-center gap-2 text-sm text-white/60"><Icon className="size-4 text-brand-green" />{facility.label}</span>; }) : <p className="col-span-2 text-sm text-white/50">Facility details will be announced soon.</p>}
                </div>
              </div>
            </section>
          </Reveal>

          {story.speakers.length > 0 && (
            <Reveal>
              <section>
                <SectionHeading eyebrow="On stage" title="Hosts and speakers" />
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {story.speakers.map((speaker) => (
                    <div key={speaker.id} className="cinematic-panel flex items-center gap-4 rounded-2xl p-4">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-brand-purple/20">{speaker.image_url ? <Image src={speaker.image_url} alt={speaker.name} fill sizes="56px" unoptimized={!isOptimizableImage(speaker.image_url)} className="object-cover" /> : <Users className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-[#a98fff]" />}</div>
                      <div className="min-w-0"><h3 className="truncate font-heading text-lg font-bold">{speaker.name}</h3>{speaker.role && <p className="truncate text-sm text-white/50">{speaker.role}</p>}</div>
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>
          )}

          {story.faqs.length > 0 && (
            <Reveal>
              <section>
                <SectionHeading eyebrow="Good to know" title="Frequently asked questions" />
                <div className="mt-5 space-y-3">{story.faqs.map((faq) => <details key={faq.id} className="cinematic-panel group rounded-2xl p-5"><summary className="cursor-pointer list-none pr-8 font-heading text-lg font-bold marker:hidden">{faq.question}</summary><p className="mt-3 text-sm leading-relaxed text-white/60">{faq.answer}</p></details>)}</div>
              </section>
            </Reveal>
          )}
        </main>

        <aside id="tickets" className="min-w-0">
          <div className="cinematic-panel sticky top-20 overflow-hidden rounded-3xl">
            <div className="border-b border-white/10 bg-brand-purple/10 px-5 py-4">
              <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-heading text-2xl font-bold"><Ticket className="size-5 text-[#a98fff]" /> Choose your ticket</h2>{showRegisteredCount && <span className="text-xs text-white/45">{stats.registrations} interested</span>}</div>
              {!isFull && showRemainingSeats && capacity && <p className="mt-1 text-xs text-brand-green">{Math.max(0, capacity - stats.confirmed)} total event spots remain</p>}
            </div>
            <div className="space-y-3 p-4">
              {publicTicketTypes.length === 0 ? <div className="py-8 text-center text-sm text-white/50">Tickets are not available yet.</div> : publicTicketTypes.map((ticketType) => {
                const available = ticketType.capacity == null ? Infinity : Math.max(0, ticketType.capacity - (ticketType.sold_count ?? 0));
                const soldOut = ticketType.capacity != null && available <= 0;
                return (
                  <div key={ticketType.id} className="ticket-cutout overflow-hidden rounded-2xl border border-white/12 bg-black/25 transition-colors hover:border-brand-purple/60">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-heading text-xl font-bold">{ticketType.name}</h3>{ticketType.visual_label && <Badge className="bg-brand-purple/20 text-[#b5a5ff]">{ticketType.visual_label}</Badge>}</div>{ticketType.description && <p className="mt-1 text-xs leading-relaxed text-white/45">{ticketType.description}</p>}</div>
                        <p className="shrink-0 font-heading text-xl font-bold">{formatEgp(ticketType.price)}</p>
                      </div>
                      {(ticketType.benefits ?? []).length > 0 && <ul className="mt-4 space-y-2">{ticketType.benefits.map((benefit) => <li key={benefit} className="flex gap-2 text-xs text-white/65"><Check className="mt-0.5 size-3.5 shrink-0 text-brand-green" />{benefit}</li>)}</ul>}
                      {ticketType.capacity != null && <p className={`mt-4 text-xs font-medium ${soldOut ? 'text-white/45' : available <= 12 ? 'text-brand-green' : 'text-white/45'}`}>{soldOut ? 'Sold out' : `${available} tickets remaining`}</p>}
                    </div>
                    <div className="ticket-perforation h-2 opacity-50" />
                    <div className="p-4 pt-2"><RegisterDialog event={event} ticketType={ticketType} disabled={isInviteOnly || soldOut} approvalRequired={approvalRequired} isFull={isFull} enableWaitlist={enableWaitlist} /></div>
                  </div>
                );
              })}
              <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-white/35"><Check className="size-3 text-brand-green" /> Secure checkout · instant mobile ticket</div>
              {event.refund_policy && <p className="border-t border-white/8 pt-3 text-xs leading-relaxed text-white/40"><strong className="text-white/60">Refund policy:</strong> {event.refund_policy}</p>}
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#090a10]/95 p-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div><p className="text-[10px] uppercase tracking-wider text-white/40">Tickets from</p><p className="font-heading text-xl font-bold">{lowestPrice === null ? 'Coming soon' : formatEgp(lowestPrice)}</p></div>
          <Button asChild className="h-12 flex-1 bg-brand-green font-bold text-brand-black hover:bg-brand-green/90"><a href="#tickets">Choose tickets <ArrowRight className="size-4" /></a></Button>
        </div>
      </div>
    </div>
  );
}

function HeroFact({ icon: Icon, title, detail }: { icon: typeof Calendar; title: string; detail: string }) {
  return <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/12 bg-black/35 backdrop-blur"><Icon className="size-4 text-[#a98fff]" /></span><div><p className="font-semibold text-white">{title}</p>{detail && <p className="mt-0.5 text-xs text-white/48">{detail}</p>}</div></div>;
}

function StoryFact({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return <span className="flex items-start gap-2"><Icon className="mt-0.5 size-4 shrink-0 text-brand-green" /><span><strong className="block text-xs uppercase tracking-wider text-white/35">{label}</strong>{value}</span></span>;
}

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id?: string }) {
  return <div><p className="cinematic-kicker">{eyebrow}</p><h2 id={id} className="mt-1 font-heading text-2xl font-bold sm:text-3xl">{title}</h2></div>;
}
