import { getActiveOrganizerOrg } from '@/lib/auth';
import { CreateEventForm } from './create-event-form';

export default async function CreateEventPage() {
  const { org } = await getActiveOrganizerOrg();
  return <CreateEventForm orgId={org.id} />;
}
