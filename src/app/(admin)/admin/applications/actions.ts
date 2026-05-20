'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import {
  approveApplication as approveApplicationService,
  updateApplicationStatus,
} from '@/services/organizerApplications.service';

export async function approveApplication(applicationId: string) {
  const profile = await requireAdmin();
  const { organizationId } = await approveApplicationService(
    applicationId,
    profile.id
  );
  revalidatePath('/admin/applications');
  revalidatePath(`/admin/applications/${applicationId}`);
  return { success: true, organizationId };
}

export async function rejectApplication(applicationId: string, notes: string) {
  await requireAdmin();
  await updateApplicationStatus(
    applicationId,
    'rejected',
    (await requireAdmin()).id,
    notes
  );
  revalidatePath('/admin/applications');
  revalidatePath(`/admin/applications/${applicationId}`);
  return { success: true };
}

export async function requestMoreInfo(applicationId: string, notes: string) {
  await requireAdmin();
  await updateApplicationStatus(
    applicationId,
    'more_info_requested',
    (await requireAdmin()).id,
    notes
  );
  revalidatePath('/admin/applications');
  revalidatePath(`/admin/applications/${applicationId}`);
  return { success: true };
}
