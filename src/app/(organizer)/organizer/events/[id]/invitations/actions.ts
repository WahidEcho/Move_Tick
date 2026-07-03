'use server';

import { revalidatePath } from 'next/cache';
import * as invitationsService from '@/services/invitations.service';
import { getTicketTypes } from '@/services/tickets.service';
import type { CSVInviteeRow } from '@/types/domain.types';

export async function addInvitation(
  eventId: string,
  orgId: string,
  invitee: { name: string; email: string; ticketTypeId?: string | null }
): Promise<{ success: boolean; error?: string }> {
  if (!invitee.email?.trim()) {
    return { success: false, error: 'Email is required' };
  }
  try {
    await invitationsService.createInvitation({
      event_id: eventId,
      organization_id: orgId,
      invitee_name: invitee.name?.trim() || invitee.email.trim(),
      invitee_email: invitee.email.trim().toLowerCase(),
      ticket_type_id: invitee.ticketTypeId ?? null,
    });
    revalidatePath(`/organizer/events/${eventId}/invitations`);
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to add guest' };
  }
}

export async function importInvitations(
  eventId: string,
  orgId: string,
  invitations: CSVInviteeRow[]
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];

  if (!eventId || !orgId || !invitations?.length) {
    return { created: 0, skipped: 0, errors: ['No valid invitations to import'] };
  }

  try {
    const ticketTypes = await getTicketTypes(eventId);
    const ticketTypeMap = new Map(
      ticketTypes.map((tt) => [tt.name.toLowerCase().trim(), tt.id])
    );

    const bulkInput = invitations.map((inv) => ({
      invitee_name: inv.name.trim(),
      invitee_email: inv.email.trim().toLowerCase(),
      invitee_phone: inv.phone?.trim() ?? null,
      invitee_company: inv.company?.trim() ?? null,
      invitee_title: inv.title?.trim() ?? null,
      ticket_type_id:
        inv.ticket_type?.trim()
          ? ticketTypeMap.get(inv.ticket_type.toLowerCase().trim()) ?? null
          : null,
      tag: inv.tag?.trim() ?? null,
    }));

    const result = await invitationsService.createBulkInvitations(
      eventId,
      orgId,
      bulkInput
    );

    revalidatePath(`/organizer/events/${eventId}/invitations`);
    revalidatePath(`/organizer/events/${eventId}`);

    return {
      created: result.created,
      skipped: result.skipped,
      errors: [],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Import failed';
    errors.push(msg);
    return { created: 0, skipped: 0, errors };
  }
}

export async function resendFailedInvitations(
  eventId: string
): Promise<{ count: number; error?: string }> {
  try {
    const count = await invitationsService.resendInvitations(eventId, 'failed');
    revalidatePath(`/organizer/events/${eventId}/invitations`);
    revalidatePath(`/organizer/events/${eventId}`);
    return { count };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Resend failed';
    return { count: 0, error: msg };
  }
}

export async function resendInvitation(
  invitationId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await invitationsService.resendInvitation(invitationId);
    revalidatePath(`/organizer/events/${eventId}/invitations`);
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Resend failed';
    return { success: false, error: msg };
  }
}

export async function exportInvitations(
  eventId: string
): Promise<{ csv: string; error?: string }> {
  try {
    const { data } = await invitationsService.getEventInvitations(eventId, {
      page: 1,
      page_size: 10000,
    });

    const headers = [
      'Name',
      'Email',
      'Company',
      'Ticket Type',
      'Status',
      'Sent Date',
      'Responded Date',
    ];
    const rows = data.map((inv) => [
      inv.invitee_name ?? '',
      inv.invitee_email ?? '',
      inv.invitee_company ?? '',
      (inv.ticket_type as { name?: string } | null)?.name ?? '',
      inv.status ?? '',
      inv.sent_at ?? '',
      inv.responded_at ?? '',
    ]);

    const escape = (val: string) =>
      val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${String(val).replace(/"/g, '""')}"`
        : val;

    const csv =
      headers.join(',') +
      '\n' +
      rows.map((r) => r.map((c) => escape(String(c))).join(',')).join('\n');

    return { csv };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Export failed';
    return { csv: '', error: msg };
  }
}
