'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart } from '@/components/charts/line-chart';
import { FunnelChart } from '@/components/charts/funnel-chart';
import { LineChart as LineChartIcon, TrendingUp, Filter } from 'lucide-react';
import type { RegistrationTrendPoint, RevenueTrendPoint } from '@/services/analytics.service';

interface AnalyticsChartsProps {
  registrationTrend: RegistrationTrendPoint[];
  revenueTrend: RevenueTrendPoint[];
  funnel: { uniqueViews: number; registrations: number; paidTicketCount: number };
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
      <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
        <LineChartIcon className="size-10 opacity-50" />
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs">Try a wider date range or clear the filters above.</p>
      </div>
    </div>
  );
}

export function AnalyticsCharts({ registrationTrend, revenueTrend, funnel }: AnalyticsChartsProps) {
  const hasRegs = registrationTrend.some((d) => d.count > 0);
  const hasRevenue = revenueTrend.some((d) => d.revenue > 0);

  const funnelData = [
    { label: 'Event page views', value: funnel.uniqueViews, color: 'hsl(var(--primary))' },
    { label: 'Registrations', value: funnel.registrations, color: 'hsl(var(--primary) / 0.7)' },
    { label: 'Paid tickets', value: funnel.paidTicketCount, color: 'hsl(var(--primary) / 0.45)' },
  ];
  const hasFunnel = funnel.uniqueViews > 0 || funnel.registrations > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChartIcon className="size-4" />
            Registrations over time
          </CardTitle>
          <p className="text-sm text-muted-foreground">Matches the filters above.</p>
        </CardHeader>
        <CardContent>
          {hasRegs ? (
            <LineChart data={registrationTrend.map((d) => ({ date: d.date, value: d.count }))} height={260} />
          ) : (
            <EmptyChart label="No registrations in this range" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4" />
            Revenue over time (EGP)
          </CardTitle>
          <p className="text-sm text-muted-foreground">Paid ticket sales per day, gross of platform commission.</p>
        </CardHeader>
        <CardContent>
          {hasRevenue ? (
            <LineChart
              data={revenueTrend.map((d) => ({ date: d.date, value: d.revenue }))}
              height={260}
              color="#16a34a"
            />
          ) : (
            <EmptyChart label="No paid revenue in this range" />
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4" />
            Conversion funnel
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Unique event-page viewers → registrations → paid tickets, for the current filters.
          </p>
        </CardHeader>
        <CardContent>
          {hasFunnel ? (
            <FunnelChart data={funnelData} />
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No page views recorded yet. Views are tracked from the moment this update ships.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
