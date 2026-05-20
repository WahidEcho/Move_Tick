import Link from 'next/link';
import {
  Calendar,
  Users,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Zap,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 px-4 py-24 sm:py-32 lg:py-40">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="container relative mx-auto max-w-5xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Discover. Connect. Experience.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90 sm:text-xl">
            The modern event platform that brings people together. From intimate
            meetups to large-scale conferences—discover events, manage
            registrations, and create unforgettable experiences.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-white px-8 text-purple-600 shadow-xl hover:bg-white/95"
            >
              <Link href="/events" className="gap-2">
                Explore Events
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-2 border-white/40 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/apply-organizer" className="gap-2">
                Host Your Event
                <Sparkles className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b bg-muted/30 px-4 py-20 sm:py-28">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Built for how you run events
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Everything you need to create, promote, and manage world-class events.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Calendar}
              title="Smart Event Discovery"
              description="Browse and filter events by category, location, and date. Find exactly what you're looking for."
            />
            <FeatureCard
              icon={Users}
              title="Community First"
              description="Connect with attendees before, during, and after events. Build lasting relationships."
            />
            <FeatureCard
              icon={Shield}
              title="Secure & Reliable"
              description="Enterprise-grade security for your data. QR ticketing, check-in, and capacity management."
            />
            <FeatureCard
              icon={Zap}
              title="Powerful Operations"
              description="Waitlists, approval flows, spaces, redeemables—all the tools professional organizers need."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20 sm:py-28">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            From discovery to check-in—a seamless experience for everyone.
          </p>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            <StepCard
              step={1}
              title="Discover events"
              description="Browse our curated calendar of conferences, workshops, meetups, and more."
              icon={Globe}
            />
            <StepCard
              step={2}
              title="Register in seconds"
              description="Choose your ticket, complete registration, and get instant confirmation or e-ticket."
              icon={CheckCircle}
            />
            <StepCard
              step={3}
              title="Show up and connect"
              description="Check in with your QR ticket, network with attendees, and enjoy the experience."
              icon={Sparkles}
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30 px-4 py-16 sm:py-20">
        <div className="container mx-auto max-w-5xl">
          <div className="grid gap-12 text-center sm:grid-cols-3">
            <StatItem value="500+" label="Events" />
            <StatItem value="50K+" label="Attendees" />
            <StatItem value="200+" label="Organizers" />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-24 sm:py-32">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to host your next event?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join hundreds of organizers already using Move Beyond to create
            unforgettable experiences.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 h-12 rounded-full px-8"
          >
            <Link href="/apply-organizer" className="gap-2">
              Apply as Organizer
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
        <Icon className="size-6" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  icon: Icon,
}: {
  step: number;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <span className="text-lg font-bold">{step}</span>
      </div>
      <Icon className="mt-4 size-8 text-muted-foreground" />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold text-primary sm:text-5xl">{value}</div>
      <div className="mt-1 text-muted-foreground">{label}</div>
    </div>
  );
}
