'use client';

import { useEffect, useState } from 'react';
import { Check, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function EventActions({ eventId, title }: { eventId: string; title: string }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSaved(JSON.parse(window.localStorage.getItem('move-tick:saved-events') || '[]').includes(eventId));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [eventId]);

  const toggleSaved = () => {
    const current: string[] = JSON.parse(window.localStorage.getItem('move-tick:saved-events') || '[]');
    const next = current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId];
    window.localStorage.setItem('move-tick:saved-events', JSON.stringify(next));
    setSaved(next.includes(eventId));
    toast.success(next.includes(eventId) ? 'Event saved' : 'Removed from saved events');
  };

  const share = async () => {
    const data = { title, text: `Join me at ${title}`, url: window.location.href };
    if (navigator.share) await navigator.share(data).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Event link copied');
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const className = 'border-white/20 bg-black/20 text-white hover:bg-white/10';
  return <div className="flex gap-2">
    <Button onClick={toggleSaved} variant="outline" size="icon-sm" aria-label={saved ? 'Remove saved event' : 'Save event'} className={className}><Heart className="size-4" fill={saved ? 'currentColor' : 'none'} /></Button>
    <Button onClick={share} variant="outline" size="icon-sm" aria-label="Share event" className={className}>{copied ? <Check className="size-4 text-brand-green" /> : <Share2 className="size-4" />}</Button>
  </div>;
}
