import { requireAdmin } from '@/lib/auth';
import { getAnnouncements } from '@/services/announcements.service';
import { AnnouncementsClient } from './announcements-client';

export const maxDuration = 300;

interface AnnouncementsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AnnouncementsPage({ searchParams }: AnnouncementsPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const history = await getAnnouncements({ page, page_size: 10 });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a custom email to all attendees, all organizers, or both — news, offers, and updates.
        </p>
      </div>
      <AnnouncementsClient history={history} searchParams={params} />
    </div>
  );
}
