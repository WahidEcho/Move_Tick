'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase-server';
import { getInvitation, updateInvitationStatus } from '@/services/invitations.service';
import { issueTicket } from '@/services/tickets.service';
import { getTicketTypeAvailability } from '@/services/tickets.service';
import { getTicketTypes } from '@/services/tickets.service';

export type RespondResult = { success: boolean; message?: string };

export async function respondToInvitation(
  invitationId: string,
  response: 'accepted' | 'declined'
): Promise<RespondResult> {
  // Auth must come from the request-scoped (cookie) client. The old code
  // called auth.getUser() on the SERVICE-ROLE client, which never carries a
  // session — so every user got "Not authenticated" no matter what.
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return { success: false, message: 'Your session expired — please sign in again.' };
  }

  const supabase = createServiceClient();

  const invitation = await getInvitation(invitationId);
  if (!invitation) return { success: false, message: 'Invitation not found' };

  // Verify the invitation belongs to this user's email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single();

  if (!profile?.email || profile.email !== invitation.invitee_email) {
    return { success: false, message: 'Invitation not found' };
  }

  if (invitation.status !== 'pending' && invitation.status !== 'opened' && invitation.status !== 'sent') {
    return { success: false, message: 'Invitation has already been responded to' };
  }

  if (response === 'declined') {
    await updateInvitationStatus(invitationId, 'declined');
    revalidatePath('/invitations');
    revalidatePath('/dashboard');
    return { success: true };
  }

  // Accepted: create registration and optionally issue ticket
  const eventId = invitation.event_id;
  let ticketTypeId = invitation.ticket_type_id;

  if (!ticketTypeId) {
    const ticketTypes = await getTicketTypes(eventId);
    const firstPublic = ticketTypes.find((tt) => tt.visibility === 'public') ?? ticketTypes[0];
    if (!firstPublic) {
      return { success: false, message: 'No ticket type available for this event' };
    }
    ticketTypeId = firstPublic.id;
  }

  // Check if user already registered
  const { data: existingReg } = await supabase
    .from('registrations')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingReg) {
    // Already registered, just update invitation status
    await updateInvitationStatus(invitationId, 'accepted');
    revalidatePath('/invitations');
    revalidatePath('/dashboard');
    return { success: true };
  }

  // Get event settings
  const { data: eventSettings } = await supabase
    .from('event_settings')
    .select('approval_required, enable_waitlist')
    .eq('event_id', eventId)
    .single();

  const approvalRequired = eventSettings?.approval_required ?? false;
  const enableWaitlist = eventSettings?.enable_waitlist ?? false;

  const availability = await getTicketTypeAvailability(ticketTypeId);

  let status: 'pending' | 'approved' | 'waitlisted' = 'pending';
  let ticketId: string | null = null;

  if (availability > 0 && !approvalRequired) {
    try {
      const ticket = await issueTicket(eventId, ticketTypeId, user.id);
      ticketId = ticket.id;
      status = 'approved';
    } catch {
      status = enableWaitlist ? 'waitlisted' : 'pending';
    }
  } else if (availability <= 0 && enableWaitlist) {
    status = 'waitlisted';
  } else if (approvalRequired) {
    status = 'pending';
  } else {
    status = 'pending';
  }

  const { error: regError } = await supabase.from('registrations').insert({
    event_id: eventId,
    user_id: user.id,
    ticket_type_id: ticketTypeId,
    status,
    ticket_id: ticketId,
    source: 'invitation',
  });

  if (regError) {
    return { success: false, message: `Failed to create registration: ${regError.message}` };
  }

  await updateInvitationStatus(invitationId, 'accepted');

  revalidatePath('/invitations');
  revalidatePath('/dashboard');
  return { success: true };
}
