'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  motion,
  useInView,
  useReducedMotion,
  animate,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isOptimizableImage } from '@/lib/helpers';
import { HERO_VIDEO_URL, HERO_VIDEO_POSTER } from '@/lib/site-media';

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

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);
  useEffect(() => {
    // With reduced motion the final value renders directly (no animation state).
    if (!inView || reduce) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: 'easeOut',
      onUpdate: (v) => setVal(Math.floor(v)),
    });
    return () => controls.stop();
  }, [inView, to, reduce]);
  const display = reduce ? to : val;
  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

/** Hero backdrop: showcase video when configured, animated aurora otherwise. */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {HERO_VIDEO_URL ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={HERO_VIDEO_POSTER || undefined}
          className="absolute inset-0 size-full object-cover"
          src={HERO_VIDEO_URL}
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

function LandingEventCard({ event, index }: { event: LandingEvent; index: number }) {
  const spotsLeft =
    event.capacity !== null ? Math.max(0, event.capacity - event.confirmed) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: (index % 3) * 0.12, ease: 'easeOut' }}
      whileHover={{ y: -8 }}
      className="mt-card-glow group overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]"
    >
      <Link href={`/events/${event.slug}`} className="block">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-brand-purple/25 via-brand-purple/10 to-muted">
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
            <h3 className="font-heading text-lg font-semibold leading-snug text-white drop-shadow">
              {event.title}
            </h3>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-brand-green/80" />
            <span className="truncate">
              {[event.venue, event.city].filter(Boolean).join(', ') || 'Venue TBA'}
            </span>
          </span>
          {spotsLeft !== null && (
            <span className={spotsLeft === 0 ? 'shrink-0 font-medium text-destructive' : 'shrink-0 font-medium text-brand-green'}>
              {spotsLeft === 0 ? 'Full' : `${spotsLeft} left`}
            </span>
          )}
        </div>
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

export function Landing({ events = [] }: { events?: LandingEvent[] }) {
  return (
    <div className="overflow-hidden bg-background text-foreground">
      {/* ───────── Hero ───────── */}
      <section className="relative isolate flex min-h-[88svh] flex-col items-center justify-center px-4 py-24">
        <HeroBackdrop />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div variants={item} className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-4 py-1.5 text-sm font-medium text-brand-green backdrop-blur">
              <Sparkles className="size-3.5" /> The event platform by Move Beyond
            </span>
          </motion.div>

          <h1 className="font-display text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-7xl">
            {HEADLINE.map((w, i) => (
              <motion.span
                key={w}
                variants={word}
                className={
                  i === HEADLINE.length - 1
                    ? 'mt-gradient-text inline-block'
                    : 'mr-3 inline-block sm:mr-5'
                }
              >
                {w}
              </motion.span>
            ))}
          </h1>

          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl"
          >
            The modern way to run events — from a beautiful page to a
            blazing-fast door. Find what&apos;s happening, grab your ticket in
            seconds, and just show up.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
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
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="absolute bottom-8"
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
        <section className="px-4 py-24">
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
                <LandingEventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────── Stats ───────── */}
      <section className="border-y border-white/5 bg-white/[0.02] px-4 py-14">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 text-center sm:grid-cols-3">
          {[
            { to: 500, suffix: '+', label: 'Events hosted' },
            { to: 50000, suffix: '+', label: 'Tickets issued' },
            { to: 200, suffix: '+', label: 'Organizers' },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                <CountUp to={s.to} suffix={s.suffix} />
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
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
