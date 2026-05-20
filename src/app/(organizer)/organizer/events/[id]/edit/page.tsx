'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  eventSchema,
  eventSettingsSchema,
  type EventInput,
  type EventSettingsInput,
} from '@/lib/validations';
import { EVENT_CATEGORIES } from '@/lib/constants';
import { generateSlug } from '@/lib/helpers';
import { FormField } from '@/components/forms/form-field';
import { FormSelect } from '@/components/forms/form-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  updateEventAction,
  updateEventSettingsAction,
  publishEventAction,
  cancelEventAction,
} from './actions';
import { ArrowLeft } from 'lucide-react';
import type { EventWithDetails } from '@/services/events.service';

const VISIBILITY_OPTIONS = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
  { label: 'Invite Only', value: 'invite_only' },
  { label: 'Members Only', value: 'members_only' },
];

const CATEGORY_OPTIONS = EVENT_CATEGORIES.map((c) => ({ label: c, value: c }));

function toDatetimeLocal(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const eventForm = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      cover_image_url: '',
      start_date: '',
      end_date: '',
      location: '',
      venue: '',
      city: '',
      country: '',
      category: '',
      visibility: 'public',
      capacity: null,
    },
  });

  const settingsForm = useForm<EventSettingsInput>({
    resolver: zodResolver(eventSettingsSchema),
    defaultValues: {
      approval_required: false,
      enable_waitlist: false,
      show_guest_list: false,
      show_registered_count: true,
      show_remaining_seats: true,
      show_attendee_preview: false,
      show_company_badges: false,
      allow_referrals: false,
      allow_chat: true,
      allow_networking: true,
    },
  });

  const title = eventForm.watch('title');
  const slug = eventForm.watch('slug');

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    eventForm.setValue('title', v);
    if (!slug || slug === generateSlug(title)) {
      eventForm.setValue('slug', generateSlug(v));
    }
  };

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/organizer/events/${eventId}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setEvent(data);
      const ev = data;
      const settings = ev.event_settings ?? {};
      eventForm.reset({
        title: ev.title ?? '',
        slug: ev.slug ?? '',
        description: ev.description ?? '',
        cover_image_url: ev.cover_image_url ?? '',
        start_date: ev.start_date ? toDatetimeLocal(ev.start_date) : '',
        end_date: ev.end_date ? toDatetimeLocal(ev.end_date) : '',
        location: ev.location ?? '',
        venue: ev.venue ?? '',
        city: ev.city ?? '',
        country: ev.country ?? '',
        category: ev.category ?? '',
        visibility: ev.visibility ?? 'public',
        capacity: ev.capacity ?? null,
      });
      settingsForm.reset({
        approval_required: settings.approval_required ?? false,
        enable_waitlist: settings.enable_waitlist ?? false,
        show_guest_list: settings.show_guest_list ?? false,
        show_registered_count: settings.show_registered_count ?? true,
        show_remaining_seats: settings.show_remaining_seats ?? true,
        show_attendee_preview: settings.show_attendee_preview ?? false,
        show_company_badges: settings.show_company_badges ?? false,
        allow_referrals: settings.allow_referrals ?? false,
        allow_chat: settings.allow_chat ?? true,
        allow_networking: settings.allow_networking ?? true,
      });
      setLoading(false);
    }
    load();
  }, [eventId, eventForm, settingsForm]);

  const onEventSubmit = async (data: EventInput) => {
    setSubmitError(null);
    const result = await updateEventAction(eventId, data);
    if (result.success) {
      router.refresh();
    } else {
      setSubmitError(result.error);
    }
  };

  const onSettingsSubmit = async (data: EventSettingsInput) => {
    setSubmitError(null);
    const result = await updateEventSettingsAction(eventId, data);
    if (result.success) {
      router.refresh();
    } else {
      setSubmitError(result.error);
    }
  };

  const onPublish = async () => {
    setSubmitError(null);
    const result = await publishEventAction(eventId);
    if (result.success) router.refresh();
    else setSubmitError(result.error);
  };

  const onCancel = async () => {
    setSubmitError(null);
    const result = await cancelEventAction(eventId);
    if (result.success) router.refresh();
    else setSubmitError(result.error);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Event not found.</p>
        <Button variant="outline" asChild>
          <Link href="/organizer/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/organizer/events/${eventId}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Edit Event</h2>
          <p className="text-sm text-muted-foreground">
            Update event details and settings
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={eventForm.handleSubmit(onEventSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Basic Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  label="Title"
                  name="title"
                  error={eventForm.formState.errors.title?.message}
                  required
                >
                  <Input
                    {...eventForm.register('title')}
                    onChange={handleTitleChange}
                    placeholder="Event title"
                  />
                </FormField>
                <FormField
                  label="Slug"
                  name="slug"
                  error={eventForm.formState.errors.slug?.message}
                  required
                >
                  <Input {...eventForm.register('slug')} placeholder="event-slug" />
                </FormField>
                <FormField
                  label="Description"
                  name="description"
                  error={eventForm.formState.errors.description?.message}
                  required
                >
                  <Textarea
                    {...eventForm.register('description')}
                    placeholder="Describe your event..."
                    rows={5}
                  />
                </FormField>
                <FormSelect
                  label="Category"
                  name="category"
                  options={CATEGORY_OPTIONS}
                  placeholder="Select category"
                  value={eventForm.watch('category')}
                  onChange={(v) => eventForm.setValue('category', v)}
                  error={eventForm.formState.errors.category?.message}
                  required
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Date & Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  label="Start Date & Time"
                  name="start_date"
                  error={eventForm.formState.errors.start_date?.message}
                  required
                >
                  <Input type="datetime-local" {...eventForm.register('start_date')} />
                </FormField>
                <FormField
                  label="End Date & Time"
                  name="end_date"
                  error={eventForm.formState.errors.end_date?.message}
                  required
                >
                  <Input type="datetime-local" {...eventForm.register('end_date')} />
                </FormField>
                <FormField label="Location" name="location" error={eventForm.formState.errors.location?.message}>
                  <Input {...eventForm.register('location')} placeholder="Full address" />
                </FormField>
                <FormField label="Venue" name="venue" error={eventForm.formState.errors.venue?.message}>
                  <Input {...eventForm.register('venue')} placeholder="Venue name" />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="City" name="city" error={eventForm.formState.errors.city?.message}>
                    <Input {...eventForm.register('city')} placeholder="City" />
                  </FormField>
                  <FormField label="Country" name="country" error={eventForm.formState.errors.country?.message}>
                    <Input {...eventForm.register('country')} placeholder="Country" />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visibility & Capacity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormSelect
                  label="Visibility"
                  name="visibility"
                  options={VISIBILITY_OPTIONS}
                  value={eventForm.watch('visibility')}
                  onChange={(v) => eventForm.setValue('visibility', v as EventInput['visibility'])}
                  error={eventForm.formState.errors.visibility?.message}
                />
                <FormField
                  label="Capacity"
                  name="capacity"
                  error={eventForm.formState.errors.capacity?.message}
                >
                  <Input
                    type="number"
                    min={1}
                    {...eventForm.register('capacity', { valueAsNumber: true })}
                    placeholder="Unlimited"
                  />
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cover Image</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  label="Cover Image URL"
                  name="cover_image_url"
                  error={eventForm.formState.errors.cover_image_url?.message}
                >
                  <Input {...eventForm.register('cover_image_url')} placeholder="https://..." type="url" />
                </FormField>
              </CardContent>
            </Card>

            <Button type="submit" disabled={eventForm.formState.isSubmitting}>
              {eventForm.formState.isSubmitting ? 'Saving...' : 'Save Event'}
            </Button>
          </form>
        </div>

        <div className="space-y-8">
          <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>Event Settings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Toggle features and visibility options
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {(
                  [
                    ['approval_required', 'Require approval', 'Attendees need approval before confirmed'],
                    ['enable_waitlist', 'Enable waitlist', 'Show waitlist when full'],
                    ['show_guest_list', 'Show guest list', 'Display attendee list publicly'],
                    ['show_registered_count', 'Show registered count', 'Display registration count'],
                    ['show_remaining_seats', 'Show remaining seats', 'Display available capacity'],
                    ['show_attendee_preview', 'Show attendee preview', 'Preview of who is attending'],
                    ['show_company_badges', 'Show company badges', 'Display company on badges'],
                    ['allow_referrals', 'Allow referrals', 'Attendees can refer others'],
                    ['allow_chat', 'Allow chat', 'Enable in-event chat'],
                    ['allow_networking', 'Allow networking', 'Enable networking features'],
                  ] as const
                ).map(([key, label, desc]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor={key}>{label}</Label>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      id={key}
                      checked={settingsForm.watch(key)}
                      onCheckedChange={(v) => settingsForm.setValue(key, v)}
                    />
                  </div>
                ))}
                <Button type="submit" size="sm" disabled={settingsForm.formState.isSubmitting}>
                  {settingsForm.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>
          </form>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!event.is_published && (
                <Button variant="default" className="w-full" onClick={onPublish}>
                  Publish Event
                </Button>
              )}
              {!event.is_cancelled && (
                <Button variant="destructive" className="w-full" onClick={onCancel}>
                  Cancel Event
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}
    </div>
  );
}
