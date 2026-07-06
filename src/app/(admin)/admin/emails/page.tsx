import { requireAdmin } from '@/lib/auth';
import { getEmailLog } from '@/services/email-log.service';
import { EmailLogClient } from './email-log-client';

interface EmailLogPageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function EmailLogPage({ searchParams }: EmailLogPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const search = params.search ?? '';
  const status = (params.status as 'sent' | 'failed' | undefined) || undefined;
  const page = Number(params.page) || 1;

  const result = await getEmailLog({
    search: search || undefined,
    deliveryStatus: status,
    page,
    page_size: 30,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Email Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every transactional and admin-alert email the platform has attempted to send.
        </p>
      </div>
      <EmailLogClient result={result} searchParams={params} />
    </div>
  );
}
