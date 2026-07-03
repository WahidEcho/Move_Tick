import { requireEventAccess } from '@/lib/auth';
import { getEventInvitations, getInvitationFunnel } from '@/services/invitations.service';
import { FunnelChart } from '@/components/charts/funnel-chart';
import { StatCard } from '@/components/layout/stat-card';
import { INVITATION_STATUS_COLORS, CSV_TEMPLATE_HEADERS } from '@/lib/constants';
import {
  Mail,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  Send,
} from 'lucide-react';
import { InvitationsTableClient } from './invitations-table-client';
import { InvitationsActionsBar } from './invitations-actions-bar';

const INVITATION_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'failed', label: 'Failed' },
] as const;

interface InvitationsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}

export default async function InvitationsPage({
  params,
  searchParams,
}: InvitationsPageProps) {
  const { id: eventId } = await params;
  const { status, search, page } = await searchParams;

  const { event } = await requireEventAccess(eventId);

  const [invitationsResult, funnel, allInvitationsForEmails] = await Promise.all([
    getEventInvitations(eventId, {
      status: status as import('@/types/database.types').InvitationStatus | undefined,
      search: search || undefined,
      page: Number(page) || 1,
      page_size: 20,
    }),
    getInvitationFunnel(eventId),
    getEventInvitations(eventId, { page_size: 10000 }),
  ]);

  const existingEmails = allInvitationsForEmails.data.map((i) => i.invitee_email);

  const pending =
    funnel.total -
    (funnel.sent +
      funnel.delivered +
      funnel.opened +
      funnel.accepted +
      funnel.declined +
      funnel.waitlisted +
      funnel.checked_in +
      funnel.failed);

  const funnelData = [
    { label: 'Invited', value: funnel.total, color: 'hsl(var(--primary))' },
    { label: 'Sent', value: funnel.sent, color: 'hsl(217, 91%, 60%)' },
    { label: 'Accepted', value: funnel.accepted, color: 'hsl(142, 76%, 36%)' },
    { label: 'Declined', value: funnel.declined, color: 'hsl(0, 72%, 51%)' },
    { label: 'Checked In', value: funnel.checked_in, color: 'hsl(162, 63%, 41%)' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Invitations</h2>
        <InvitationsActionsBar
          eventId={eventId}
          orgId={event.organization_id}
          existingEmails={existingEmails}
          csvTemplateHeaders={CSV_TEMPLATE_HEADERS}
          failedCount={funnel.failed}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Invited"
          value={funnel.total}
          icon={Mail}
        />
        <StatCard
          title="Accepted"
          value={funnel.accepted}
          icon={CheckCircle}
        />
        <StatCard
          title="Declined"
          value={funnel.declined}
          icon={UserX}
        />
        <StatCard
          title="Pending"
          value={pending}
          icon={Clock}
        />
        <StatCard
          title="Checked In"
          value={funnel.checked_in}
          icon={UserCheck}
        />
      </div>

      {funnelData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <FunnelChart data={funnelData} title="Invitation Funnel" />
        </div>
      )}

      <InvitationsTableClient
        result={invitationsResult}
        eventId={eventId}
        searchParams={{ status: status ?? '', search: search ?? '', page: page ?? '1' }}
        tabs={INVITATION_TABS}
        statusColors={INVITATION_STATUS_COLORS}
      />
    </div>
  );
}
