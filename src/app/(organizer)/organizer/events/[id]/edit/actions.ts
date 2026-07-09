'use server';

import { revalidatePath } from 'next/cache';
import { getEventManageAccess } from '@/lib/auth';
import {
  updateEvent,
  updateEventSettings,
  publishEvent,
  cancelEvent,
} from '@/services/events.service';
import { getTicketTypes } from '@/services/tickets.service';
import { assertCanPublish } from '@/lib/org-limits';
import { sendAdminOrgAlert } from '@/services/admin-alerts.service';
import { getOrganizationMembers } from '@/services/organizations.service';
import { createNotification } from '@/services/notifications.service';
import type { EventInput, EventSettingsInput } from '@/lib/validations';

export async function updateEventAction(
  eventId: string,
  data: EventInput
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }

  try {
    await updateEvent(eventId, {
      title: data.title,
      slug: data.slug,
      description: data.description,
      cover_image_url: data.cover_image_url || null,
      start_date: data.start_date,
      end_date: data.end_date,
      location: data.location ?? null,
      venue: data.venue ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
      category: data.category,
      visibility: data.visibility,
      // capacity intentionally omitted — derived from ticket types
      // (recomputeEventCapacity in tickets.service).
      doors_open_time: data.doors_open_time || null,
      maps_url: data.maps_url || null,
      facilities: data.facilities ?? [],
    });
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/edit`);
    revalidatePath('/organizer/overview');
    revalidatePath('/organizer/events');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update event',
    };
  }
}

export async function updateEventSettingsAction(
  eventId: string,
  data: EventSettingsInput
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }

  try {
    await updateEventSettings(eventId, {
      approval_required: data.approval_required,
      enable_waitlist: data.enable_waitlist,
      show_guest_list: data.show_guest_list,
      show_registered_count: data.show_registered_count,
      show_remaining_seats: data.show_remaining_seats,
      show_attendee_preview: data.show_attendee_preview,
      show_company_badges: data.show_company_badges,
      allow_referrals: data.allow_referrals,
      allow_chat: data.allow_chat,
      allow_networking: data.allow_networking,
    });
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/edit`);
    revalidatePath(`/organizer/events/${eventId}/settings`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update settings',
    };
  }
}

export async function publishEventAction(
  eventId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }

  const isAdmin = access.profile.platform_role === 'admin';
  const orgId = access.event.organization_id;
  const orgName = access.event.organization?.name ?? 'Unknown organization';

  try {
    // Platform admins bypass organizer limits entirely — they have override
    // authority (this is also how the admin events list's Publish action
    // reaches the same underlying rule-free path via adminSetEventPublished).
    if (!isAdmin) {
      const ticketTypes = await getTicketTypes(eventId);
      const isPaid = ticketTypes.some((tt) => tt.price > 0);

      let limitResult: { requiresApproval: boolean };
      try {
        limitResult = await assertCanPublish(orgId, isPaid);
      } catch (limitErr) {
        const message = limitErr instanceof Error ? limitErr.message : '';
        if (message.includes('published-event limit')) {
          await sendAdminOrgAlert({
            action: 'Organization reached its published-event limit',
            organizationId: orgId,
            organizationName: orgName,
            eventId,
            eventTitle: access.event.title,
            dashboardPath: '/admin/organizations',
          }).catch(() => {});
        }
        throw limitErr;
      }

      if (limitResult.requiresApproval) {
        const members = await getOrganizationMembers(orgId);
        await Promise.allSettled([
          ...members.map((m) =>
            createNotification({
              userId: m.user_id,
              organizationId: orgId,
              type: 'general',
              title: 'Publish request sent for review',
              message: `"${access.event.title}" needs admin approval before it goes live. We've notified the Move-Tick team.`,
              relatedEntityType: 'event',
              relatedEntityId: eventId,
            })
          ),
          sendAdminOrgAlert({
            action: 'Organization requests event publish approval',
            organizationId: orgId,
            organizationName: orgName,
            eventId,
            eventTitle: access.event.title,
            dashboardPath: '/admin/events',
          }),
        ]);

        return {
          success: false,
          error:
            "Your organization requires admin approval before publishing. We've notified the Move-Tick team — you'll be notified once it's approved.",
        };
      }
    }

    await publishEvent(eventId);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/edit`);
    revalidatePath('/organizer/overview');
    revalidatePath('/organizer/events');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to publish event',
    };
  }
}

export async function cancelEventAction(
  eventId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }

  try {
    await cancelEvent(eventId);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/edit`);
    revalidatePath(`/organizer/events/${eventId}/settings`);
    revalidatePath('/organizer/overview');
    revalidatePath('/organizer/events');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to cancel event',
    };
  }
}
