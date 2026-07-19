import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { getAdminDashboard, type DashboardRange } from '@/services/dashboard.service';
import { StatCard } from '@/components/layout/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Building2,
  Users,
  CalendarDays,
  Wallet,
  AlertTriangle,
  TrendingUp,
  Ban,
} from 'lucide-react';

const RANGE_OPTIONS: { label: string; value: DashboardRange }[] = [
  { label: 'Today', value: 'today' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: 'All time', value: 'all' },
];

const ORG_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspended',
  on_hold: 'On hold',
  pending: 'Pending',
  rejected: 'Rejected',
};

interface AdminDashboardPageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const range = (['today', '7d', '30d', 'all'].includes(params.range ?? '') ? params.range : '7d') as DashboardRange;

  let data;
  try {
    data = await getAdminDashboard(range);
  } catch (err) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 py-16 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="font-medium text-foreground">Couldn&apos;t load the dashboard</p>
        <p className="text-sm text-muted-foreground">
          {err instanceof Error ? err.message : 'Something went wrong. Try refreshing.'}
        </p>
      </div>
    );
  }

  const { platform, revenue, eventPerformance, orgPerformance, alerts } = data;
  const totalAlerts =
    alerts.pendingApplications + alerts.failedEmailsInRange + alerts.orgsAtLimit + alerts.draftsAwaitingApproval;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform-wide overview and operational alerts.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {RANGE_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={`/admin?range=${opt.value}`}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                range === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {totalAlerts > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              Operational alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {alerts.pendingApplications > 0 && (
              <Link href="/admin/applications">
                <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  {alerts.pendingApplications} application{alerts.pendingApplications === 1 ? '' : 's'} awaiting review
                </Badge>
              </Link>
            )}
            {alerts.draftsAwaitingApproval > 0 && (
              <Link href="/admin/events?status=draft">
                <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  {alerts.draftsAwaitingApproval} event{alerts.draftsAwaitingApproval === 1 ? '' : 's'} awaiting publish approval
                </Badge>
              </Link>
            )}
            {alerts.orgsAtLimit > 0 && (
              <Link href="/admin/organizations">
                <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  {alerts.orgsAtLimit} organization{alerts.orgsAtLimit === 1 ? '' : 's'} reached their event limit
                </Badge>
              </Link>
            )}
            {alerts.failedEmailsInRange > 0 && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                {alerts.failedEmailsInRange} email{alerts.failedEmailsInRange === 1 ? '' : 's'} failed to send
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Platform overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Organizations"
            value={Object.values(platform.orgsByStatus).reduce((a, b) => a + b, 0)}
            description={`${platform.orgsByStatus.active} active · ${platform.orgsByStatus.suspended + platform.orgsByStatus.on_hold} suspended/hold`}
            icon={Building2}
          />
          <StatCard
            title="Users"
            value={Object.values(platform.usersByRole).reduce((a, b) => a + b, 0)}
            description={`${platform.usersByRole.organizer} organizers · ${platform.usersDisabled} disabled`}
            icon={Users}
          />
          <StatCard
            title="Live events"
            value={platform.eventsTotal}
            description={`${platform.eventsPublished} published · ${platform.eventsDraft} draft`}
            icon={CalendarDays}
          />
          <StatCard
            title="Expired / hidden"
            value={platform.eventsExpired + platform.eventsHidden}
            description={`${platform.eventsExpired} expired · ${platform.eventsHidden} hidden · ${platform.eventsCancelled} cancelled`}
            icon={Ban}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Revenue overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Gross paid volume"
            value={`${revenue.grossVolumeEgp.toLocaleString()} EGP`}
            description={`${revenue.paidOrdersCount} paid order${revenue.paidOrdersCount === 1 ? '' : 's'}`}
            icon={Wallet}
          />
          <StatCard
            title="Default commission"
            value={`${revenue.defaultCommissionPercentage}%`}
            description={`+ ${revenue.defaultFixedFeeEgp} EGP fixed fee per paid ticket`}
            icon={TrendingUp}
          />
          <StatCard
            title="Custom commission"
            value={revenue.orgsWithCustomCommission}
            description="organizations with an override rate"
            icon={Building2}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Buyers pay list price at checkout; commission (event, then organization, then platform default) is deducted from the organizer&rsquo;s payout at settlement.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top events by revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {eventPerformance.topBySales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid orders in this range.</p>
            ) : (
              eventPerformance.topBySales.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.orgName}</p>
                  </div>
                  <span className="shrink-0 font-medium">{e.revenueEgp.toLocaleString()} EGP</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ending soon (next 7 days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {eventPerformance.endingSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing ending soon.</p>
            ) : (
              eventPerformance.endingSoon.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.orgName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format(new Date(e.startDate), 'MMM d, h:mm a')}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently expired</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {eventPerformance.recentlyExpired.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recently expired.</p>
            ) : (
              eventPerformance.recentlyExpired.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.orgName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format(new Date(e.endDate), 'MMM d, h:mm a')}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top organizations by events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orgPerformance.topByEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              orgPerformance.topByEvents.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2 text-sm">
                  <p className="truncate font-medium text-foreground">{o.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{o.eventsCount} events</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {orgPerformance.suspendedOrHold.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suspended / on hold organizations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {orgPerformance.suspendedOrHold.map((o) => (
              <Link key={o.id} href="/admin/organizations">
                <Badge
                  variant="outline"
                  className={
                    o.status === 'suspended'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  }
                >
                  {o.name} — {ORG_STATUS_LABELS[o.status] ?? o.status}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/applications">Review applications</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/organizations">Manage organizations</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/events">Manage events</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/analytics">Full analytics</Link>
        </Button>
      </div>
    </div>
  );
}
