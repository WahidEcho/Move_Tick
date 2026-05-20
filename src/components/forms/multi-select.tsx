"use client";

import * as React from "react";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  error?: string;
  placeholder?: string;
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  error,
  placeholder = "Select...",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggleOption = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const selectedLabels = options
    .filter((opt) => selected.includes(opt.value))
    .map((opt) => opt.label);

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium leading-none">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-auto min-h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-normal transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            error && "border-destructive"
          )}
        >
          <span className="flex flex-1 flex-wrap items-center gap-1.5 truncate text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedLabels.map((l) => (
                <Badge
                  key={l}
                  variant="secondary"
                  className="gap-1 pr-1 font-normal"
                >
                  {l}
                  <button
                    type="button"
                    className="rounded-full hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      const opt = options.find((o) => o.label === l);
                      if (opt) toggleOption(opt.value);
                    }}
                    aria-label={`Remove ${l}`}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))
            )}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[var(--anchor-width)] min-w-[12rem] p-0" align="start">
          <ScrollArea className="max-h-60">
            <div className="p-2 space-y-1">
              {options.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={selected.includes(opt.value)}
                    onCheckedChange={() => toggleOption(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { MultiSelect };
