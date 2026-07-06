import { createServiceClient } from '@/lib/supabase-server';
import { sendEmail, type SendEmailParams, type SendEmailResult } from '@/lib/email';

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
