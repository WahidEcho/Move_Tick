import { requireAdmin } from '@/lib/auth';
import { getPlatformAnalytics } from '@/services/analytics.service';
import { StatCard } from '@/components/layout/stat-card';
import { AnalyticsCharts } from './analytics-charts';
import {
  FileText,
  Building2,
  Calendar,
  Users,
  BarChart3,
  UserPlus,
} from 'lucide-react';

export default async function AnalyticsPage() {
  await requireAdmin();

  const analytics = await getPlatformAnalytics();

  const statCards = [
    {
      title: 'Total Applications',
      value: analytics.total_applications,
      icon: FileText,
    },
    {
      title: 'Pending Applications',
      value: analytics.pending_applications,
      icon: FileText,
    },
    {
      title: 'Organizations',
      value: analytics.total_organizations,
      icon: Building2,
    },
    {
      title: 'Events',
      value: analytics.total_events,
      icon: Calendar,
    },
    {
      title: 'Total Attendees',
      value: analytics.total_attendees,
      icon: Users,
    },
    {
      title: 'Total Registrations',
      value: analytics.total_registrations,
      icon: UserPlus,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Platform Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of platform usage and key metrics.
        </p>
      </div>

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

      <AnalyticsCharts />
    </div>
  );
}
