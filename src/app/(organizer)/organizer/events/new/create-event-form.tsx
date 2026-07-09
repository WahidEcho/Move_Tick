'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { eventSchema, type EventInput } from '@/lib/validations';
import { EVENT_CATEGORIES } from '@/lib/constants';
import { FACILITIES } from '@/lib/facilities';
import { generateSlug } from '@/lib/helpers';
import { FormField } from '@/components/forms/form-field';
import { FormSelect } from '@/components/forms/form-select';
import { ImageUpload } from '@/components/forms/image-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createEventAction } from './actions';
import { ArrowLeft } from 'lucide-react';

const VISIBILITY_OPTIONS = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
  { label: 'Invite Only', value: 'invite_only' },
  { label: 'Members Only', value: 'members_only' },
];

const CATEGORY_OPTIONS = EVENT_CATEGORIES.map((c) => ({ label: c, value: c }));

export function CreateEventForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventInput>({
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
      doors_open_time: '',
      maps_url: '',
      facilities: [],
    },
  });

  const title = watch('title');
  const slug = watch('slug');

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue('title', v);
    if (!slug || slug === generateSlug(title)) {
      setValue('slug', generateSlug(v));
    }
  };

  const onSubmit = async (data: EventInput) => {
    setSubmitError(null);
    const result = await createEventAction(data);
    if (result.success) {
      router.push(`/organizer/events/${result.eventId}`);
    } else {
      setSubmitError(result.error);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/organizer/events">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Create Event</h2>
          <p className="text-sm text-muted-foreground">
            Add a new event for your organization
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Title"
              name="title"
              error={errors.title?.message}
              required
            >
              <Input
                {...register('title')}
                onChange={handleTitleChange}
                placeholder="Event title"
                autoFocus
              />
            </FormField>

            <FormField
              label="Slug"
              name="slug"
              error={errors.slug?.message}
              description="URL-friendly identifier. Auto-generated from title."
              required
            >
              <Input {...register('slug')} placeholder="event-slug" />
            </FormField>

            <FormField
              label="Description"
              name="description"
              error={errors.description?.message}
              required
            >
              <Textarea
                {...register('description')}
                placeholder="Describe your event..."
                rows={5}
              />
            </FormField>

            <FormSelect
              label="Category"
              name="category"
              options={CATEGORY_OPTIONS}
              placeholder="Select category"
              value={watch('category')}
              onChange={(v) => setValue('category', v)}
              error={errors.category?.message}
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
              error={errors.start_date?.message}
              required
            >
              <Input
                type="datetime-local"
                {...register('start_date')}
              />
            </FormField>

            <FormField
              label="End Date & Time"
              name="end_date"
              error={errors.end_date?.message}
              required
            >
              <Input
                type="datetime-local"
                {...register('end_date')}
              />
            </FormField>

            <FormField label="Location" name="location" error={errors.location?.message}>
              <Input {...register('location')} placeholder="Full address" />
            </FormField>

            <FormField label="Venue" name="venue" error={errors.venue?.message}>
              <Input {...register('venue')} placeholder="Venue name" />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="City" name="city" error={errors.city?.message}>
                <Input {...register('city')} placeholder="City" />
              </FormField>
              <FormField label="Country" name="country" error={errors.country?.message}>
                <Input {...register('country')} placeholder="Country" />
              </FormField>
            </div>

            <FormField
              label="Google Maps link"
              name="maps_url"
              error={errors.maps_url?.message}
              description="Shown as an “Open in Maps” button on your event page."
            >
              <Input {...register('maps_url')} placeholder="https://maps.google.com/..." />
            </FormField>

            <FormField label="Doors open" name="doors_open_time" error={errors.doors_open_time?.message}>
              <Input type="datetime-local" {...register('doors_open_time')} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Venue facilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FACILITIES.map((f) => {
                const Icon = f.icon;
                const selected = (watch('facilities') ?? []).includes(f.value);
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => {
                      const current = watch('facilities') ?? [];
                      setValue(
                        'facilities',
                        selected ? current.filter((v) => v !== f.value) : [...current, f.value]
                      );
                    }}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
                      selected ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {f.label}
                  </button>
                );
              })}
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
              value={watch('visibility')}
              onChange={(v) => setValue('visibility', v as EventInput['visibility'])}
              error={errors.visibility?.message}
            />

            <p className="text-xs text-muted-foreground">
              Capacity is set automatically from your ticket types — add them
              after creating the event.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cover Image</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              label="Cover Image"
              name="cover_image_url"
              error={errors.cover_image_url?.message}
            >
              <ImageUpload
                orgId={orgId}
                value={watch('cover_image_url')}
                onChange={(url) => setValue('cover_image_url', url, { shouldDirty: true })}
              />
            </FormField>
          </CardContent>
        </Card>

        {submitError && (
          <p className="text-sm text-destructive">{submitError}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/organizer/events">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
