import { getPlatformSettings } from './platform-settings.service';
import { sendLoggedEmail } from './email-log.service';
import { adminOrgAlertEmail } from '@/lib/email-templates';
import { getAppUrl as appUrl } from '@/lib/app-url';

export interface OrgAlertParams {
  /** Short human label, e.g. "New application submitted", "Organization suspended". */
  action: string;
  organizationId?: string | null;
  organizationName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
  contractStatus?: string | null;
  /** Relative admin path to deep-link into, e.g. "/admin/applications/{id}". Defaults to /admin/organizations. */
  dashboardPath?: string;
}

/**
 * Fire-and-forget admin alert email to the Move Beyond inbox
 * (platform_settings.admin_alert_email) for organization lifecycle events.
 * Never throws — this is a notification side-effect, not the primary action.
 */
export async function sendAdminOrgAlert(params: OrgAlertParams): Promise<void> {
  try {
    const settings = await getPlatformSettings();
    const { subject, html } = adminOrgAlertEmail({
      organizationName: params.organizationName,
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone,
      action: params.action,
      status: params.status,
      eventTitle: params.eventTitle,
      contractStatus: params.contractStatus,
      dashboardUrl: `${appUrl()}${params.dashboardPath ?? '/admin/organizations'}`,
    });
    await sendLoggedEmail({
      to: settings.admin_alert_email,
      subject,
      html,
      emailType: `admin_alert:${params.action}`,
      relatedOrganizationId: params.organizationId ?? null,
      relatedEventId: params.eventId ?? null,
    });
  } catch (e) {
    console.error('[admin-alerts] failed to send organization alert:', e);
  }
}
