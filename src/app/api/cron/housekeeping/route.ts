import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { getEventExpiryBufferHours } from '@/lib/event-visibility';
import { tryPromoteOldestWaitlisted } from '@/services/attendees.service';
import { createNotification } from '@/services/notifications.service';
import { sendLoggedEmail } from '@/services/email-log.service';

export const maxDuration = 300;

/**
 * W5 housekeeping cron (Vercel cron, every 6h — see vercel.json). Four jobs:
 *   1. "Your event just came down" email + in-app notice when an event crosses
 *      its expiry buffer (org override or platform default). (4.1b)
 *   2. Auto-scale organizer limits: every successfully completed event raises
 *      max_events so good organizers grow without admin intervention. (4.3b)
 *   3. Waitlist sweep: promote whoever now fits. (4.8 backstop)
 *   4. Archive audit-log entries older than 12 months. (4.6b)
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const summary = { expiryNotified: 0, limitsRaised: 0, waitlistPromoted: 0, auditArchived: 0 };
  const defaultBuffer = await getEventExpiryBufferHours();
  const now = Date.now();

  // 1 — expiry heads-up
  const { data: endedEvents } = await supabase
    .from('events')
    .select('id, title, end_date, organization_id, organization:organizations(name, contact_email, event_expiry_buffer_hours)')
    .eq('is_published', true)
    .is('expiry_notified_at', null)
    .is('archived_at', null)
    .lt('end_date', new Date().toISOString())
    .limit(100);

  for (const ev of endedEvents ?? []) {
    const org = ev.organization as unknown as {
      name: string;
      contact_email: string | null;
      event_expiry_buffer_hours: number | null;
    } | null;
    const buffer = org?.event_expiry_buffer_hours ?? defaultBuffer;
    if (new Date(ev.end_date as string).getTime() + buffer * 3600_000 > now) continue; // not crossed yet

    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', ev.organization_id);
    await Promise.allSettled(
      (members ?? []).map((m) =>
        createNotification({
          userId: m.user_id as string,
          organizationId: ev.organization_id as string,
          type: 'general',
          title: `Event ended — ${ev.title}`,
          message: `${ev.title} has passed its ${buffer}h post-event window and is no longer publicly listed. Its data and settlement remain available in your dashboard.`,
          relatedEntityType: 'event',
          relatedEntityId: ev.id as string,
        })
      )
    );
    if (org?.contact_email) {
      await sendLoggedEmail({
        to: org.contact_email,
        subject: `Your event is now offline — ${ev.title}`,
        html: `<p>Hi ${org.name},</p><p><strong>${ev.title}</strong> ended and has now left public discovery (${buffer} hours after the end time). Nothing was deleted — attendance data, financials, and the settlement remain in your organizer dashboard.</p><p>— Move-Tick</p>`,
        emailType: 'event_expired_notice',
        relatedOrganizationId: ev.organization_id as string,
        relatedEventId: ev.id as string,
      });
    }
    await supabase.from('events').update({ expiry_notified_at: new Date().toISOString() }).eq('id', ev.id);
    summary.expiryNotified += 1;
  }

  // 2 — auto-scale organizer limits
  const { data: cappedOrgs } = await supabase
    .from('organizations')
    .select('id, name, max_events')
    .not('max_events', 'is', null)
    .eq('status', 'active');
  for (const org of cappedOrgs ?? []) {
    const { count: completed } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .eq('is_published', true)
      .eq('is_cancelled', false)
      .is('archived_at', null)
      .lt('end_date', new Date().toISOString());
    const newMax = Math.max(Number(org.max_events), (completed ?? 0) + 2);
    if (newMax > Number(org.max_events)) {
      await supabase.from('organizations').update({ max_events: newMax }).eq('id', org.id);
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', org.id);
      await Promise.allSettled(
        (members ?? []).map((m) =>
          createNotification({
            userId: m.user_id as string,
            organizationId: org.id as string,
            type: 'general',
            title: 'Event limit raised',
            message: `Nice work — after another successful event, ${org.name} can now run up to ${newMax} events.`,
          })
        )
      );
      summary.limitsRaised += 1;
    }
  }

  // 3 — waitlist sweep (events with waitlisted registrations, upcoming only)
  const { data: waitlistEvents } = await supabase
    .from('registrations')
    .select('event_id')
    .eq('status', 'waitlisted')
    .limit(200);
  const uniqueEventIds = Array.from(new Set((waitlistEvents ?? []).map((r) => r.event_id as string)));
  for (const eventId of uniqueEventIds) {
    summary.waitlistPromoted += await tryPromoteOldestWaitlisted(eventId).catch(() => 0);
  }

  // 4 — audit archive (rows older than 12 months)
  const { data: archived } = await supabase.rpc('archive_old_audit_logs', { p_older_than_months: 12 });
  summary.auditArchived = Number(archived ?? 0);

  return NextResponse.json({ ok: true, ...summary });
}
