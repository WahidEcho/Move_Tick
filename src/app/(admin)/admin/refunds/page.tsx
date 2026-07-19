import { requireAdmin } from '@/lib/auth';
import { getRefundRequestsForAdmin } from '@/services/refunds.service';
import { RefundsClient } from './refunds-client';

export default async function RefundsPage() {
  await requireAdmin();
  const requests = await getRefundRequestsForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Refunds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Attendee refund requests. Approving refunds the full XPay payment and deactivates the purchase&rsquo;s
          tickets; rejecting keeps the ticket valid and emails the attendee your note.
        </p>
      </div>
      <RefundsClient requests={requests} />
    </div>
  );
}
