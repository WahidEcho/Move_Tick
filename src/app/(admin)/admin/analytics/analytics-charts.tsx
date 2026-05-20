'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const PLACEHOLDER_DATA = [
  { label: 'Applications', value: 0 },
  { label: 'Organizations', value: 0 },
  { label: 'Events', value: 0 },
  { label: 'Registrations', value: 0 },
];

export function AnalyticsCharts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4" />
          Growth Overview
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Chart placeholder — connect to analytics data source for trends over time.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
          <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
            <BarChart3 className="size-12 opacity-50" />
            <p className="text-sm font-medium">Chart coming soon</p>
            <p className="text-xs">
              BarChart component with placeholder data structure
            </p>
            <div className="mt-2 flex gap-4 text-xs">
              {PLACEHOLDER_DATA.map((d) => (
                <span key={d.label}>
                  {d.label}: {d.value}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
