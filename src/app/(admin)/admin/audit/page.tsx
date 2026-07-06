import { requireAdmin } from '@/lib/auth';
import { getAuditLog } from '@/services/audit.service';
import { AuditLogClient } from './audit-log-client';

interface AuditLogPageProps {
  searchParams: Promise<{ search?: string; targetType?: string; page?: string }>;
}

export default async function AuditLogPage({ searchParams }: AuditLogPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const search = params.search ?? '';
  const targetType = params.targetType ?? '';
  const page = Number(params.page) || 1;

  const result = await getAuditLog({
    search: search || undefined,
    targetType: targetType || undefined,
    page,
    page_size: 30,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Admin Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every sensitive admin action, in order — who did what, to what, and why.
        </p>
      </div>
      <AuditLogClient result={result} searchParams={params} />
    </div>
  );
}
