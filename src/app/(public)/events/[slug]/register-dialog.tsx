'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Loader2, Minus, Plus } from 'lucide-react';
import { registerForEvent } from './register-action';
import { startTicketPurchase, previewCoupon, type CouponPreview } from './purchase-action';
import type { EventWithDetails } from '@/services/events.service';
import type { TicketType } from '@/types/database.types';

/**
 * Auth state resolved when the dialog opens. Registration only needs the
 * account (name/email live on the profile server-side), so logged-in users
 * get a one-click confirm instead of a form.
 */
type AuthState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'ready'; userId: string; name: string | null; email: string | null };

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
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const isPaid = Number(ticketType.price) > 0;

  // Paid-flow state
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);

  const unitMajor = coupon?.valid ? coupon.discountedUnitMajor ?? Number(ticketType.price) : Number(ticketType.price);
  const total = (unitMajor * quantity).toFixed(2);

  // Resolve who's registering as soon as the dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setAuth({ status: 'anon' });
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();
      if (cancelled) return;
      setAuth({
        status: 'ready',
        userId: user.id,
        name: profile?.full_name ?? null,
        email: profile?.email ?? user.email ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  const goToLogin = () => {
    router.push(`/login?redirect=${encodeURIComponent(`/events/${event.slug}`)}`);
  };

  const onConfirmFree = async () => {
    if (auth.status !== 'ready') return;
    setSubmitError(null);
    setProcessing(true);
    const result = await registerForEvent(event.id, ticketType.id, auth.userId);
    if (!result.success) {
      setSubmitError(result.message);
      setProcessing(false);
      return;
    }
    if (result.ticket) {
      // Ticket issued immediately — take the user straight to their QR.
      // Hard navigation: router.push + router.refresh race and can cancel
      // the transition (same bug the login page had).
      window.location.assign(`/tickets/${result.ticket.id}`);
      return; // keep the spinner while navigating
    }
    // Pending approval / waitlisted — show the status message.
    setProcessing(false);
    setSuccessMessage(result.message);
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
    if (auth.status !== 'ready') return;
    setSubmitError(null);
    setProcessing(true);
    const result = await startTicketPurchase(
      event.id,
      ticketType.id,
      auth.userId,
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
        ) : auth.status === 'loading' ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : auth.status === 'anon' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in or create an account to {isPaid ? 'buy tickets' : 'register'} —
              you&apos;ll come right back to this event.
            </p>
            <Button className="w-full" onClick={goToLogin}>
              Sign in to continue
            </Button>
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
              You&apos;ll be redirected to XPay&apos;s secure checkout.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{ticketType.name} — Free</p>

            {/* One-click confirm: the ticket is issued to the signed-in account. */}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{auth.name || auth.email}</p>
              {auth.name && auth.email && (
                <p className="text-muted-foreground">{auth.email}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Your ticket and QR code will be issued to this account.
            </p>

            {submitError && <p className="text-sm text-destructive" role="alert">{submitError}</p>}

            <Button type="button" className="w-full" onClick={onConfirmFree} disabled={processing}>
              {processing
                ? <><Loader2 className="size-4 animate-spin" /> Registering…</>
                : 'Confirm registration'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
