'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-browser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/forms/form-field';
import { Loader2 } from 'lucide-react';
import { registerForEvent } from './register-action';
import type { EventWithDetails } from '@/services/events.service';
import type { TicketType } from '@/types/database.types';

const registerFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

type RegisterFormData = z.infer<typeof registerFormSchema>;

interface RegisterDialogProps {
  event: EventWithDetails;
  ticketType: TicketType;
  disabled: boolean;
  approvalRequired: boolean;
  isFull: boolean;
  enableWaitlist: boolean;
}

export function RegisterDialog({
  event,
  ticketType,
  disabled,
  approvalRequired,
  isFull,
  enableWaitlist,
}: RegisterDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setSubmitError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitError('You must be logged in to register');
      router.push(`/login?redirect=${encodeURIComponent(`/events/${event.slug}`)}`);
      return;
    }

    const result = await registerForEvent(event.id, ticketType.id, user.id);

    if (!result.success) {
      setSubmitError(result.message);
      return;
    }

    setSuccessMessage(result.message);

    if (result.ticket) {
      router.push('/tickets');
      router.refresh();
      setOpen(false);
      return;
    }

    router.refresh();
    setTimeout(() => {
      setOpen(false);
      setSuccessMessage(null);
    }, 3000);
  };

  const buttonLabel = disabled
    ? isFull && !enableWaitlist
      ? 'Event full'
      : 'Invite only'
    : 'Register';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="default" size="sm" disabled={disabled} className="w-full" />}>
          {buttonLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register for {event.title}</DialogTitle>
        </DialogHeader>
        {successMessage ? (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-800 dark:text-green-200">
            <p>{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {ticketType.name} — {ticketType.price === 0 ? 'Free' : `$${ticketType.price}`}
            </p>
            <FormField
              label="Full name"
              name="full_name"
              error={form.formState.errors.full_name?.message}
              required
            >
              <Input
                {...form.register('full_name')}
                placeholder="Your name"
                autoComplete="name"
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
                {...form.register('email')}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!!form.formState.errors.email}
              />
            </FormField>
            {submitError && (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Complete registration'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
