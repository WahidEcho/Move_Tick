'use server';

import { revalidatePath } from 'next/cache';
import { getActiveOrganizerOrg } from '@/lib/auth';
import { updateOrganization } from '@/services/organizations.service';
import type { Organization } from '@/types/database.types';

/** Server-side fetch of the current organizer's organization (no browser DB call). */
export async function getMyOrganization(): Promise<Organization | null> {
  const { org } = await getActiveOrganizerOrg();
  return org ?? null;
}

export interface OrgSettingsInput {
  name: string;
  description?: string | null;
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  country?: string | null;
  city?: string | null;
  logo_url?: string | null;
}

/** Server action: update the current organizer's org (auth-checked server-side). */
export async function updateOrganizationSettings(
  data: OrgSettingsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { org } = await getActiveOrganizerOrg();
    if (!org) return { success: false, error: 'No organization found' };

    await updateOrganization(org.id, {
      name: data.name,
      description: data.description || null,
      website: data.website || null,
      instagram: data.instagram || null,
      linkedin: data.linkedin || null,
      country: data.country || null,
      city: data.city || null,
      logo_url: data.logo_url || null,
    });

    revalidatePath('/organizer/settings');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to save settings' };
  }
}
