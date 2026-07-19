'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getPlatformSettings, updatePlatformSettings } from '@/services/platform-settings.service';
import { logAdminAction } from '@/services/audit.service';
import type { Json, PlatformSettings } from '@/types/database.types';

export type EditablePlatformSettings = Pick<
  PlatformSettings,
  | 'commission_percentage'
  | 'fixed_fee_egp'
  | 'xpay_fee_percentage'
  | 'xpay_fee_fixed_egp'
  | 'event_expiry_buffer_hours'
  | 'default_timezone'
  | 'org_approval_required'
  | 'default_max_events'
  | 'default_event_duration_hours'
  | 'support_email'
  | 'admin_alert_email'
  | 'public_contact'
>;

export async function updatePlatformSettingsAction(data: EditablePlatformSettings) {
  const profile = await requireAdmin();
  const before = await getPlatformSettings();
  const updated = await updatePlatformSettings(data);

  await logAdminAction({
    actorId: profile.id,
    action: 'platform_settings.update',
    targetType: 'platform_settings',
    targetId: updated.id,
    previousValue: before as unknown as Json,
    newValue: data as unknown as Json,
  });

  revalidatePath('/admin/settings');
  return { success: true };
}
