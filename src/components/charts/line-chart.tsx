"use client";

import * as React from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

export interface LineChartDataPoint {
  date: string;
  value: number;
}

export interface LineChartProps {
  data: LineChartDataPoint[];
  title?: string;
  height?: number;
  color?: string;
}

function LineChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  let formattedLabel = label;
  try {
    formattedLabel = label ? format(parseISO(label), "MMM d, yyyy") : label;
  } catch {
    // keep original if not a valid date
  }
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{formattedLabel}</p>
      <p className="text-muted-foreground">{payload[0].value}</p>
    </div>
  );
}

function formatAxisDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

function LineChart({
  data,
  title,
  height = 300,
  color = "hsl(var(--primary))",
}: LineChartProps) {
  return (
    <div className="w-full">
      {title && (
        <h3 className="mb-4 text-sm font-medium text-foreground">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxisDate}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<LineChartTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: color }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

export { LineChart };
