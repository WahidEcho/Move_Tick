import { requireAdmin } from '@/lib/auth';
import {
  getPlatformAnalytics,
  getPlatformRegistrationTrend,
  getPlatformRevenueTrend,
  getPlatformEngagement,
  type PlatformAnalyticsFilters,
} from '@/services/analytics.service';
import { getOrganizations } from '@/services/organizations.service';
import { getEventsForAdmin } from '@/services/events.service';
import { StatCard } from '@/components/layout/stat-card';
import { AnalyticsCharts } from './analytics-charts';
import { AnalyticsFilters } from './analytics-filters';
import { RevenueExportButton } from './revenue-export-button';
import {
  FileText,
  Building2,
  Calendar,
  Users,
  UserPlus,
  Eye,
  Percent,
  Ticket,
  CircleCheck,
  UserX,
  Repeat,
  Banknote,
} from 'lucide-react';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const egp = (n: number) => `${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} EGP`;

interface AnalyticsPageProps {
  searchParams: Promise<{
    range?: string;
    organizationId?: string;
    eventId?: string;
    status?: string;
    ticketType?: string;
  }>;
}

const RANGE_TO_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };

function rangeToDateFrom(range: string, days: number): string | undefined {
  if (range === 'all') return undefined;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const range = params.range && params.range in RANGE_TO_DAYS ? params.range : 'all';
  const days = RANGE_TO_DAYS[range] ?? 30;

  const filters: PlatformAnalyticsFilters = {
    dateFrom: rangeToDateFrom(range, days),
    organizationId: params.organizationId || undefined,
    eventId: params.eventId || undefined,
    status: (params.status as PlatformAnalyticsFilters['status']) || undefined,
    ticketType: (params.ticketType as PlatformAnalyticsFilters['ticketType']) || undefined,
  };

  const trendDays = days === 90 ? 90 : 30;
  const [analytics, trend, revenueTrend, engagement, orgsResult, eventsResult] = await Promise.all([
    getPlatformAnalytics(filters),
    getPlatformRegistrationTrend(filters, trendDays),
    getPlatformRevenueTrend(filters, trendDays),
    getPlatformEngagement(filters),
    getOrganizations({ page_size: 500 }),
    getEventsForAdmin({ page_size: 500 }),
  ]);

  const orgOptions = orgsResult.data.map((o) => ({ id: o.id, name: o.name }));
  const eventOptions = eventsResult.data.map((e) => ({ id: e.id, title: e.title, organizationId: e.organization_id }));

  const statCards = [
    { title: 'Total Applications', value: analytics.total_applications, icon: FileText },
    { title: 'Pending Applications', value: analytics.pending_applications, icon: FileText },
    { title: 'Organizations', value: analytics.total_organizations, icon: Building2 },
    { title: 'Events', value: analytics.total_events, icon: Calendar },
    { title: 'Total Attendees', value: analytics.total_attendees, icon: Users },
    { title: 'Total Registrations', value: analytics.total_registrations, icon: UserPlus },
  ];

  const kpiCards = [
    { title: 'Event page views', value: engagement.uniqueViews.toLocaleString(), description: 'unique visitors (deduped/day)', icon: Eye },
    { title: 'Conversion rate', value: pct(engagement.conversionRate), description: 'views → registrations', icon: Percent },
    { title: 'Avg ticket price', value: egp(engagement.avgTicketPrice), description: `${engagement.paidTicketCount.toLocaleString()} paid tickets`, icon: Ticket },
    { title: 'Paid revenue', value: egp(engagement.paidRevenue), description: 'gross of commission', icon: Banknote },
    { title: 'Check-in rate', value: pct(engagement.checkInRate), description: `${engagement.checkedIn.toLocaleString()} of ${engagement.issuedTickets.toLocaleString()} tickets`, icon: CircleCheck },
    { title: 'No-show rate', value: pct(engagement.noShowRate), description: 'ended events only', icon: UserX },
    { title: 'Repeat attendees', value: pct(engagement.repeatAttendeeRate), description: 'attended ≥2 events in range', icon: Repeat },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Platform Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of platform usage and key metrics.
          </p>
        </div>
        <RevenueExportButton />
      </div>

      <AnalyticsFilters
        orgOptions={orgOptions}
        eventOptions={eventOptions}
        currentFilters={{
          range,
          organizationId: params.organizationId ?? '',
          eventId: params.eventId ?? '',
          status: params.status ?? '',
          ticketType: params.ticketType ?? '',
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
          />
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Engagement & conversion
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
            />
          ))}
        </div>
      </div>

      <AnalyticsCharts
        registrationTrend={trend}
        revenueTrend={revenueTrend}
        funnel={{
          uniqueViews: engagement.uniqueViews,
          registrations: engagement.registrations,
          paidTicketCount: engagement.paidTicketCount,
        }}
      />
    </div>
  );
}
