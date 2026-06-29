'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
  QrCode,
  Ticket,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setVal(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 1.6,
      ease: 'easeOut',
      onUpdate: (v) => setVal(Math.floor(v)),
    });
    return () => controls.stop();
  }, [inView, to, reduce]);
  return (
    <span ref={ref}>
      {val.toLocaleString()}
      {suffix}
    </span>
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

export function Landing() {
  return (
    <div className="overflow-hidden bg-background text-foreground">
      {/* ───────── Hero ───────── */}
      <section className="relative isolate px-4 pt-20 pb-28 sm:pt-28 sm:pb-36">
        {/* ambient glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="mt-float absolute -top-24 left-1/4 size-[34rem] rounded-full bg-brand-purple/30 blur-[120px]" />
          <div className="mt-float-slow absolute top-32 right-1/5 size-[28rem] rounded-full bg-brand-green/20 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div variants={item} className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-4 py-1.5 text-sm font-medium text-brand-green">
              <Sparkles className="size-3.5" /> The event platform by Move Beyond
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
          >
            Discover. Connect.{' '}
            <span className="mt-gradient-text">Experience.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground"
          >
            Move-Tick is the modern way to run events — from a beautiful page to a
            blazing-fast door. Discover what&apos;s happening, grab your ticket in
            seconds, and just show up.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="group bg-brand-purple text-white hover:bg-brand-purple/90">
              <Link href="/events">
                Explore events
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/15 bg-white/5 backdrop-blur hover:bg-white/10">
              <Link href="/apply-organizer">Host your event</Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

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
                  className="group rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors hover:border-brand-purple/40"
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
                className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-7"
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
