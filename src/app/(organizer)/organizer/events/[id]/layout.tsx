import { notFound } from 'next/navigation';
import { getActiveOrganizerOrg } from '@/lib/auth';
import { getEvent } from '@/services/events.service';
import { EventTabs } from './event-tabs';

export default async function EventManagementLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { org } = await getActiveOrganizerOrg();
  const { id } = await params;
  const event = await getEvent(id);

  if (!event || event.organization_id !== org.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="border-b">
        <h3 className="mb-4 text-lg font-semibold">{event.title}</h3>
        <EventTabs eventId={id} />
      </div>

      {children}
    </div>
  );
}
