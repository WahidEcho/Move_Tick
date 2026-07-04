'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase-server';

export type RsvpResponse = 'accepted' | 'declined';

/**
 * Token-based RSVP: possession of the rsvp_token (from the invitation email)
 * is the authorization — no account needed. Accept re-activates the guest
 * ticket; decline deactivates it so the QR stops scanning.
 */
export async function respondToRsvp(
  token: string,
  response: RsvpResponse
): Promise<{ success: boolean; message?: string }> {
  if (!token || !/^[a-f0-9]{32}$/i.test(token)) {
    return { success: false, message: 'Invalid invitation link' };
  }

  const supabase = createServiceClient();

  const { data: invitation } = await supabase
    .from('event_invitations')
    .select('id, status')
    .eq('rsvp_token', token)
    .maybeSingle();

  if (!invitation) {
    return { success: false, message: 'Invitation not found' };
  }
  if (invitation.status === 'checked_in') {
    return { success: false, message: 'This invitation was already used at the event' };
  }

  const { error } = await supabase
    .from('event_invitations')
    .update({
      status: response,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitation.id);

  if (error) {
    return { success: false, message: 'Could not save your response — please try again' };
  }

  // Keep the ticket in sync with the response.
  await supabase
    .from('tickets')
    .update({ is_active: response === 'accepted', updated_at: new Date().toISOString() })
    .eq('invitation_id', invitation.id);

  revalidatePath(`/rsvp/${token}`);
  return { success: true };
}
