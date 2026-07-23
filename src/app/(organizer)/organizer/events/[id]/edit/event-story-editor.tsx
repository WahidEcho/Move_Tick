'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, Loader2, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { replaceEventStoryAction, type EventStoryInput } from './actions';
import type { EventStoryContent } from '@/services/events.service';

const lines = (value: string) => value.split('\n').map((line) => line.trim()).filter(Boolean);
const cells = (line: string) => line.split('|').map((cell) => cell.trim());

export function EventStoryEditor({ eventId, slug, initial }: { eventId: string; slug: string; initial: EventStoryContent }) {
  const [media, setMedia] = useState(initial.media.map((x) => [x.media_type, x.url, x.alt_text ?? '', x.caption ?? '', x.poster_url ?? ''].join(' | ')).join('\n'));
  const [highlights, setHighlights] = useState(initial.highlights.map((x) => [x.title, x.description ?? '', x.icon_key ?? 'sparkles'].join(' | ')).join('\n'));
  const [agenda, setAgenda] = useState(initial.agenda.map((x) => [x.starts_at, x.title, x.location ?? '', x.description ?? '', x.ends_at ?? ''].join(' | ')).join('\n'));
  const [speakers, setSpeakers] = useState(initial.speakers.map((x) => [x.name, x.role ?? '', x.image_url ?? '', x.biography ?? '', x.social_url ?? ''].join(' | ')).join('\n'));
  const [faqs, setFaqs] = useState(initial.faqs.map((x) => [x.question, x.answer].join(' | ')).join('\n'));
  const [saving, setSaving] = useState(false);

  const previewCount = useMemo(() => lines(media).length + lines(highlights).length + lines(agenda).length + lines(speakers).length + lines(faqs).length, [media, highlights, agenda, speakers, faqs]);

  const save = async () => {
    const data: EventStoryInput = {
      media: lines(media).map((line) => { const [mediaType, url, alt_text, caption, poster_url] = cells(line); const media_type: 'image' | 'video' = mediaType === 'video' ? 'video' : 'image'; return { media_type, url, alt_text, caption, poster_url }; }).filter((x) => Boolean(x.url)),
      highlights: lines(highlights).map((line) => { const [title, description, icon_key] = cells(line); return { title, description, icon_key }; }).filter((x) => Boolean(x.title)),
      agenda: lines(agenda).map((line) => { const [starts_at, title, location, description, ends_at] = cells(line); return { starts_at, title, location, description, ends_at }; }).filter((x) => Boolean(x.starts_at && x.title)),
      speakers: lines(speakers).map((line) => { const [name, role, image_url, biography, social_url] = cells(line); return { name, role, image_url, biography, social_url }; }).filter((x) => Boolean(x.name)),
      faqs: lines(faqs).map((line) => { const [question, answer] = cells(line); return { question, answer }; }).filter((x) => Boolean(x.question && x.answer)),
    };
    setSaving(true);
    const result = await replaceEventStoryAction(eventId, data);
    setSaving(false);
    if (result.success) toast.success('Event story updated'); else toast.error(result.error);
  };

  const sections = [
    { label: 'Media gallery', help: 'type | URL | alt text | caption | video poster URL', value: media, set: setMedia, placeholder: 'image | https://…/stage.webp | Main stage at night | Opening performance' },
    { label: 'Highlights', help: 'title | description | icon key', value: highlights, set: setHighlights, placeholder: 'International lineup | Artists from across the region | music' },
    { label: 'Schedule', help: 'ISO start time | title | location | description | ISO end time', value: agenda, set: setAgenda, placeholder: '2026-08-12T19:00:00+03:00 | Doors open | Main gate | Welcome and check-in' },
    { label: 'People', help: 'name | role | image URL | biography | social URL', value: speakers, set: setSpeakers, placeholder: 'Maya Noor | Headliner | https://…/maya.webp | Electronic artist | https://instagram.com/…' },
    { label: 'FAQs', help: 'question | answer', value: faqs, set: setFaqs, placeholder: 'Can I transfer my ticket? | Yes, before the event begins.' },
  ];

  return <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/[0.04]">
    <CardHeader className="flex-row items-start justify-between gap-4">
      <div><p className="cinematic-kicker"><Sparkles className="mr-1 inline size-3" />Rich content</p><CardTitle className="mt-2">Event story</CardTitle><p className="mt-1 text-sm text-muted-foreground">One item per line. Drag-free ordering makes updates fast; the public page follows this order.</p></div>
      <Button asChild variant="outline" size="sm"><Link href={`/events/${slug}`} target="_blank"><Eye className="size-4" />Preview</Link></Button>
    </CardHeader>
    <CardContent className="space-y-6">
      {sections.map((section) => <div key={section.label} className="space-y-2"><div><Label>{section.label}</Label><p className="text-xs text-muted-foreground">{section.help}</p></div><Textarea value={section.value} onChange={(e) => section.set(e.target.value)} rows={4} placeholder={section.placeholder} className="font-mono text-xs" /></div>)}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><p className="text-sm text-muted-foreground"><Plus className="mr-1 inline size-4" />{previewCount} authored story items</p><Button type="button" onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Save story</Button></div>
    </CardContent>
  </Card>;
}
