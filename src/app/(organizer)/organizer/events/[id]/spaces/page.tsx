import { getEventSpaces, getSpaceOccupancy } from '@/services/spaces.service';
import { StatCard } from '@/components/layout/stat-card';
import { MapPin, Users, Plus } from 'lucide-react';
import { SpacesClient } from './spaces-client';

export default async function SpacesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const spaces = await getEventSpaces(eventId);
  const occupancies = await Promise.all(
    spaces.map((s) => getSpaceOccupancy(s.id).then((o) => ({ spaceId: s.id, ...o })))
  );
  const occupancyMap = new Map(occupancies.map((o) => [o.spaceId, o]));

  const totalCapacity = spaces.reduce((sum, s) => {
    const cap = s.capacity;
    return sum + (cap != null ? cap : 0);
  }, 0);
  const totalOccupied = occupancies.reduce((sum, o) => sum + o.current_inside, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Spaces</h2>
        <SpacesClient eventId={eventId} spaces={spaces} mode="button" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Spaces" value={spaces.length} icon={MapPin} />
        <StatCard title="Total Capacity" value={totalCapacity || '∞'} icon={Users} />
        <StatCard title="Currently Occupied" value={totalOccupied} icon={Users} />
      </div>

      <SpacesClient
        eventId={eventId}
        spaces={spaces}
        occupancyMap={Object.fromEntries(occupancyMap)}
        mode="cards"
      />
    </div>
  );
}
