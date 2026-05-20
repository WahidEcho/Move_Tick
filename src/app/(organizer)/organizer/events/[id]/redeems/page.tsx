import { notFound } from 'next/navigation';
import { getActiveOrganizerOrg } from '@/lib/auth';
import { getEvent } from '@/services/events.service';
import {
  getEventRedeemItems,
  getEventRedeemMappings,
  getRedeemSummary,
} from '@/services/redeems.service';
import { getTicketTypes } from '@/services/tickets.service';
import { RedeemsClient } from './redeems-client';

export default async function RedeemsPage({
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

  const [redeemItems, ticketTypes, mappings, redeemSummary] = await Promise.all([
    getEventRedeemItems(eventId),
    getTicketTypes(eventId),
    getEventRedeemMappings(eventId),
    getRedeemSummary(eventId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Redeems</h2>
      </div>
      <RedeemsClient
        eventId={eventId}
        redeemItems={redeemItems}
        ticketTypes={ticketTypes}
        mappings={mappings}
        redeemSummary={redeemSummary}
      />
    </div>
  );
}
