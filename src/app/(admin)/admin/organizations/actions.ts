'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import {
  adminUpdateOrganization,
  adminSetOrgStatus,
  adminArchiveOrganization,
  adminRestoreOrganization,
} from '@/services/admin.service';
import {
  getOrganizationMembers,
  getOrganizationsForAdmin,
  type UpdateOrganizationData,
} from '@/services/organizations.service';
import { createNotification } from '@/services/notifications.service';
import { sendAdminOrgAlert } from '@/services/admin-alerts.service';
import { getOrganizerDashboardSummary } from '@/services/analytics.service';
import { toCSV } from '@/lib/csv';
import type { OrganizationStatus } from '@/types/database.types';
import type { OrganizerDashboardSummary } from '@/types/domain.types';

export interface EditableOrgFields {
  name?: string;
  description?: string | null;
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  country?: string | null;
  city?: string | null;
  type?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  max_events?: number | null;
  max_published_events?: number | null;
  can_create_paid?: boolean;
  requires_publish_approval?: boolean;
  commission_percentage?: number | null;
  fixed_fee_egp?: number | null;
  hide_events_on_suspend?: boolean;
}

export async function updateOrganizationAction(orgId: string, data: EditableOrgFields) {
  const profile = await requireAdmin();
  await adminUpdateOrganization(orgId, data as UpdateOrganizationData, profile.id);
  revalidatePath('/admin/organizations');
  return { success: true };
}

const STATUS_LABELS: Record<OrganizationStatus, string> = {
  active: 'reactivated',
  suspended: 'suspended',
  on_hold: 'put on hold',
  pending: 'set to pending',
  rejected: 'rejected',
};

const STATUS_NOTIFICATION_TYPE: Partial<Record<OrganizationStatus, 'org_suspended' | 'org_on_hold' | 'org_reactivated'>> = {
  suspended: 'org_suspended',
  on_hold: 'org_on_hold',
  active: 'org_reactivated',
};

export async function setOrgStatusAction(orgId: string, status: OrganizationStatus, reason?: string) {
  const profile = await requireAdmin();
  const org = await adminSetOrgStatus(orgId, status, profile.id, reason || null);

  revalidatePath('/admin/organizations');

  const members = await getOrganizationMembers(orgId);
  const notificationType = STATUS_NOTIFICATION_TYPE[status];
  const statusLabel = STATUS_LABELS[status];

  await Promise.allSettled([
    ...(notificationType
      ? members.map((m) =>
          createNotification({
            userId: m.user_id,
            organizationId: orgId,
            type: notificationType,
            title: `Your organization has been ${statusLabel}`,
            message: reason || `${org.name} has been ${statusLabel} by a platform admin.`,
            relatedEntityType: 'organization',
            relatedEntityId: orgId,
          })
        )
      : []),
    sendAdminOrgAlert({
      action: `Organization ${statusLabel}`,
      organizationId: orgId,
      organizationName: org.name,
      contactEmail: org.contact_email,
      contactPhone: org.contact_phone,
      status,
      dashboardPath: '/admin/organizations',
    }),
  ]);

  return { success: true };
}

export async function archiveOrganizationAction(orgId: string, reason: string) {
  const profile = await requireAdmin();
  const org = await adminArchiveOrganization(orgId, profile.id, reason);

  revalidatePath('/admin/organizations');

  const members = await getOrganizationMembers(orgId);
  await Promise.allSettled([
    ...members.map((m) =>
      createNotification({
        userId: m.user_id,
        organizationId: orgId,
        type: 'org_suspended',
        title: 'Your organization has been removed',
        message: reason || `${org.name} has been removed from Move-Tick by a platform admin.`,
        relatedEntityType: 'organization',
        relatedEntityId: orgId,
      })
    ),
    sendAdminOrgAlert({
      action: 'Organization archived (soft-deleted)',
      organizationId: orgId,
      organizationName: org.name,
      contactEmail: org.contact_email,
      contactPhone: org.contact_phone,
      status: 'archived',
      dashboardPath: '/admin/organizations',
    }),
  ]);

  return { success: true };
}

export async function restoreOrganizationAction(orgId: string, reason?: string) {
  const profile = await requireAdmin();
  await adminRestoreOrganization(orgId, profile.id, reason || null);
  revalidatePath('/admin/organizations');
  return { success: true };
}

export async function getOrgStatsAction(orgId: string): Promise<OrganizerDashboardSummary> {
  await requireAdmin();
  return getOrganizerDashboardSummary(orgId);
}

export async function exportOrganizationsAction(): Promise<{ csv: string; error?: string }> {
  await requireAdmin();
  try {
    const { data } = await getOrganizationsForAdmin({ page_size: 10000 });

    const headers = [
      'Name',
      'Slug',
      'Status',
      'Contact Email',
      'Contact Phone',
      'Members',
      'Events',
      'Max Events',
      'Commission %',
      'Fixed Fee (EGP)',
      'Archived',
      'Created At',
    ];
    const rows = data.map((org) => [
      org.name,
      org.slug,
      org.status,
      org.contact_email ?? '',
      org.contact_phone ?? '',
      org.members_count,
      org.events_count,
      org.max_events ?? 'unlimited',
      org.commission_percentage ?? '',
      org.fixed_fee_egp ?? '',
      org.archived_at ? 'yes' : 'no',
      org.created_at,
    ]);

    return { csv: toCSV(headers, rows) };
  } catch (e) {
    return { csv: '', error: e instanceof Error ? e.message : 'Export failed' };
  }
}
