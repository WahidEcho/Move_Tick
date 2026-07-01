import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { EventWithDetails } from '@/services/events.service';

interface EventCardProps {
  event: EventWithDetails;
  /** Confirmed/approved registrations — batched by the parent page (avoids a per-card query). */
  confirmedCount: number;
}

/**
 * Cover URLs are organizer-provided free text. Only Supabase Storage images go
 * through the optimizer (matches next.config remotePatterns); any other host is
 * served as-is so arbitrary URLs don't crash next/image.
 */
export function isOptimizableImage(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    return hostname.endsWith('.supabase.co') && pathname.startsWith('/storage/v1/object/public/');
  } catch {
    return false;
  }
}

export function EventCard({ event, confirmedCount }: EventCardProps) {
  const capacity = event.capacity ?? null;
  const isFull = capacity !== null && confirmedCount >= capacity;
  const capacityStatus = capacity
    ? isFull
      ? 'Full'
      : `${capacity - confirmedCount} spots left`
    : null;

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-brand-purple/40 hover:shadow-lg hover:shadow-brand-purple/10">
      <Link href={`/events/${event.slug}`} className="block overflow-hidden">
        <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-brand-purple/25 via-brand-purple/10 to-muted">
          {event.cover_image_url ? (
            <Image
              src={event.cover_image_url}
              alt={event.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized={!isOptimizableImage(event.cover_image_url)}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
        </div>
      </Link>
      <CardHeader className="flex-1">
        <CardTitle className="line-clamp-2">
          <Link href={`/events/${event.slug}`} className="hover:text-primary">
            {event.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-4 shrink-0" />
          <span>{format(new Date(event.start_date), 'EEE, MMM d, yyyy · h:mm a')}</span>
        </div>
        {(event.venue || event.city) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            <span>{[event.venue, event.city].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {event.category && (
          <Badge variant="secondary" className="w-fit">
            {event.category}
          </Badge>
        )}
      </CardContent>
      <div className="border-t px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {capacityStatus && (
            <span
              className={`flex items-center gap-1.5 text-sm ${
                isFull ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              <Users className="size-4" />
              {capacityStatus}
            </span>
          )}
          <Button asChild size="sm" variant="default">
            <Link href={`/events/${event.slug}`}>View event</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
