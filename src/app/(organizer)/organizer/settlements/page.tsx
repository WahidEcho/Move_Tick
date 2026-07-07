import { redirect } from 'next/navigation';
import { getOrganizerContext } from '@/lib/auth';
import { getSettlementsForOrganization } from '@/services/settlements.service';
import { SettlementsListClient } from './settlements-list-client';

export default async function OrganizerSettlementsPage() {
  const { org } = await getOrganizerContext();
  // Assignment-only co-organizers have no org-level settlement view.
  if (!org) redirect('/organizer/events');

  const settlements = await getSettlementsForOrganization(org.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Settlements</h2>
        <p className="text-sm text-muted-foreground">
          Commission, fees, and payout status for each of your events.
        </p>
      </div>
      <SettlementsListClient settlements={settlements} />
    </div>
  );
}
