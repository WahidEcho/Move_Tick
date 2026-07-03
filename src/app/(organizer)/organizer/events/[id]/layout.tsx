import { requireEventAccess } from '@/lib/auth';
import { EventTabs } from './event-tabs';

export default async function EventManagementLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event } = await requireEventAccess(id);

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
