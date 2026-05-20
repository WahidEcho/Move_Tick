import { requireAdmin } from '@/lib/auth';
import { getProfilesForAdmin } from '@/services/profiles.service';
import { UsersListClient } from './users-list-client';

interface UsersPageProps {
  searchParams: Promise<{
    search?: string;
    role?: string;
    page?: string;
  }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const search = params.search ?? '';
  const role = params.role as 'attendee' | 'organizer' | 'admin' | undefined;
  const page = Number(params.page) || 1;

  const result = await getProfilesForAdmin({
    search: search || undefined,
    platform_role: role,
    page,
    page_size: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage platform users and their roles.
        </p>
      </div>
      <UsersListClient result={result} searchParams={params} />
    </div>
  );
}
