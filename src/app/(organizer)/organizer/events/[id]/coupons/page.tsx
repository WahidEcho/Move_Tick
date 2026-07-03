import { requireEventAccess } from '@/lib/auth';
import { getEventCoupons } from '@/services/coupons.service';
import { CouponsClient } from './coupons-client';

export default async function CouponsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  await requireEventAccess(eventId);

  const coupons = await getEventCoupons(eventId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Promo Codes</h2>
        <p className="text-sm text-muted-foreground">
          Create discount codes buyers can apply at checkout for paid tickets.
        </p>
      </div>
      <CouponsClient eventId={eventId} coupons={coupons} />
    </div>
  );
}
