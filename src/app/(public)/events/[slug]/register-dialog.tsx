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
import { FormField } from '@/components/forms/form-field';
import { Loader2, Minus, Plus } from 'lucide-react';
import { registerForEvent } from './register-action';
import { startTicketPurchase, previewCoupon, type CouponPreview } from './purchase-action';
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
  isFull,
  enableWaitlist,
}: RegisterDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isPaid = Number(ticketType.price) > 0;

  // Paid-flow state
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [processing, setProcessing] = useState(false);

  const unitMajor = coupon?.valid ? coupon.discountedUnitMajor ?? Number(ticketType.price) : Number(ticketType.price);
  const total = (unitMajor * quantity).toFixed(2);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { full_name: '', email: '' },
  });

  async function requireUser(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/events/${event.slug}`)}`);
      return null;
    }
    return user.id;
  }

  const onSubmitFree = async (data: RegisterFormData) => {
    void data;
    setSubmitError(null);
    const userId = await requireUser();
    if (!userId) return;
    const result = await registerForEvent(event.id, ticketType.id, userId);
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

  const onApplyCoupon = async () => {
    setCoupon(null);
    if (!couponCode.trim()) return;
    const preview = await previewCoupon(event.id, ticketType.id, couponCode.trim());
    setCoupon(preview);
  };

  const onBuy = async () => {
    setSubmitError(null);
    setProcessing(true);
    const userId = await requireUser();
    if (!userId) {
      setProcessing(false);
      return;
    }
    const result = await startTicketPurchase(
      event.id,
      ticketType.id,
      userId,
      quantity,
      coupon?.valid ? couponCode.trim() : null
    );
    if (!result.success) {
      setSubmitError(result.message);
      setProcessing(false);
      return;
    }
    // Redirect to XPay Hosted Checkout.
    window.location.href = result.url;
  };

  const buttonLabel = disabled
    ? isFull && !enableWaitlist
      ? 'Event full'
      : 'Invite only'
    : isPaid
      ? `Buy · ${Number(ticketType.price).toFixed(0)} EGP`
      : 'Register';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="default" size="sm" disabled={disabled} className="w-full" />}>
        {buttonLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isPaid ? 'Buy tickets' : 'Register'} — {event.title}</DialogTitle>
        </DialogHeader>

        {successMessage ? (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-800 dark:text-green-200">
            <p>{successMessage}</p>
          </div>
        ) : isPaid ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {ticketType.name} — {Number(ticketType.price).toFixed(2)} EGP each
            </p>

            {/* Quantity */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quantity</span>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="icon" className="size-8"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>
                  <Minus className="size-4" />
                </Button>
                <span className="w-6 text-center font-medium">{quantity}</span>
                <Button type="button" variant="outline" size="icon" className="size-8"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))} disabled={quantity >= 10}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            {/* Promo code */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Promo code</span>
              <div className="flex gap-2">
                <Input value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value); setCoupon(null); }}
                  placeholder="Enter code" />
                <Button type="button" variant="outline" onClick={onApplyCoupon}>Apply</Button>
              </div>
              {coupon && (coupon.valid
                ? <p className="text-sm text-green-600">✓ {coupon.discountLabel} applied</p>
                : <p className="text-sm text-destructive">{coupon.message ?? 'Invalid code'}</p>)}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-semibold">{total} EGP</span>
            </div>

            {submitError && <p className="text-sm text-destructive" role="alert">{submitError}</p>}

            <Button type="button" className="w-full" onClick={onBuy} disabled={processing}>
              {processing
                ? <><Loader2 className="size-4 animate-spin" /> Redirecting to payment…</>
                : `Pay ${total} EGP`}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              You'll be redirected to XPay's secure checkout.
            </p>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmitFree)} className="space-y-4">
            <p className="text-sm text-muted-foreground">{ticketType.name} — Free</p>
            <FormField label="Full name" name="full_name" error={form.formState.errors.full_name?.message} required>
              <Input {...form.register('full_name')} placeholder="Your name" autoComplete="name"
                aria-invalid={!!form.formState.errors.full_name} />
            </FormField>
            <FormField label="Email" name="email" error={form.formState.errors.email?.message} required>
              <Input {...form.register('email')} type="email" placeholder="you@example.com"
                autoComplete="email" aria-invalid={!!form.formState.errors.email} />
            </FormField>
            {submitError && <p className="text-sm text-destructive" role="alert">{submitError}</p>}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? <><Loader2 className="size-4 animate-spin" /> Registering…</>
                : 'Complete registration'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
