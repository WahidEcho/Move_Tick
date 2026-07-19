'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/lib/auth';
import {
  approveApplication as approveApplicationService,
  updateApplicationStatus,
  getApplicationById,
} from '@/services/organizerApplications.service';
import { createNotification } from '@/services/notifications.service';
import { sendLoggedEmail } from '@/services/email-log.service';
import { logAdminAction } from '@/services/audit.service';
import { sendAdminOrgAlert } from '@/services/admin-alerts.service';
import { getPlatformSettings } from '@/services/platform-settings.service';
import { orgApprovedEmail, orgRejectedEmail, orgMoreInfoEmail } from '@/lib/email-templates';
import { getAppUrl as appUrl } from '@/lib/app-url';

export async function approveApplication(applicationId: string) {
  const profile = await requireSuperAdmin();
  const application = await getApplicationById(applicationId);
  const { organizationId } = await approveApplicationService(applicationId, profile.id);

  revalidatePath('/admin/applications');
  revalidatePath(`/admin/applications/${applicationId}`);

  if (application) {
    const dashboardUrl = `${appUrl()}/organizer/overview`;
    await Promise.allSettled([
      sendLoggedEmail({
        ...orgApprovedEmail({
          applicantName: application.full_name,
          organizationName: application.organization_name,
          dashboardUrl,
        }),
        to: application.email,
        emailType: 'org_approved',
        relatedOrganizationId: organizationId,
      }),
      createNotification({
        userId: application.user_id,
        organizationId,
        type: 'org_approved',
        title: 'Application approved',
        message: `${application.organization_name} is approved — you can now create events.`,
        relatedEntityType: 'organization',
        relatedEntityId: organizationId,
      }),
      logAdminAction({
        actorId: profile.id,
        action: 'organization.approve',
        targetType: 'organizer_application',
        targetId: applicationId,
        previousValue: { status: application.status },
        newValue: { status: 'approved', organization_id: organizationId },
      }),
      sendAdminOrgAlert({
        action: 'Organization approved',
        organizationId,
        organizationName: application.organization_name,
        contactEmail: application.email,
        contactPhone: application.phone,
        status: 'approved',
        dashboardPath: '/admin/organizations',
      }),
    ]);
  }

  return { success: true, organizationId };
}

export async function rejectApplication(applicationId: string, notes: string) {
  const profile = await requireSuperAdmin();
  const application = await getApplicationById(applicationId);
  await updateApplicationStatus(applicationId, 'rejected', profile.id, notes);

  revalidatePath('/admin/applications');
  revalidatePath(`/admin/applications/${applicationId}`);

  if (application) {
    const settings = await getPlatformSettings().catch(() => null);
    await Promise.allSettled([
      sendLoggedEmail({
        ...orgRejectedEmail({
          applicantName: application.full_name,
          organizationName: application.organization_name,
          reason: notes,
          contactEmail: settings?.support_email ?? 'info@mbeg.org',
        }),
        to: application.email,
        emailType: 'org_rejected',
      }),
      createNotification({
        userId: application.user_id,
        type: 'org_rejected',
        title: 'Application not approved',
        message: notes || `Your application for ${application.organization_name} was not approved.`,
        relatedEntityType: 'organizer_application',
        relatedEntityId: applicationId,
      }),
      logAdminAction({
        actorId: profile.id,
        action: 'organization.reject',
        targetType: 'organizer_application',
        targetId: applicationId,
        previousValue: { status: application.status },
        newValue: { status: 'rejected' },
        reason: notes,
      }),
      sendAdminOrgAlert({
        action: 'Organization application rejected',
        organizationName: application.organization_name,
        contactEmail: application.email,
        contactPhone: application.phone,
        status: 'rejected',
        dashboardPath: `/admin/applications/${applicationId}`,
      }),
    ]);
  }

  return { success: true };
}

export async function requestMoreInfo(applicationId: string, notes: string) {
  const profile = await requireSuperAdmin();
  const application = await getApplicationById(applicationId);
  await updateApplicationStatus(applicationId, 'more_info_requested', profile.id, notes);

  revalidatePath('/admin/applications');
  revalidatePath(`/admin/applications/${applicationId}`);

  if (application) {
    await Promise.allSettled([
      sendLoggedEmail({
        ...orgMoreInfoEmail({
          applicantName: application.full_name,
          organizationName: application.organization_name,
          requested: notes,
          applyUrl: `${appUrl()}/apply-organizer`,
        }),
        to: application.email,
        emailType: 'org_more_info_requested',
      }),
      createNotification({
        userId: application.user_id,
        type: 'org_more_info_requested',
        title: 'More info needed on your application',
        message: notes || `We need more information about ${application.organization_name}.`,
        relatedEntityType: 'organizer_application',
        relatedEntityId: applicationId,
      }),
      logAdminAction({
        actorId: profile.id,
        action: 'organization.request_more_info',
        targetType: 'organizer_application',
        targetId: applicationId,
        previousValue: { status: application.status },
        newValue: { status: 'more_info_requested' },
        reason: notes,
      }),
      sendAdminOrgAlert({
        action: 'Organization application: more info requested',
        organizationName: application.organization_name,
        contactEmail: application.email,
        contactPhone: application.phone,
        status: 'more_info_requested',
        dashboardPath: `/admin/applications/${applicationId}`,
      }),
    ]);
  }

  return { success: true };
}
