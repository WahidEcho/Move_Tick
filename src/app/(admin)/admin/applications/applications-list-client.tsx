'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/tables/data-table';
import { TableFilters } from '@/components/tables/table-filters';
import { Pagination } from '@/components/tables/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { APPLICATION_STATUS_COLORS } from '@/lib/constants';
import type { OrganizerApplicationWithProfile } from '@/services/organizerApplications.service';
import type { PaginatedResult } from '@/types/domain.types';
import { Eye, FileText } from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'More Info', value: 'more_info_requested' },
];

interface ApplicationsListClientProps {
  result: PaginatedResult<OrganizerApplicationWithProfile>;
  searchParams: {
    search?: string;
    status?: string;
    page?: string;
  };
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export function ApplicationsListClient({
  result,
  searchParams,
}: ApplicationsListClientProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { data, total, page, page_size, total_pages } = result;
  const search = searchParams.search ?? '';
  const status = searchParams.status ?? '';
  const currentPage = Number(searchParams.page) || 1;

  const buildUrl = useCallback(
    (updates: Record<string, string | number>) => {
      const params = new URLSearchParams(urlSearchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === '' || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      params.delete('page'); // Reset page when filters change
      if ('page' in updates) {
        params.set('page', String(updates.page));
      }
      return `/admin/applications?${params.toString()}`;
    },
    [urlSearchParams]
  );

  const handleSearchChange = (value: string) => {
    startTransition(() => {
      router.push(buildUrl({ search: value, status }));
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      router.push(buildUrl({ [key]: value, search }));
    });
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      router.push(buildUrl({ page: newPage }));
    });
  };

  const columns = [
    {
      key: 'applicant',
      label: 'Applicant',
      render: (row: OrganizerApplicationWithProfile) => (
        <span className="font-medium">
          {row.full_name}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (row: OrganizerApplicationWithProfile) => (
        <span className="text-muted-foreground">{row.email}</span>
      ),
    },
    {
      key: 'organization',
      label: 'Organization',
      render: (row: OrganizerApplicationWithProfile) => row.organization_name,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: OrganizerApplicationWithProfile) => {
        const statusKey = row.status;
        const colorClass =
          APPLICATION_STATUS_COLORS[statusKey] ??
          'bg-muted text-muted-foreground';
        return (
          <Badge variant="outline" className={colorClass}>
            {formatStatus(row.status)}
          </Badge>
        );
      },
    },
    {
      key: 'date',
      label: 'Date',
      render: (row: OrganizerApplicationWithProfile) =>
        new Date(row.created_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: OrganizerApplicationWithProfile) => (
        <Link href={`/admin/applications/${row.id}`}>
          <Button variant="ghost" size="icon-sm" aria-label="View application">
            <Eye className="size-4" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <TableFilters
        searchPlaceholder="Search by name, email, or organization..."
        searchValue={search}
        onSearchChange={handleSearchChange}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: STATUS_FILTER_OPTIONS,
          },
        ]}
        onFilterChange={handleFilterChange}
        filterValues={{ status }}
      />
      <DataTable<OrganizerApplicationWithProfile>
        columns={columns}
        data={data}
        loading={isPending}
        emptyMessage="No applications found"
        emptyIcon={FileText}
      />
      {total_pages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={total_pages}
          onPageChange={handlePageChange}
          pageSize={page_size}
          total={total}
        />
      )}
    </div>
  );
}
