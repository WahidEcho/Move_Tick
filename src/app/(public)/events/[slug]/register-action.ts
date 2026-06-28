'use server';

import { createServiceClient } from '@/lib/supabase-server';
import * as ticketsService from '@/services/tickets.service';
import * as eventsService from '@/services/events.service';
import { sendTicketEmail } from '@/services/email.service';

export type RegisterResult =
  | { success: true; registration: { id: string; status: string }; ticket?: { id: string }; message: string }
  | { success: false; message: string };

export async function registerForEvent(
  eventId: string,
  ticketTypeId: string,
  userId: string
): Promise<RegisterResult> {
  const supabase = createServiceClient();

  // Fetch event with settings
  const event = await eventsService.getEvent(eventId);
  if (!event) {
    return { success: false, message: 'Event not found' };
  }
  if (event.is_cancelled) {
    return { success: false, message: 'This event has been cancelled' };
  }
  if (event.visibility === 'invite_only') {
    return { success: false, message: 'This event is invite-only' };
  }

  const settings = event.event_settings;
  const approvalRequired = settings?.approval_required ?? false;
  const enableWaitlist = settings?.enable_waitlist ?? false;
  const capacity = event.capacity ?? null;

  // Check ticket type availability
  const available = await ticketsService.getTicketTypeAvailability(ticketTypeId);
  if (available <= 0) {
    return { success: false, message: 'This ticket type is sold out' };
  }

  // Check event capacity
  const stats = await eventsService.getEventStats(eventId);
  const isFull = capacity !== null && stats.confirmed >= capacity;

  // Check if user already registered
  const { data: existingReg } = await supabase
    .from('registrations')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingReg) {
    if (['confirmed', 'approved'].includes(existingReg.status as string)) {
      return { success: false, message: 'You are already registered for this event' };
    }
    if (existingReg.status === 'pending') {
      return { success: false, message: 'Your registration is pending approval' };
    }
    if (existingReg.status === 'waitlisted') {
      return { success: false, message: 'You are on the waitlist' };
    }
    // cancelled/rejected - allow re-registration
  }

  if (isFull) {
    if (enableWaitlist) {
      const { data: registration, error } = await supabase
        .from('registrations')
        .insert({
          event_id: eventId,
          user_id: userId,
          ticket_type_id: ticketTypeId,
          status: 'waitlisted',
          ticket_id: null,
          source: 'direct',
          notes: null,
        })
        .select('id, status')
        .single();

      if (error) {
        return { success: false, message: error.message };
      }
      return {
        success: true,
        registration: registration as { id: string; status: string },
        message: "You've been added to the waitlist. We'll notify you if a spot opens up.",
      };
    }
    return { success: false, message: 'This event is full' };
  }

  if (approvalRequired) {
    const { data: registration, error } = await supabase
      .from('registrations')
      .insert({
        event_id: eventId,
        user_id: userId,
        ticket_type_id: ticketTypeId,
        status: 'pending',
        ticket_id: null,
        source: 'direct',
        notes: null,
      })
      .select('id, status')
      .single();

    if (error) {
      return { success: false, message: error.message };
    }
    return {
      success: true,
      registration: registration as { id: string; status: string },
      message: 'Your registration has been submitted. You will be notified once approved.',
    };
  }

  // Open registration: create with confirmed status and issue ticket
  try {
    const ticket = await ticketsService.issueTicket(eventId, ticketTypeId, userId);

    const { data: registration, error } = await supabase
      .from('registrations')
      .insert({
        event_id: eventId,
        user_id: userId,
        ticket_type_id: ticketTypeId,
        status: 'confirmed',
        ticket_id: ticket.id,
        source: 'direct',
        notes: null,
      })
      .select('id, status')
      .single();

    if (error) {
      await ticketsService.deactivateTicket(ticket.id);
      return { success: false, message: error.message };
    }

    // Best-effort ticket-delivery email. Never fail registration if email fails.
    const emailResult = await sendTicketEmail(ticket.id);
    if (!emailResult.ok) {
      console.warn(`[register] ticket email not sent for ${ticket.id}: ${emailResult.error}`);
    }

    return {
      success: true,
      registration: registration as { id: string; status: string },
      ticket: { id: ticket.id },
      message: "You're registered! Check your email and dashboard for your ticket.",
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Registration failed',
    };
  }
}
