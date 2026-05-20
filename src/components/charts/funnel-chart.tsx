"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FunnelChartDataPoint {
  label: string;
  value: number;
  color: string;
}

export interface FunnelChartProps {
  data: FunnelChartDataPoint[];
  title?: string;
}

function FunnelChart({ data, title }: FunnelChartProps) {
  const maxValue = data[0]?.value ?? 1;

  return (
    <div className="w-full">
      {title && (
        <h3 className="mb-4 text-sm font-medium text-foreground">{title}</h3>
      )}
      <div className="flex flex-col gap-2">
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="text-muted-foreground">
                  {item.value.toLocaleString()}
                  {index === 0 ? "" : ` (${percentage.toFixed(1)}%)`}
                </span>
              </div>
              <div className="h-8 w-full overflow-hidden rounded-lg bg-muted/50">
                <div
                  className={cn(
                    "h-full rounded-lg transition-all duration-500 ease-out",
                    "min-w-[2rem]"
                  )}
                  style={{
                    width: `${Math.max(percentage, 2)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { FunnelChart };
