'use client';

import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  motion,
  type Variants,
} from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  MapPin,
  QrCode,
  Ticket,
  Sparkles,
  ShieldCheck,
  Zap,
  Building2,
  Globe2,
  Users,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isOptimizableImage } from '@/lib/helpers';
import { LivePulse, TicketOrbit } from '@/components/motion/cinematic';
import { MoveBeyondBrand, MoveTickBrand } from '@/components/brand/brand-marks';
import type { PublicLandingStats } from '@/services/events.service';

export interface LandingEvent {
  id: string;
  slug: string;
  title: string;
  startDate: string;
  venue: string | null;
  city: string | null;
  category: string | null;
  coverImageUrl: string | null;
  capacity: number | null;
  confirmed: number;
  organizer: string | null;
  priceFrom: number | null;
  isFeatured: boolean;
  shortSummary: string | null;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};
const word: Variants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Hero backdrop: showcase video when configured, animated aurora otherwise. */
function HeroBackdrop({ videoUrl, posterUrl }: { videoUrl?: string | null; posterUrl?: string | null }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {videoUrl ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={posterUrl || undefined}
          className="absolute inset-0 size-full object-cover"
          src={videoUrl}
        />
      ) : (
        <>
          <div className="mt-aurora absolute -top-1/4 -left-1/4 size-[70rem] rounded-full bg-brand-purple/25 blur-[140px]" />
          <div className="mt-aurora-slow absolute -bottom-1/3 -right-1/4 size-[60rem] rounded-full bg-brand-green/15 blur-[140px]" />
          <div className="mt-float absolute top-1/4 left-1/3 size-[24rem] rounded-full bg-brand-purple/20 blur-[100px]" />
        </>
      )}
      {/* Readability scrim — heavier at the bottom so content blends into the page */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/55 to-background" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
    </div>
  );
}

const MARQUEE_ITEMS = [
  'Concerts', 'Conferences', 'Padel & Sports', 'Meetups', 'Festivals',
  'Workshops', 'Hackathons', 'Networking', 'Exhibitions', 'Community',
];

