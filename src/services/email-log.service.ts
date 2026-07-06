import { createServiceClient } from '@/lib/supabase-server';
import { sendEmail, type SendEmailParams, type SendEmailResult } from '@/lib/email';
import type { EmailLogEntry } from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';

export interface LoggedEmailParams extends SendEmailParams {
  /** Short type tag for filtering the log, e.g. "org_approved", "admin_alert:org_suspended". */
  emailType: string;
  relatedOrganizationId?: string | null;
  relatedEventId?: string | null;
}

/**
 * Wraps sendEmail() with an email_log row for every attempt, success or
 * failure. Never throws — email is a side-effect of some other action
 * (application review, org lifecycle change, etc.) and must not block it.
 */
export async function sendLoggedEmail(params: LoggedEmailParams): Promise<SendEmailResult> {
  const { emailType, relatedOrganizationId, relatedEventId, ...emailParams } = params;
  const result = await sendEmail(emailParams);

  const supabase = createServiceClient();
  const { error } = await supabase.from('email_log').insert({
    recipient_email: params.to,
    email_type: emailType,
    subject: params.subject,
    related_organization_id: relatedOrganizationId ?? null,
    related_event_id: relatedEventId ?? null,
    delivery_status: result.ok ? 'sent' : 'failed',
    failure_reason: result.ok ? null : (result.error ?? 'unknown'),
  });
  if (error) {
    console.error('[email-log] failed to write email_log row:', error.message);
  }

  return result;
}

export interface GetEmailLogFilters {
  deliveryStatus?: 'sent' | 'failed';
  search?: string;
  page?: number;
  page_size?: number;
}

export async function getEmailLog(
  filters: GetEmailLogFilters = {}
): Promise<PaginatedResult<EmailLogEntry>> {
  const supabase = createServiceClient();
  const { deliveryStatus, search, page = 1, page_size = 30 } = filters;

  let query = supabase.from('email_log').select('*', { count: 'exact' });

  if (deliveryStatus) query = query.eq('delivery_status', deliveryStatus);
  if (search && search.trim()) {
    query = query.or(`recipient_email.ilike.%${search.trim()}%,subject.ilike.%${search.trim()}%,email_type.ilike.%${search.trim()}%`);
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.order('sent_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch email log: ${error.message}`);

  const total = count ?? 0;
  return {
    data: (data ?? []) as EmailLogEntry[],
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}
