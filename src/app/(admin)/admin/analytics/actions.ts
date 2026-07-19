'use server';

import { requireSuperAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { toCSV } from '@/lib/csv';

export async function exportRevenueAction(): Promise<{ csv: string; error?: string }> {
  await requireSuperAdmin();
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('payments')
      .select(
        'id, amount_total, currency, status, provider, quantity, created_at, event:events(title, organization:organizations(name))'
      )
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) throw new Error(error.message);

    const headers = ['Event', 'Organization', 'Amount', 'Currency', 'Quantity', 'Provider', 'Status', 'Date'];
    const rows = (data ?? []).map((p) => {
      const event = p.event as { title?: string; organization?: { name?: string } | null } | null;
      return [
        event?.title ?? '',
        event?.organization?.name ?? '',
        ((p.amount_total ?? 0) / 100).toFixed(2),
        p.currency,
        p.quantity,
        p.provider,
        p.status,
        p.created_at,
      ];
    });

    return { csv: toCSV(headers, rows) };
  } catch (e) {
    return { csv: '', error: e instanceof Error ? e.message : 'Export failed' };
  }
}