function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-white/[0.02] py-4">
      <div className="mt-marquee flex w-max items-center gap-8 whitespace-nowrap">
        {items.map((label, i) => (
          <span key={i} className="flex items-center gap-8 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
            {label}
            <span className="size-1.5 rounded-full bg-brand-green/70" />
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}

function LandingEventCard({ event, index, featured = false }: { event: LandingEvent; index: number; featured?: boolean }) {
  const spotsLeft =
    event.capacity !== null ? Math.max(0, event.capacity - event.confirmed) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: (index % 3) * 0.12, ease: 'easeOut' }}
      whileHover={{ y: -8 }}
      className={`mt-card-glow group overflow-hidden rounded-3xl border border-white/8 bg-white/[0.03] ${featured ? 'sm:col-span-2 lg:col-span-2' : ''}`}
    >
      <Link href={`/events/${event.slug}`} className="block">
        <div className={`relative w-full overflow-hidden bg-gradient-to-br from-brand-purple/25 via-brand-purple/10 to-muted ${featured ? 'aspect-[16/8]' : 'aspect-[16/10]'}`}>
          {event.coverImageUrl && (
            <Image
              src={event.coverImageUrl}
              alt={event.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized={!isOptimizableImage(event.coverImageUrl)}
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute top-3 left-3 rounded-lg bg-background/80 px-2.5 py-1.5 text-center backdrop-blur">
            <div className="font-display text-lg font-bold leading-none text-brand-green">
              {format(new Date(event.startDate), 'dd')}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/80">
              {format(new Date(event.startDate), 'MMM')}
            </div>
          </div>
          {event.category && (
            <span className="absolute top-3 right-3 rounded-full bg-brand-purple/85 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              {event.category}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-4">
            {featured && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">Featured experience</p>}
            <h3 className={`font-heading font-semibold leading-snug text-white drop-shadow ${featured ? 'text-2xl sm:text-3xl' : 'text-lg'}`}>
              {event.title}
            </h3>
            {featured && event.shortSummary && <p className="mt-2 max-w-xl text-sm text-white/70 line-clamp-2">{event.shortSummary}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-brand-green/80" />
            <span className="truncate">
              {[event.venue, event.city].filter(Boolean).join(', ') || 'Venue TBA'}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {event.priceFrom !== null && <strong className="text-foreground">{event.priceFrom === 0 ? 'Free' : `From ${event.priceFrom.toLocaleString()} EGP`}</strong>}
            {spotsLeft !== null && <span className={spotsLeft === 0 ? 'font-medium text-destructive' : 'font-medium text-brand-green'}>{spotsLeft === 0 ? 'Full' : `${spotsLeft} left`}</span>}
          </span>
        </div>
        {event.organizer && <p className="border-t border-white/5 px-4 py-2.5 text-xs text-muted-foreground">Presented by <span className="font-semibold text-foreground/80">{event.organizer}</span></p>}
      </Link>
    </motion.div>
  );
}

const features = [
  {
    icon: CalendarDays,
    title: 'Beautiful event pages',
    body: 'Spin up a stunning event in minutes — cover image, location, ticket types, done.',
  },
  {
    icon: Ticket,
    title: 'Tickets in seconds',
    body: 'Free RSVPs or paid tickets with promo codes — a checkout your guests will love.',
  },
  {
    icon: QrCode,
    title: 'Fast QR check-in',
    body: 'Scan guests in at the door, look them up by name, and track who is inside live.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for the rush',
    body: 'Spaces, redeemables, staff roles, and rock-solid check-in when the doors open.',
  },
];

const steps = [
  { n: '01', title: 'Create your event', body: 'Add the details, set ticket types, and publish in minutes.' },
  { n: '02', title: 'Share & sell', body: 'Send invites, sell tickets, and watch registrations roll in.' },
  { n: '03', title: 'Run the door', body: 'Scan QR codes, check guests in, and track attendance in real time.' },
];

const HEADLINE = ['Discover.', 'Connect.', 'Experience.'];

export function Landing({ events = [], stats, heroVideoUrl, heroPosterUrl }: { events?: LandingEvent[]; stats: PublicLandingStats; heroVideoUrl?: string | null; heroPosterUrl?: string | null }) {
  return (
    <div className="cinematic-page overflow-hidden text-foreground">
      {/* ───────── Hero ───────── */}
      <section className="cinematic-noise relative isolate flex min-h-[90svh] flex-col justify-center overflow-hidden px-4 py-24">
        <HeroBackdrop videoUrl={heroVideoUrl} posterUrl={heroPosterUrl} />
        <div aria-hidden className="cinematic-grid pointer-events-none absolute inset-0 -z-[5]" />
        <TicketOrbit className="absolute -right-32 top-16 -z-[4] hidden size-[38rem] opacity-55 lg:block" />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto w-full max-w-7xl text-left"
        >
          <motion.div variants={item} className="mb-7 flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-4 py-1.5 text-sm font-medium text-brand-green backdrop-blur">
              <Sparkles className="size-3.5" /> The event platform by Move Beyond
            </span>
          </motion.div>

          <h1 className="max-w-5xl font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl lg:text-[5.4rem]">
            {HEADLINE.map((w, i) => (
              <motion.span
                key={w}
                variants={word}
                className={
                  i === HEADLINE.length - 1
                    ? 'mt-gradient-text block'
                    : 'mr-3 inline-block sm:mr-5'
                }
              >
                {w}
              </motion.span>
            ))}
          </h1>

          <motion.p
            variants={item}
            className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            The modern way to run events — from a beautiful page to a
            blazing-fast door. Find what&apos;s happening, grab your ticket in
            seconds, and just show up.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-10 flex flex-col items-start gap-3 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="group h-12 bg-brand-purple px-7 text-base text-white shadow-[0_0_36px_-6px_rgba(91,59,232,0.7)] transition-shadow hover:bg-brand-purple/90 hover:shadow-[0_0_54px_-6px_rgba(91,59,232,0.9)]"
            >
              <Link href="/events">
                Explore events
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-white/15 bg-white/5 px-7 text-base backdrop-blur transition-colors hover:border-brand-green/40 hover:bg-white/10"
            >
              <Link href="/apply-organizer">Host your event</Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          variants={item}
          initial="hidden"
          animate="show"
          className="cinematic-panel absolute inset-x-4 bottom-8 mx-auto hidden max-w-7xl items-center gap-2 overflow-x-auto rounded-2xl p-2 lg:flex"
        >
          <span className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-purple px-4 py-3 text-sm font-semibold text-white">
            <LivePulse /> Live discovery
          </span>
          {['Today', 'This weekend', 'Free events', 'Sports', 'Music'].map((label) => (
            <Link
              key={label}
              href={`/events?quick=${encodeURIComponent(label.toLowerCase())}`}
              className="shrink-0 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </motion.div>

        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="absolute bottom-5 lg:hidden"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="size-6 text-muted-foreground/60" />
          </motion.div>
        </motion.div>
      </section>

      {/* ───────── Category marquee ───────── */}
      <Marquee />

      {/* ───────── Happening soon (live events) ───────── */}
      {events.length > 0 && (
        <section id="happening-soon" className="scroll-mt-24 px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
              className="mb-12 flex flex-wrap items-end justify-between gap-4"
            >
              <div>
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-green">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-green opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-brand-green" />
                  </span>
                  Happening soon
                </span>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Don&apos;t miss what&apos;s next
                </h2>
              </div>
              <Button asChild variant="ghost" className="group text-brand-green hover:text-brand-green">
                <Link href="/events">
                  View all events
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event, i) => (
                <LandingEventCard key={event.id} event={event} index={i} featured={i === 0 && events.length > 2} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────── Live platform signals ───────── */}
      <section id="platform-signals" className="scroll-mt-24 border-y border-white/5 bg-white/[0.02] px-4 py-14">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 text-center lg:grid-cols-4">
          {[
            { icon: CalendarDays, value: stats.upcomingEvents, label: 'Upcoming events' },
            { icon: Ticket, value: stats.ticketsIssued, label: 'Active tickets' },
            { icon: Building2, value: stats.organizers, label: 'Active organizers' },
            { icon: Globe2, value: stats.cities, label: 'Cities with events' },
          ].map((s) => (
            <div key={s.label}>
              <s.icon className="mx-auto mb-3 size-5 text-brand-green" />
              <div className="font-heading text-3xl font-bold text-foreground sm:text-4xl">{s.value.toLocaleString()}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Brand relationship ───────── */}
      <section id="built-by-move-beyond" className="scroll-mt-24 px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#081a31] via-[#080b17] to-brand-purple/20 lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex min-h-64 items-center justify-center p-8"><MoveTickBrand /></div>
          <div className="hidden w-px bg-gradient-to-b from-transparent via-white/15 to-transparent lg:block" />
          <div className="flex flex-col justify-start p-8 sm:p-12">
            <p className="cinematic-kicker">Built by Move Beyond</p>
            <MoveBeyondBrand className="-ml-5 mt-1 mb-6" />
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Event technology backed by real operational experience.</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">Move-Tick brings discovery, registration, payments, mobile tickets, invitations, live entry, and attendance intelligence into one connected experience.</p>
          </div>
        </motion.div>
      </section>

      {/* ───────── Ticket experience ───────── */}
      <section id="ticket-experience" className="scroll-mt-24 px-4 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <p className="cinematic-kicker">From discovery to the door</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-5xl">The ticket becomes part of the experience.</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">Guests find an event, choose the right pass, pay securely, and receive a wallet-quality QR ticket ready for the entrance.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[['Instant delivery', 'A clear mobile ticket immediately after registration.'], ['Always accessible', 'Ticket details, directions, benefits, and status in one place.'], ['Fast entry', 'High-contrast QR presentation designed for event-day scanning.'], ['Live status', 'Used, refunded, cancelled, and active states stay unmistakable.']].map(([title, body]) => <div key={title} className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-green" /><div><h3 className="font-heading font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{body}</p></div></div>)}
            </div>
            <Button asChild className="mt-9"><Link href="/events">Find your next ticket <ArrowRight className="size-4" /></Link></Button>
          </motion.div>
          <motion.div initial={{ opacity: 0, rotate: 3, y: 30 }} whileInView={{ opacity: 1, rotate: -2, y: 0 }} whileHover={{ rotate: 0, y: -8 }} viewport={{ once: true }} className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-8 rounded-full bg-brand-purple/35 blur-[80px]" />
            <Image src="/brand/ticket with content.png" alt="Move-Tick digital event ticket example" width={1086} height={1448} className="relative w-full rounded-[2rem] shadow-2xl shadow-brand-purple/20" />
          </motion.div>
        </div>
      </section>

      {/* ───────── Two audiences ───────── */}
      <section className="px-4 py-20">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-2">
          {[{ icon: Smartphone, eyebrow: 'For attendees', title: 'Your next experience, always within reach.', body: 'Discover curated events, manage invitations, keep every ticket together, and get the exact information you need before arriving.', href: '/events', action: 'Explore events' }, { icon: Users, eyebrow: 'For organizers', title: 'Everything from first announcement to final scan.', body: 'Publish richer event stories, sell multiple passes, invite priority guests, manage teams, and understand attendance in real time.', href: '/apply-organizer', action: 'Host an event' }].map((panel) => <motion.article key={panel.eyebrow} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-card-glow rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10"><panel.icon className="size-8 text-brand-green" /><p className="cinematic-kicker mt-6">{panel.eyebrow}</p><h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{panel.title}</h2><p className="mt-4 leading-relaxed text-muted-foreground">{panel.body}</p><Button asChild variant="outline" className="mt-7 border-white/15 bg-white/5"><Link href={panel.href}>{panel.action}<ArrowRight className="size-4" /></Link></Button></motion.article>)}
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Built for how you run events
            </h2>
            <p className="mt-3 text-muted-foreground">
              Everything from the first invite to the last scan — in one place.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={item}
                  whileHover={{ y: -6 }}
                  className="mt-card-glow group rounded-2xl border border-white/8 bg-white/[0.03] p-6"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-brand-purple/15 p-3 text-brand-purple transition-colors group-hover:bg-brand-purple/25">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section className="border-t border-white/5 px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-3 text-muted-foreground">From idea to doors-open in three steps.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="mt-card-glow relative rounded-2xl border border-white/8 bg-white/[0.03] p-7"
              >
                <span className="font-display text-5xl font-extrabold text-brand-purple/30">{s.n}</span>
                <h3 className="mt-3 font-heading text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="px-4 pb-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-purple/30 via-background to-background p-10 text-center sm:p-16"
        >
          <div aria-hidden className="mt-pulse-glow pointer-events-none absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-brand-green/20 blur-[100px]" />
          <Zap className="mx-auto mb-4 size-8 text-brand-green" />
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to host your next event?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Join the organizers already running unforgettable events on Move-Tick.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-brand-green text-brand-black hover:bg-brand-green/90">
              <Link href="/apply-organizer">Apply as organizer</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10">
              <Link href="/events">Browse events</Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
