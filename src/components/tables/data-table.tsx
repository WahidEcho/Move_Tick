"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  onSort?: (key: string, order: "asc" | "desc") => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
}

function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found",
  emptyIcon: EmptyIcon,
  onSort,
  sortKey,
  sortOrder,
}: DataTableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSort) return;
    const column = columns.find((c) => c.key === key);
    if (!column?.sortable) return;
    const nextOrder = sortKey === key && sortOrder === "asc" ? "desc" : "asc";
    onSort(key, nextOrder);
  };

  return (
    <div className="relative w-full overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.className,
                  column.sortable && "cursor-pointer select-none"
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <span className="flex items-center gap-1.5">
                  {column.label}
                  {column.sortable && sortKey === column.key && (
                    <span className="inline-flex text-muted-foreground">
                      {sortOrder === "asc" ? (
                        <ChevronUpIcon className="size-4" />
                      ) : (
                        <ChevronDownIcon className="size-4" />
                      )}
                    </span>
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  {EmptyIcon && (
                    <EmptyIcon className="size-10 text-muted-foreground/50" />
                  )}
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render
                      ? column.render(row)
                      : String((row as Record<string, unknown>)[column.key] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export { DataTable };
