import { requireAdmin } from '@/lib/auth';
import { getApplications } from '@/services/organizerApplications.service';
import { ApplicationsListClient } from './applications-list-client';

interface ApplicationsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function ApplicationsPage({
  searchParams,
}: ApplicationsPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const status = params.status as
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'more_info_requested'
    | undefined;
  const search = params.search ?? '';
  const page = Number(params.page) || 1;

  const result = await getApplications({
    status,
    search: search || undefined,
    page,
    page_size: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Organizer Applications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and manage organizer applications to the platform.
        </p>
      </div>
      <ApplicationsListClient result={result} searchParams={params} />
    </div>
  );
}
