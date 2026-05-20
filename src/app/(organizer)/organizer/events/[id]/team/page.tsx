import { notFound } from 'next/navigation';
import { getActiveOrganizerOrg } from '@/lib/auth';
import { getEvent } from '@/services/events.service';
import { getEventStaff } from '@/services/team.service';
import { getEventSpaces } from '@/services/spaces.service';
import { TeamClient } from './team-client';

export default async function EventTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { org } = await getActiveOrganizerOrg();
  const { id: eventId } = await params;

  const event = await getEvent(eventId);
  if (!event || event.organization_id !== org.id) {
    notFound();
  }

  const [staff, spaces] = await Promise.all([
    getEventStaff(eventId),
    getEventSpaces(eventId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Team</h2>
      </div>
      <TeamClient eventId={eventId} staff={staff} spaces={spaces} />
    </div>
  );
}
