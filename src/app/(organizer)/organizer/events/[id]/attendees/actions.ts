'use server';

import { revalidatePath } from 'next/cache';
import * as attendeesService from '@/services/attendees.service';

export async function approveAttendeeAction(
  registrationId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await attendeesService.approveRegistration(registrationId);
    revalidatePath(`/organizer/events/${eventId}/attendees`);
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Approve failed';
    return { success: false, error: msg };
  }
}

export async function rejectAttendeeAction(
  registrationId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await attendeesService.rejectRegistration(registrationId);
    revalidatePath(`/organizer/events/${eventId}/attendees`);
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Reject failed';
    return { success: false, error: msg };
  }
}

export async function cancelRegistrationAction(
  registrationId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await attendeesService.cancelRegistration(registrationId);
    revalidatePath(`/organizer/events/${eventId}/attendees`);
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Cancel failed';
    return { success: false, error: msg };
  }
}

export async function promoteFromWaitlistAction(
  registrationId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await attendeesService.promoteFromWaitlist(registrationId);
    revalidatePath(`/organizer/events/${eventId}/attendees`);
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Promote failed';
    return { success: false, error: msg };
  }
}

function escapeCsv(val: string): string {
  return val.includes(',') || val.includes('"') || val.includes('\n')
    ? `"${String(val).replace(/"/g, '""')}"`
    : val;
}

export async function exportAttendeesAction(
  eventId: string
): Promise<{ csv: string; error?: string }> {
  try {
    const rows = await attendeesService.exportAttendees(eventId);
    const headers = [
      'ID',
      'User ID',
      'Name',
      'Email',
      'Phone',
      'Ticket Type',
      'Status',
      'Presence',
      'QR Token',
      'Registered At',
    ];
    const csvRows = rows.map((r) =>
      [
        r.id,
        r.user_id,
        r.full_name ?? '',
        r.email,
        r.phone ?? '',
        r.ticket_type_name,
        r.status,
        r.presence,
        r.qr_token ?? '',
        r.created_at,
      ].map((c) => escapeCsv(String(c)))
    );
    const csv = headers.map(escapeCsv).join(',') + '\n' + csvRows.map((r) => r.join(',')).join('\n');
    return { csv };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Export failed';
    return { csv: '', error: msg };
  }
}
