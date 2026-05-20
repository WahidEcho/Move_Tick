import { requireAdmin } from '@/lib/auth';
import { getOrganizationsForAdmin } from '@/services/organizations.service';
import { OrganizationsListClient } from './organizations-list-client';

interface OrganizationsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function OrganizationsPage({
  searchParams,
}: OrganizationsPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const search = params.search ?? '';
  const isActive =
    params.status === 'active' ? true : params.status === 'inactive' ? false : undefined;
  const page = Number(params.page) || 1;

  const result = await getOrganizationsForAdmin({
    search: search || undefined,
    is_active: isActive,
    page,
    page_size: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Organizations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage all organizations on the platform.
        </p>
      </div>
      <OrganizationsListClient result={result} searchParams={params} />
    </div>
  );
}
