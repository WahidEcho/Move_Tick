'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2 } from 'lucide-react';
import { createCouponAction, toggleCouponAction, deleteCouponAction } from './actions';
import type { Coupon } from '@/services/coupons.service';

export function CouponsClient({ eventId, coupons }: { eventId: string; coupons: Coupon[] }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreate = async () => {
    setError(null);
    const numValue = Number(value);
    if (!code.trim() || !Number.isFinite(numValue) || numValue <= 0) {
      setError('Enter a code and a discount value.');
      return;
    }
    setBusy(true);
    const result = await createCouponAction(eventId, {
      code: code.trim(),
      discount_type: type,
      discount_value: numValue,
      max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setCode('');
    setValue('');
    setMaxRedemptions('');
    setValidUntil('');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER25" />
            </div>
            <div className="space-y-1.5">
              <Label>Discount type</Label>
              <div className="flex gap-2">
                <Button type="button" variant={type === 'percent' ? 'default' : 'outline'}
                  className="flex-1" onClick={() => setType('percent')}>Percent %</Button>
                <Button type="button" variant={type === 'fixed' ? 'default' : 'outline'}
                  className="flex-1" onClick={() => setType('fixed')}>Fixed EGP</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{type === 'percent' ? 'Percent off (1–100)' : 'Amount off (EGP)'}</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} type="number" min="1" placeholder={type === 'percent' ? '25' : '50'} />
            </div>
            <div className="space-y-1.5">
              <Label>Max uses (optional)</Label>
              <Input value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} type="number" min="1" placeholder="Unlimited" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Expires (optional)</Label>
              <Input value={validUntil} onChange={(e) => setValidUntil(e.target.value)} type="datetime-local" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={onCreate} disabled={busy}>
            {busy ? <><Loader2 className="size-4 animate-spin" /> Creating…</> : 'Create promo code'}
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      {coupons.length === 0 ? (
        <p className="text-sm text-muted-foreground">No promo codes yet.</p>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <CouponRow key={c.id} eventId={eventId} coupon={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CouponRow({ eventId, coupon }: { eventId: string; coupon: Coupon }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const discount = coupon.discount_type === 'percent' ? `${coupon.discount_value}% off` : `${coupon.discount_value} EGP off`;
  const uses = coupon.max_redemptions != null
    ? `${coupon.times_redeemed}/${coupon.max_redemptions} used`
    : `${coupon.times_redeemed} used`;

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">{coupon.code}</span>
            <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
              {coupon.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {discount} · {uses}
            {coupon.valid_until ? ` · expires ${new Date(coupon.valid_until).toLocaleDateString()}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" disabled={busy}
            onClick={async () => { setBusy(true); await toggleCouponAction(eventId, coupon.id, !coupon.is_active); setBusy(false); router.refresh(); }}>
            {coupon.is_active ? 'Disable' : 'Enable'}
          </Button>
          <Button variant="ghost" size="icon" disabled={busy}
            onClick={async () => { setBusy(true); await deleteCouponAction(eventId, coupon.id); setBusy(false); router.refresh(); }}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
