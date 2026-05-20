"use client";

import Link from "next/link";
import { DataTable } from "@/components/tables/data-table";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "lucide-react";

interface CapacityRow {
  event_id: string;
  title: string;
  capacity: number | null;
  registered: number;
}

function calcPct(registered: number, capacity: number | null): number | null {
  if (!capacity) return null;
  return Math.round((registered / capacity) * 100);
}

const columns = [
  {
    key: "title",
    label: "Event",
    render: (row: CapacityRow) => (
      <Link
        href={`/organizer/events/${row.event_id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.title}
      </Link>
    ),
  },
  {
    key: "capacity",
    label: "Capacity",
    render: (row: CapacityRow) =>
      row.capacity != null ? String(row.capacity) : "Unlimited",
  },
  {
    key: "registered",
    label: "Registered",
  },
  {
    key: "progress",
    label: "Filled",
    render: (row: CapacityRow) => {
      const pct = calcPct(row.registered, row.capacity);
      return (
        <div className="flex min-w-[120px] items-center gap-2">
          <Progress value={pct ?? 0} className="h-2 flex-1" />
          <span className="w-10 tabular-nums text-xs text-muted-foreground">
            {pct != null ? `${pct}%` : "-"}
          </span>
        </div>
      );
    },
  },
];

export function CapacityTable({ data }: { data: CapacityRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage="No events yet"
      emptyIcon={Calendar}
    />
  );
}
