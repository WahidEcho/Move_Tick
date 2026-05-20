'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getProfile } from '@/lib/auth';
import { submitApplication, getUserApplication } from '@/services/organizerApplications.service';
import type { OrganizerApplicationWithProfile } from '@/services/organizerApplications.service';
import type { OrganizerApplicationInput } from '@/lib/validations';

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

  try {
    await submitApplication(profile.id, {
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
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to submit application',
    };
  }
}
