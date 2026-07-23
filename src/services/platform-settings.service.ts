import { createServiceClient } from '@/lib/supabase-server';
import type { PlatformSettings } from '@/types/database.types';

let cached: { value: PlatformSettings; fetchedAt: number } | null = null;
const CACHE_MS = 60_000;

/** The singleton platform_settings row (fees, expiry buffer, alert email, etc.), cached ~1min. */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached.value;
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('platform_settings').select('*').limit(1).single();
  if (error || !data) {
    throw new Error(`Failed to fetch platform settings: ${error?.message ?? 'not found'}`);
  }
  cached = { value: data as PlatformSettings, fetchedAt: Date.now() };
  return data as PlatformSettings;
}

export async function updatePlatformSettings(
  updates: Partial<
    Pick<
      PlatformSettings,
      | 'commission_percentage'
      | 'fixed_fee_egp'
      | 'xpay_fee_percentage'
      | 'xpay_fee_fixed_egp'
      | 'event_expiry_buffer_hours'
      | 'default_timezone'
      | 'org_approval_required'
      | 'contract_required'
      | 'default_max_events'
      | 'default_event_duration_hours'
      | 'support_email'
      | 'admin_alert_email'
      | 'public_contact'
      | 'landing_hero_video_url'
      | 'landing_hero_poster_url'
    >
  >
): Promise<PlatformSettings> {
  const supabase = createServiceClient();
  const current = await getPlatformSettings();
  const { data, error } = await supabase
    .from('platform_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', current.id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update platform settings: ${error.message}`);
  cached = { value: data as PlatformSettings, fetchedAt: Date.now() };
  return data as PlatformSettings;
}
