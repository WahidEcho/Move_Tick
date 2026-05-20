import { notFound } from 'next/navigation';
import { getActiveOrganizerOrg } from '@/lib/auth';
import { getEvent } from '@/services/events.service';
import { getEventAttendees } from '@/services/attendees.service';
import { getEventAnalytics } from '@/services/analytics.service';
import { StatCard } from '@/components/layout/stat-card';
import { REGISTRATION_STATUS_COLORS } from '@/lib/constants';
import {
  Users,
  UserCheck,
  UserX,
  LogIn,
  MapPin,
  Clock,
} from 'lucide-react';
import { AttendeesTableClient } from './attendees-table-client';
import { AttendeesExportButton } from './attendees-export-button';

const ATTENDEE_TABS = [
  { value: '', label: 'All', status: '', presence: '' as const },
  { value: 'pending', label: 'Pending', status: 'pending', presence: '' as const },
  { value: 'approved', label: 'Approved', status: 'approved', presence: '' as const },
  { value: 'waitlisted', label: 'Waitlisted', status: 'waitlisted', presence: '' as const },
  { value: 'inside', label: 'Inside', status: '', presence: 'inside_event' as const },
  { value: 'outside', label: 'Outside', status: '', presence: 'outside_event' as const },
  { value: 'no-shows', label: 'No-Shows', status: '', presence: 'never_arrived' as const },
] as const;

interface AttendeesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string;
    presence?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function AttendeesPage({
  params,
  searchParams,
}: AttendeesPageProps) {
  const { org } = await getActiveOrganizerOrg();
  const { id: eventId } = await params;
  const { status, presence, search, page } = await searchParams;

  const event = await getEvent(eventId);
  if (!event || event.organization_id !== org.id) {
    notFound();
  }

  const [attendeesResult, analytics] = await Promise.all([
    getEventAttendees(eventId, {
      status: status as import('@/types/database.types').RegistrationStatus | undefined,
      presence: presence as import('@/types/database.types').AttendeePresence | undefined,
      search: search || undefined,
      page: Number(page) || 1,
      page_size: 20,
    }),
    getEventAnalytics(eventId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Attendees</h2>
        <AttendeesExportButton eventId={eventId} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <StatCard
          title="Total Registered"
          value={analytics.total_registrations}
          icon={Users}
        />
        <StatCard
          title="Approved"
          value={analytics.approved_attendees}
          icon={UserCheck}
        />
        <StatCard
          title="Checked In"
          value={analytics.checked_in}
          icon={LogIn}
        />
        <StatCard
          title="Currently Inside"
          value={analytics.currently_inside}
          icon={MapPin}
        />
        <StatCard
          title="Left Early"
          value={analytics.left_early}
          icon={UserX}
        />
        <StatCard
          title="No-Shows"
          value={analytics.no_shows}
          icon={Clock}
        />
      </div>

      <AttendeesTableClient
        result={attendeesResult}
        eventId={eventId}
        searchParams={{
          status: status ?? '',
          presence: presence ?? '',
          search: search ?? '',
          page: page ?? '1',
        }}
        tabs={ATTENDEE_TABS}
        statusColors={REGISTRATION_STATUS_COLORS}
      />
    </div>
  );
}
