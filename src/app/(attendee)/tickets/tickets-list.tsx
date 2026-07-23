import Link from 'next/link';
import Image from 'next/image';
import type { TicketWithJoins } from '@/services/tickets.service';
import { ArrowRight, CalendarDays, MapPin, Ticket as TicketIcon } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { isOptimizableImage } from '@/lib/helpers';

export function TicketsList({ tickets }: { tickets: TicketWithJoins[] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {tickets.map((ticket) => {
        const event = ticket.event;
        const ticketType = ticket.ticket_type;
        if (!event) return null;
        const upcoming = new Date(event.start_date) > new Date();

        return (
          <Link
            key={ticket.id}
            href={`/tickets/${ticket.id}`}
            className="ticket-cutout mt-card-glow group relative grid min-h-64 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0d1019] sm:grid-cols-[42%_1fr]"
          >
            <div className="relative min-h-44 overflow-hidden bg-brand-purple/20 sm:min-h-full">
              {event.cover_image_url ? (
                <Image src={event.cover_image_url} alt="" fill sizes="(max-width: 640px) 100vw, 35vw" unoptimized={!isOptimizableImage(event.cover_image_url)} className="object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : <div className="cinematic-grid absolute inset-0" />}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d1019] via-transparent to-black/15 sm:bg-gradient-to-r sm:from-transparent sm:to-[#0d1019]" />
              <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                {ticket.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="relative flex min-w-0 flex-col p-5 sm:p-6">
              <div className="ticket-perforation absolute inset-y-5 left-0 hidden w-1 bg-repeat-y opacity-40 sm:block" />
              <p className="cinematic-kicker">{ticketType?.visual_label || ticketType?.name || 'Event ticket'}</p>
              <h2 className="mt-2 line-clamp-2 font-heading text-2xl font-bold leading-tight text-white">{event.title}</h2>
              <div className="mt-5 space-y-2 text-sm text-white/55">
                <p className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0 text-[#a98fff]" />{format(new Date(event.start_date), 'EEE, MMM d · h:mm a')}</p>
                <p className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-brand-green" /><span className="truncate">{[event.venue, event.city].filter(Boolean).join(', ') || 'Venue TBA'}</span></p>
                <p className="flex items-center gap-2"><TicketIcon className="size-4 shrink-0 text-[#a98fff]" />{ticketType?.name ?? 'General admission'}</p>
              </div>
              <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                <div>{upcoming && <><p className="text-[10px] uppercase tracking-wider text-white/35">Starts in</p><p className="font-heading text-lg font-bold text-brand-green">{formatDistanceToNowStrict(new Date(event.start_date))}</p></>}</div>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-white transition-colors group-hover:text-brand-green">Open ticket <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
