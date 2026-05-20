'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase-browser';
import { organizerApplicationSchema, type OrganizerApplicationInput } from '@/lib/validations';
import {
  EVENT_CATEGORIES,
  ORGANIZATION_TYPES,
  COUNTRIES,
} from '@/lib/constants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/form-field';
import { FormSelect } from '@/components/forms/form-select';
import { MultiSelect } from '@/components/forms/multi-select';
import { Loader2, CheckCircle } from 'lucide-react';
import { getMyApplication, submitApplyOrganizer } from './apply-organizer-action';
import type { OrganizerApplicationWithProfile } from '@/services/organizerApplications.service';

export default function ApplyOrganizerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [existingApplication, setExistingApplication] =
    useState<OrganizerApplicationWithProfile | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login?redirect=/apply-organizer');
          return;
        }
        const app = await getMyApplication();
        setExistingApplication(app ?? null);
      } catch (err) {
        console.error('Error loading application:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndFetch();
  }, [router]);

  const form = useForm<OrganizerApplicationInput>({
    resolver: zodResolver(organizerApplicationSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      role_title: '',
      organization_name: '',
      organization_type: '',
      website: '',
      instagram: '',
      linkedin: '',
      country: '',
      city: '',
      organization_description: '',
      event_categories: [],
      expected_events_per_month: 1,
      expected_avg_attendees: 50,
      terms_accepted: false,
    },
  });

  const onSubmit = async (data: OrganizerApplicationInput) => {
    setSubmitError(null);
    const result = await submitApplyOrganizer(data);
    if (result.success) {
      setSuccess(true);
      const app = await getMyApplication();
      setExistingApplication(app ?? null);
    } else {
      setSubmitError(result.error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-green-500/10 p-4">
                <CheckCircle className="size-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold">Application submitted</h1>
              <p className="text-muted-foreground">
                Thank you for applying to become an organizer. We&apos;ll review your
                application and get back to you soon.
              </p>
              <Button asChild variant="default">
                <Link href="/">Return home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingApplication && existingApplication.status === 'pending') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Application status</CardTitle>
            <p className="text-sm text-muted-foreground">
              You have a pending organizer application. We&apos;ll notify you once it has
              been reviewed.
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Status: Pending review
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Submitted on{' '}
                {new Date(existingApplication.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/">Return home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingApplication && existingApplication.status === 'approved') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Already approved</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your organizer application has been approved. You can access the organizer
              dashboard.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild variant="default">
              <Link href="/organizer">Go to organizer dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orgTypeOptions = ORGANIZATION_TYPES.map((t) => ({ label: t, value: t }));
  const countryOptions = COUNTRIES.map((c) => ({ label: c, value: c }));
  const categoryOptions = EVENT_CATEGORIES.map((c) => ({ label: c, value: c }));

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Apply as organizer</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us about your organization and event plans.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your contact details for this application
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Full name"
              name="full_name"
              error={form.formState.errors.full_name?.message}
              required
            >
              <Input
                id="full_name"
                {...form.register('full_name')}
                placeholder="Your full name"
                aria-invalid={!!form.formState.errors.full_name}
              />
            </FormField>
            <FormField
              label="Email"
              name="email"
              error={form.formState.errors.email?.message}
              required
            >
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="you@example.com"
                aria-invalid={!!form.formState.errors.email}
              />
            </FormField>
            <FormField
              label="Phone"
              name="phone"
              error={form.formState.errors.phone?.message}
              required
            >
              <Input
                id="phone"
                {...form.register('phone')}
                placeholder="+1 234 567 8900"
                aria-invalid={!!form.formState.errors.phone}
              />
            </FormField>
            <FormField
              label="Role / title"
              name="role_title"
              error={form.formState.errors.role_title?.message}
            >
              <Input
                id="role_title"
                {...form.register('role_title')}
                placeholder="e.g. Event Director"
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle>Organization details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Information about your organization
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Organization name"
              name="organization_name"
              error={form.formState.errors.organization_name?.message}
              required
            >
              <Input
                id="organization_name"
                {...form.register('organization_name')}
                placeholder="Your organization name"
                aria-invalid={!!form.formState.errors.organization_name}
              />
            </FormField>
            <Controller
              name="organization_type"
              control={form.control}
              render={({ field }) => (
                <FormSelect
                  label="Organization type"
                  name="organization_type"
                  options={orgTypeOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select type"
                  error={form.formState.errors.organization_type?.message}
                  required
                />
              )}
            />
            <FormField
              label="Website"
              name="website"
              error={form.formState.errors.website?.message}
            >
              <Input
                id="website"
                type="url"
                {...form.register('website')}
                placeholder="https://example.com"
              />
            </FormField>
            <FormField
              label="Instagram"
              name="instagram"
              error={form.formState.errors.instagram?.message}
            >
              <Input
                id="instagram"
                {...form.register('instagram')}
                placeholder="@username"
              />
            </FormField>
            <FormField
              label="LinkedIn"
              name="linkedin"
              error={form.formState.errors.linkedin?.message}
            >
              <Input
                id="linkedin"
                {...form.register('linkedin')}
                placeholder="https://linkedin.com/company/..."
              />
            </FormField>
            <Controller
              name="country"
              control={form.control}
              render={({ field }) => (
                <FormSelect
                  label="Country"
                  name="country"
                  options={countryOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select country"
                  error={form.formState.errors.country?.message}
                  required
                />
              )}
            />
            <FormField
              label="City"
              name="city"
              error={form.formState.errors.city?.message}
              required
            >
              <Input
                id="city"
                {...form.register('city')}
                placeholder="City"
                aria-invalid={!!form.formState.errors.city}
              />
            </FormField>
            <FormField
              label="Organization description"
              name="organization_description"
              error={form.formState.errors.organization_description?.message}
              required
            >
              <Textarea
                id="organization_description"
                {...form.register('organization_description')}
                placeholder="Describe your organization, mission, and the events you plan to host..."
                rows={4}
                aria-invalid={!!form.formState.errors.organization_description}
                className="min-h-24"
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Event Planning */}
        <Card>
          <CardHeader>
            <CardTitle>Event planning</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your event categories and expected volume
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              name="event_categories"
              control={form.control}
              render={({ field }) => (
                <MultiSelect
                  label="Event categories"
                  options={categoryOptions}
                  selected={field.value}
                  onChange={field.onChange}
                  placeholder="Select categories"
                  error={form.formState.errors.event_categories?.message}
                />
              )}
            />
            <FormField
              label="Expected events per month"
              name="expected_events_per_month"
              error={form.formState.errors.expected_events_per_month?.message}
              required
            >
              <Input
                id="expected_events_per_month"
                type="number"
                min={1}
                max={100}
                {...form.register('expected_events_per_month', { valueAsNumber: true })}
                aria-invalid={!!form.formState.errors.expected_events_per_month}
              />
            </FormField>
            <FormField
              label="Expected average attendees per event"
              name="expected_avg_attendees"
              error={form.formState.errors.expected_avg_attendees?.message}
              required
            >
              <Input
                id="expected_avg_attendees"
                type="number"
                min={1}
                max={100000}
                {...form.register('expected_avg_attendees', { valueAsNumber: true })}
                aria-invalid={!!form.formState.errors.expected_avg_attendees}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms_accepted"
                checked={form.watch('terms_accepted')}
                onCheckedChange={(checked) =>
                  form.setValue('terms_accepted', checked === true)
                }
                aria-invalid={!!form.formState.errors.terms_accepted}
              />
              <Label htmlFor="terms_accepted" className="text-sm leading-relaxed">
                I accept the organizer terms and agree to host events in compliance with
                Move Beyond&apos;s policies.
              </Label>
            </div>
            {form.formState.errors.terms_accepted && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.terms_accepted.message}
              </p>
            )}
          </CardContent>
        </Card>

        {submitError && (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit application'
          )}
        </Button>
      </form>
    </div>
  );
}
