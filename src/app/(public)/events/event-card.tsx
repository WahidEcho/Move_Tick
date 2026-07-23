import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, CalendarDays, MapPin, Sparkles, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { EventWithDetails } from '@/services/events.service';
import { isOptimizableImage as canOptimize } from '@/lib/helpers';
import { formatEgp } from '@/lib/helpers';

interface EventCardProps {
  event: EventWithDetails;
  confirmedCount: number;
  featured?: boolean;
}

export { canOptimize as isOptimizableImage };

export function EventCard({ event, confirmedCount, featured = false }: EventCardProps) {
  const capacity = event.capacity ?? null;
  const remaining = capacity === null ? null : Math.max(0, capacity - confirmedCount);
  const isFull = remaining === 0;
  const sellingFast = remaining !== null && !isFull && (remaining <= 12 || remaining / Math.max(capacity ?? 1, 1) <= 0.2);
  const publicTickets = (event.ticket_types ?? []).filter((ticket) => ticket.is_active && ticket.visibility === 'public');
  const fromPrice = publicTickets.length ? Math.min(...publicTickets.map((ticket) => Number(ticket.price))) : null;
  const badge = isFull
    ? { label: 'Sold out', className: 'bg-white/90 text-black' }
    : sellingFast
      ? { label: 'Selling fast', className: 'bg-brand-green text-brand-black' }
      : event.is_featured || featured
        ? { label: 'Featured', className: 'bg-brand-purple text-white' }
        : fromPrice === 0
          ? { label: 'Free', className: 'bg-brand-green text-brand-black' }
          : null;

  return (
    <article className={`mt-card-glow group relative h-full overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0d0f17] ${featured ? 'sm:col-span-2 lg:row-span-2' : ''}`}>
      <Link href={`/events/${event.slug}`} className="flex h-full flex-col" aria-label={`View ${event.title}`}>
        <div className={`relative overflow-hidden bg-gradient-to-br from-brand-purple/25 via-[#151827] to-black ${featured ? 'min-h-80 flex-1 sm:min-h-[31rem]' : 'aspect-[16/10]'}`}>
          {event.cover_image_url ? (
            <Image
              src={event.cover_image_url}
              alt={event.title}
              fill
              sizes={featured ? '(max-width: 1024px) 100vw, 66vw' : '(max-width: 640px) 100vw, 33vw'}
              unoptimized={!canOptimize(event.cover_image_url)}
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
            />
          ) : (
            <div aria-hidden className="cinematic-grid absolute inset-0 opacity-70" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#08090d] via-black/15 to-black/20" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <div className="rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-center backdrop-blur-xl">
              <span className="block font-display text-xl font-extrabold leading-none text-white">{format(new Date(event.start_date), 'dd')}</span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[.18em] text-[#b6a8ff]">{format(new Date(event.start_date), 'MMM')}</span>
            </div>
            {badge && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${badge.className}`}>
                {(event.is_featured || featured) && !isFull && !sellingFast && <Sparkles className="size-3" />}
                {badge.label}
              </span>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            {event.category && <p className="cinematic-kicker mb-2">{event.category}</p>}
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className={`${featured ? 'text-3xl sm:text-4xl' : 'text-xl'} line-clamp-2 font-heading font-bold leading-tight text-white`}>
                  {event.title}
                </h2>
                {event.organization?.name && (
                  <p className="mt-1.5 truncate text-sm text-white/65">by {event.organization.name}</p>
                )}
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/20 bg-black/35 text-white transition-all group-hover:border-brand-purple group-hover:bg-brand-purple">
                <ArrowUpRight className="size-4" />
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-white/8 p-4 text-sm text-white/60 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0 space-y-1.5">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-3.5 shrink-0 text-[#9b84ff]" />
              <span className="truncate">{format(new Date(event.start_date), 'EEE, MMM d · h:mm a')}</span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0 text-brand-green" />
              <span className="truncate">{[event.venue, event.city].filter(Boolean).join(', ') || 'Venue to be announced'}</span>
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
            {remaining !== null && (
              <p className={`flex items-center gap-1.5 text-xs sm:justify-end ${sellingFast ? 'text-brand-green' : ''}`}>
                <Users className="size-3.5" /> {isFull ? 'Sold out' : `${remaining} left`}
              </p>
            )}
            <p className="mt-1 font-heading text-lg font-bold text-white">
              {fromPrice === null ? 'View tickets' : fromPrice === 0 ? 'Free' : `From ${formatEgp(fromPrice)}`}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
