'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const RANGE_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'All time', value: 'all' },
];

const STATUS_OPTIONS = [
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Cancelled', value: 'cancelled' },
];

const TICKET_TYPE_OPTIONS = [
  { label: 'Paid', value: 'paid' },
  { label: 'Free', value: 'free' },
];

export interface AnalyticsFiltersProps {
  orgOptions: { id: string; name: string }[];
  eventOptions: { id: string; title: string; organizationId: string }[];
  currentFilters: {
    range: string;
    organizationId: string;
    eventId: string;
    status: string;
    ticketType: string;
  };
}

export function AnalyticsFilters({ orgOptions, eventOptions, currentFilters }: AnalyticsFiltersProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const visibleEventOptions = useMemo(
    () =>
      currentFilters.organizationId
        ? eventOptions.filter((e) => e.organizationId === currentFilters.organizationId)
        : eventOptions,
    [eventOptions, currentFilters.organizationId]
  );

  const buildUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(urlSearchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === '') params.delete(key);
        else params.set(key, value);
      });
      return `/admin/analytics?${params.toString()}`;
    },
    [urlSearchParams]
  );

  const setFilter = (key: string, value: string) => {
    startTransition(() => {
      const updates: Record<string, string> = { [key]: value };
      // Changing organization invalidates a previously-selected event from a different org.
      if (key === 'organizationId') updates.eventId = '';
      router.push(buildUrl(updates));
    });
  };

  const hasActiveFilters =
    currentFilters.organizationId || currentFilters.eventId || currentFilters.status || currentFilters.ticketType;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={currentFilters.range} onValueChange={(v) => setFilter('range', v ?? '')} items={RANGE_OPTIONS}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentFilters.organizationId}
        onValueChange={(v) => setFilter('organizationId', v ?? '')}
        items={orgOptions.map((org) => ({ label: org.name, value: org.id }))}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Organization" />
        </SelectTrigger>
        <SelectContent>
          {orgOptions.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentFilters.eventId}
        onValueChange={(v) => setFilter('eventId', v ?? '')}
        items={visibleEventOptions.map((e) => ({ label: e.title, value: e.id }))}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Event" />
        </SelectTrigger>
        <SelectContent>
          {visibleEventOptions.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentFilters.status} onValueChange={(v) => setFilter('status', v ?? '')} items={STATUS_OPTIONS}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentFilters.ticketType}
        onValueChange={(v) => setFilter('ticketType', v ?? '')}
        items={TICKET_TYPE_OPTIONS}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Ticket type" />
        </SelectTrigger>
        <SelectContent>
          {TICKET_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => router.push('/admin/analytics?range=' + currentFilters.range)}
        >
          <X className="size-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
