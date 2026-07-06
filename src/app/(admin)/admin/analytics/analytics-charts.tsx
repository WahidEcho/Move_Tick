'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart } from '@/components/charts/line-chart';
import { LineChart as LineChartIcon } from 'lucide-react';
import type { RegistrationTrendPoint } from '@/services/analytics.service';

interface AnalyticsChartsProps {
  data: RegistrationTrendPoint[];
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChartIcon className="size-4" />
          Registrations over time
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Matches the filters above — organization, event, status, and ticket type.
        </p>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <LineChart data={data.map((d) => ({ date: d.date, value: d.count }))} height={280} />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
            <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
              <LineChartIcon className="size-10 opacity-50" />
              <p className="text-sm font-medium">No registrations in this range</p>
              <p className="text-xs">Try a wider date range or clear the filters above.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
