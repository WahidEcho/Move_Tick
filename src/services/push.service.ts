import { createServiceClient } from '@/lib/supabase-server';
import { sendPushToTokens, isPushConfigured, type PushMessage } from '@/lib/push/fcm';

/**
 * W8: pushes a notification to every registered device of a user and prunes
 * tokens FCM reports dead. Best-effort by design — callers never await-fail
 * on push problems.
 */
export async function sendPushToUser(userId: string, message: PushMessage): Promise<void> {
  if (!isPushConfigured()) return;
  const supabase = createServiceClient();
  const { data: rows } = await supabase.from('device_push_tokens').select('token').eq('user_id', userId);
  const tokens = (rows ?? []).map((r) => r.token as string);
  if (tokens.length === 0) return;

  const { invalidTokens } = await sendPushToTokens(tokens, message);
  if (invalidTokens.length > 0) {
    await supabase.from('device_push_tokens').delete().in('token', invalidTokens);
  }
}
