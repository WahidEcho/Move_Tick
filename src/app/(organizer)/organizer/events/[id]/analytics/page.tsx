import { requireEventAccess } from '@/lib/auth';
import {
  getEventAnalytics,
  getRegistrationTrend,
  getAttendanceTrend,
} from '@/services/analytics.service';
import { StatCard } from '@/components/layout/stat-card';
import { LineChart } from '@/components/charts/line-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { FunnelChart } from '@/components/charts/funnel-chart';
import { DataTable } from '@/components/tables/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  UserCheck,
  Clock,
  MapPin,
  LogIn,
  LogOut,
  UserX,
  Gift,
} from 'lucide-react';

export default async function EventAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;

  await requireEventAccess(eventId);

  const [analytics, registrationTrend, attendanceTrend] = await Promise.all([
    getEventAnalytics(eventId),
    getRegistrationTrend(eventId),
    getAttendanceTrend(eventId),
  ]);

  const registrationChartData = registrationTrend.map((r) => ({
    date: r.date,
    value: r.count,
  }));

  const attendanceChartData = attendanceTrend.map((a) => ({
    label: `${String(a.hour).padStart(2, '0')}:00`,
    value: a.check_ins,
  }));

  const funnelData = [
    { label: 'Total Invited', value: analytics.invitation_funnel.total, color: 'hsl(var(--primary))' },
    { label: 'Accepted', value: analytics.invitation_funnel.accepted, color: 'hsl(142, 76%, 36%)' },
    { label: 'Checked In', value: analytics.invitation_funnel.checked_in, color: 'hsl(162, 63%, 41%)' },
  ].filter((d) => d.value > 0);

  const spaceColumns = [
    { key: 'name', label: 'Space' },
    {
      key: 'current_occupancy',
      label: 'Current',
      render: (r: { name: string; current_occupancy: number; capacity: number | null }) =>
        r.current_occupancy,
    },
    {
      key: 'capacity',
      label: 'Capacity',
      render: (r: { name: string; current_occupancy: number; capacity: number | null }) =>
        r.capacity ?? '∞',
    },
  ];

  const redeemColumns = [
    { key: 'name', label: 'Item' },
    { key: 'total_allowed', label: 'Allowed' },
    { key: 'total_redeemed', label: 'Redeemed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Analytics</h2>
      </div>

      {/* Overview StatCards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
        <StatCard
          title="Total Registrations"
          value={analytics.total_registrations}
          icon={Users}
        />
        <StatCard
          title="Approved"
          value={analytics.approved_attendees}
          icon={UserCheck}
        />
        <StatCard
          title="Waitlisted"
          value={analytics.waitlist_count}
          icon={Clock}
        />
        <StatCard
          title="Checked In"
          value={analytics.checked_in}
          icon={LogIn}
        />
        <StatCard
          title="Inside"
          value={analytics.currently_inside}
          icon={MapPin}
        />
        <StatCard
          title="Left Early"
          value={analytics.left_early}
          icon={LogOut}
        />
        <StatCard
          title="No-Shows"
          value={analytics.no_shows}
          icon={UserX}
        />
      </div>

      {/* Registration Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Registration Trend</CardTitle>
          <p className="text-sm text-muted-foreground">
            New registrations over the last 30 days
          </p>
        </CardHeader>
        <CardContent>
          <LineChart data={registrationChartData} title="Registrations by Date" />
        </CardContent>
      </Card>

      {/* Invitation Funnel */}
      {funnelData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitation Funnel</CardTitle>
            <p className="text-sm text-muted-foreground">
              From invited to checked in
            </p>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnelData} title="Invitation Funnel" />
          </CardContent>
        </Card>
      )}

      {/* Attendance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Trend</CardTitle>
          <p className="text-sm text-muted-foreground">
            Check-ins by hour of day
          </p>
        </CardHeader>
        <CardContent>
          <BarChart data={attendanceChartData} title="Check-ins by Hour" />
        </CardContent>
      </Card>

      {/* Space Occupancy */}
      {analytics.space_summaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Space Occupancy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Current occupancy per space
            </p>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={spaceColumns}
              data={analytics.space_summaries}
              emptyMessage="No spaces"
            />
          </CardContent>
        </Card>
      )}

      {/* Redeem Summary */}
      {analytics.redeem_summaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Redeem Summary</CardTitle>
            <p className="text-sm text-muted-foreground">
              Redeemed vs allowed per item
            </p>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={redeemColumns}
              data={analytics.redeem_summaries}
              emptyMessage="No redeem items"
              emptyIcon={Gift}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
