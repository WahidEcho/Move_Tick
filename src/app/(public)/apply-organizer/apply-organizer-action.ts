'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getProfile } from '@/lib/auth';
import { submitApplication, getUserApplication, resubmitApplication, getRejectionCooldown } from '@/services/organizerApplications.service';
import type { OrganizerApplicationWithProfile } from '@/services/organizerApplications.service';
import type { OrganizerApplicationInput } from '@/lib/validations';
import { sendAdminOrgAlert } from '@/services/admin-alerts.service';

export async function getMyApplication(): Promise<OrganizerApplicationWithProfile | null> {
  const profile = await getProfile();
  if (!profile) return null;
  return getUserApplication(profile.id);
}

export async function submitApplyOrganizer(
  data: OrganizerApplicationInput
): Promise<{ success: true } | { success: false; error: string }> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/login?redirect=/apply-organizer');
  }

  // W5 (4.2b): rejection cooldown — 10 min after the first rejection, 24h
  // after the second and any later one.
  const cooldown = await getRejectionCooldown(profile.id);
  if (cooldown.blockedUntil && cooldown.blockedUntil.getTime() > Date.now()) {
    const mins = Math.ceil((cooldown.blockedUntil.getTime() - Date.now()) / 60000);
    return {
      success: false,
      error: `You can re-apply in ${mins >= 60 ? Math.ceil(mins / 60) + ' hour(s)' : mins + ' minute(s)'}.`,
    };
  }

  // W5 (4.2c): if the admin asked for more info, this submission UPDATES the
  // existing application back to pending instead of opening a duplicate.
  const existing = await getUserApplication(profile.id);
  const isResubmission = existing?.status === 'more_info_requested';

  try {
    await (isResubmission ? resubmitApplication : submitApplication)(profile.id, {
      full_name: data.full_name,
      email: data.email,
      phone: data.phone ?? null,
      role_title: data.role_title ?? null,
      organization_name: data.organization_name,
      organization_type: data.organization_type ?? null,
      website: data.website || undefined,
      instagram: data.instagram ?? null,
      linkedin: data.linkedin ?? null,
      country: data.country ?? null,
      city: data.city ?? null,
      organization_description: data.organization_description ?? null,
      event_categories: data.event_categories ?? null,
      expected_events_per_month: data.expected_events_per_month ?? null,
      expected_avg_attendees: data.expected_avg_attendees ?? null,
      terms_accepted: data.terms_accepted,
    });
    revalidatePath('/apply-organizer');

    await sendAdminOrgAlert({
      action: isResubmission
        ? 'Organizer application resubmitted with requested info'
        : 'New organizer application submitted',
      organizationName: data.organization_name,
      contactEmail: data.email,
      contactPhone: data.phone ?? null,
      status: 'pending',
      dashboardPath: '/admin/applications',
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to submit application',
    };
  }
}
