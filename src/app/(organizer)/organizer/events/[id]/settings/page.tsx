'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventSettingsSchema, type EventSettingsInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { updateEventSettingsAction, cancelEventAction } from '../edit/actions';
import { ConfirmDialog } from '@/components/layout/confirm-dialog';

function toSettingsFormValues(settings: Record<string, boolean> | null): EventSettingsInput {
  if (!settings) {
    return {
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
    };
  }
  return {
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
  };
}

export default function EventSettingsPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const [event, setEvent] = useState<{
    event_settings?: Record<string, boolean> | null;
    is_cancelled?: boolean;
    is_published?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const form = useForm<EventSettingsInput>({
    resolver: zodResolver(eventSettingsSchema),
    defaultValues: toSettingsFormValues(null),
  });

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/organizer/events/${eventId}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setEvent(data);
      const settings = data.event_settings ?? {};
      form.reset(toSettingsFormValues(settings));
      setLoading(false);
    }
    load();
  }, [eventId, form]);

  const onSettingsSubmit = async (data: EventSettingsInput) => {
    setSubmitError(null);
    const result = await updateEventSettingsAction(eventId, data);
    if (result.success) {
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              event_settings: {
                ...prev.event_settings,
                ...data,
              } as Record<string, boolean>,
            }
          : prev
      );
    } else {
      setSubmitError(result.error);
    }
  };

  const onCancelEvent = async () => {
    setSubmitError(null);
    const result = await cancelEventAction(eventId);
    if (result.success) {
      setEvent((prev) => (prev ? { ...prev, is_cancelled: true } : prev));
      setCancelOpen(false);
    } else {
      setSubmitError(result.error);
    }
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
      </div>
    );
  }

  const registrationSettings = [
    ['approval_required', 'Require approval', 'Attendees need approval before confirmed'],
    ['enable_waitlist', 'Enable waitlist', 'Show waitlist when event is full'],
  ] as const;

  const socialProofSettings = [
    ['show_guest_list', 'Show guest list', 'Display attendee list publicly'],
    ['show_registered_count', 'Show registered count', 'Display registration count'],
    ['show_remaining_seats', 'Show remaining seats', 'Display available capacity'],
    ['show_attendee_preview', 'Show attendee preview', 'Preview of who is attending'],
    ['show_company_badges', 'Show company badges', 'Display company on badges'],
  ] as const;

  const featureSettings = [
    ['allow_referrals', 'Allow referrals', 'Attendees can refer others'],
    ['allow_chat', 'Allow chat', 'Enable in-event chat'],
    ['allow_networking', 'Allow networking', 'Enable networking features'],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Event Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure registration, social proof, and features
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSettingsSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Registration</CardTitle>
            <p className="text-sm text-muted-foreground">
              Control how attendees register
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {registrationSettings.map(([key, label, desc]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <div>
                  <Label htmlFor={key}>{label}</Label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  id={key}
                  checked={form.watch(key)}
                  onCheckedChange={(v) => form.setValue(key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social Proof</CardTitle>
            <p className="text-sm text-muted-foreground">
              What to display on the public event page
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {socialProofSettings.map(([key, label, desc]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <div>
                  <Label htmlFor={key}>{label}</Label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  id={key}
                  checked={form.watch(key)}
                  onCheckedChange={(v) => form.setValue(key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enable or disable event features
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {featureSettings.map(([key, label, desc]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <div>
                  <Label htmlFor={key}>{label}</Label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  id={key}
                  checked={form.watch(key)}
                  onCheckedChange={(v) => form.setValue(key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>

      {!event.is_cancelled && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <p className="text-sm text-muted-foreground">
              Irreversible actions
            </p>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setCancelOpen(true)}
            >
              Cancel Event
            </Button>
          </CardContent>
        </Card>
      )}

      {submitError && (
        <p className="text-sm text-destructive">{submitError}</p>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Event"
        description="Are you sure you want to cancel this event? This action cannot be undone."
        confirmLabel="Cancel Event"
        variant="destructive"
        onConfirm={onCancelEvent}
      />
    </div>
  );
}
