"use client";

import * as React from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface TableFilterOption {
  label: string;
  value: string;
}

export interface TableFilter {
  key: string;
  label: string;
  options: TableFilterOption[];
}

export interface TableFiltersProps {
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  searchValue?: string;
  filters?: TableFilter[];
  onFilterChange?: (key: string, value: string) => void;
  filterValues?: Record<string, string>;
  actions?: React.ReactNode;
}

function TableFilters({
  searchPlaceholder = "Search...",
  onSearchChange,
  searchValue = "",
  filters = [],
  onFilterChange,
  filterValues = {},
  actions,
}: TableFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
            aria-label="Search"
          />
        </div>
        {filters.length > 0 && onFilterChange && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Select
                key={filter.key}
                value={filterValues[filter.key] ?? ""}
                onValueChange={(value) => onFilterChange(filter.key, value ?? "")}
              >
                <SelectTrigger className="w-[140px] sm:w-[160px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export { TableFilters };
