import { createServiceClient } from '@/lib/supabase-server';
import { sendBatchEmails, type BatchEmailItem } from '@/lib/email';
import { sendLoggedEmail } from './email-log.service';
import { logAdminAction } from './audit.service';
import { announcementEmail } from '@/lib/email-templates';
import { getAppUrl } from '@/lib/app-url';
import type { Announcement, AnnouncementAudience, AnnouncementRecipient } from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unsubscribeUrl(token: string): string {
  return `${getAppUrl()}/unsubscribe/${token}`;
}

interface AudienceRecipient {
  userId: string;
  email: string;
  unsubscribeToken: string;
}

/** Resolves the recipient list for an audience — excludes disabled accounts, opted-out users, and guest-only tickets (no consent/no unsubscribe identity). */
async function resolveAudience(audience: AnnouncementAudience): Promise<AudienceRecipient[]> {
  const supabase = createServiceClient();
  const byId = new Map<string, AudienceRecipient>();

  const addProfiles = (rows: { id: string; email: string; unsubscribe_token: string }[]) => {
    for (const p of rows) {
      if (!byId.has(p.id)) byId.set(p.id, { userId: p.id, email: p.email, unsubscribeToken: p.unsubscribe_token });
    }
  };

  if (audience === 'attendees' || audience === 'both') {
    let page = 0;
    const pageSize = 1000;
    for (;;) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, unsubscribe_token')
        .eq('platform_role', 'attendee')
        .eq('is_disabled', false)
        .eq('marketing_opt_out', false)
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error) throw new Error(`Failed to fetch attendee audience: ${error.message}`);
      addProfiles(data ?? []);
      if (!data || data.length < pageSize) break;
      page += 1;
    }
  }

  if (audience === 'organizers' || audience === 'both') {
    let page = 0;
    const pageSize = 1000;
    for (;;) {
      const { data, error } = await supabase
        .from('organization_members')
        .select('profile:profiles(id, email, unsubscribe_token, is_disabled, marketing_opt_out)')
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error) throw new Error(`Failed to fetch organizer audience: ${error.message}`);
      const rows = (data ?? [])
        .map((m) => m.profile as unknown as { id: string; email: string; unsubscribe_token: string; is_disabled: boolean; marketing_opt_out: boolean } | null)
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && !p!.is_disabled && !p!.marketing_opt_out);
      addProfiles(rows);
      if (!data || data.length < pageSize) break;
      page += 1;
    }
  }

  return Array.from(byId.values());
}

export async function getAudienceCount(audience: AnnouncementAudience): Promise<number> {
  const recipients = await resolveAudience(audience);
  return recipients.length;
}

export interface CreateAnnouncementInput {
  subject: string;
  headline: string;
  body: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  audience: AnnouncementAudience;
  sendInApp: boolean;
  createdBy: string;
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      created_by: input.createdBy,
      subject: input.subject,
      headline: input.headline,
      body: input.body,
      cta_label: input.ctaLabel ?? null,
      cta_url: input.ctaUrl ?? null,
      audience: input.audience,
      send_in_app: input.sendInApp,
    })
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to create announcement: ${error?.message}`);
  return data as Announcement;
}

export interface AnnouncementContent {
  headline: string;
  body: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

/** Test-sends the current composer content to the admin's own inbox — stateless, no announcement row required. */
export async function sendTestAnnouncementEmail(content: AnnouncementContent, toEmail: string): Promise<void> {
  const { subject, html } = announcementEmail({
    headline: content.headline,
    body: content.body,
    ctaLabel: content.ctaLabel ?? null,
    ctaUrl: content.ctaUrl ?? null,
    unsubscribeUrl: unsubscribeUrl('test'),
  });

  await sendLoggedEmail({
    to: toEmail,
    subject: `[TEST] ${subject}`,
    html,
    emailType: 'announcement_test',
  });
}

/**
 * Snapshots the audience, optionally fans out in-app notifications, then
 * blasts the email in chunks of 100 via the Resend batch API. Safe to call
 * again on a 'failed' announcement — it only re-sends rows still pending.
 */
export async function sendAnnouncement(announcementId: string, actorId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: ann } = await supabase.from('announcements').select('*').eq('id', announcementId).single();
  if (!ann) throw new Error('Announcement not found');
  if (!['draft', 'failed'].includes(ann.status)) throw new Error(`Cannot send an announcement in status "${ann.status}"`);

  if (ann.status === 'draft') {
    const recipients = await resolveAudience(ann.audience as AnnouncementAudience);
    if (recipients.length === 0) throw new Error('No recipients match this audience');

    for (let i = 0; i < recipients.length; i += 1000) {
      const chunk = recipients.slice(i, i + 1000);
      const { error } = await supabase.from('announcement_recipients').insert(
        chunk.map((r) => ({ announcement_id: announcementId, user_id: r.userId, email: r.email }))
      );
      if (error) throw new Error(`Failed to snapshot recipients: ${error.message}`);
    }

    await supabase
      .from('announcements')
      .update({ status: 'sending', total_recipients: recipients.length, started_at: new Date().toISOString() })
      .eq('id', announcementId);

    if (ann.send_in_app) {
      for (let i = 0; i < recipients.length; i += 500) {
        const chunk = recipients.slice(i, i + 500);
        await supabase.from('notifications').insert(
          chunk.map((r) => ({
            user_id: r.userId,
            notification_type: 'general',
            title: ann.headline,
            message: ann.body.slice(0, 300),
            related_entity_type: 'announcement',
            related_entity_id: announcementId,
          }))
        );
      }
    }
  } else {
    await supabase
      .from('announcement_recipients')
      .update({ status: 'pending', error: null })
      .eq('announcement_id', announcementId)
      .eq('status', 'failed');
    await supabase.from('announcements').update({ status: 'sending' }).eq('id', announcementId);
  }

  const recipientLookup = new Map<string, string>(); // email -> unsubscribe_token
  {
    let page = 0;
    for (;;) {
      const { data } = await supabase
        .from('announcement_recipients')
        .select('user_id')
        .eq('announcement_id', announcementId)
        .range(page * 1000, page * 1000 + 999);
      if (!data || data.length === 0) break;
      const userIds = Array.from(new Set(data.map((r) => r.user_id).filter((id): id is string => Boolean(id))));
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, email, unsubscribe_token').in('id', userIds);
        for (const p of profiles ?? []) recipientLookup.set(p.email, p.unsubscribe_token);
      }
      if (data.length < 1000) break;
      page += 1;
    }
  }

  let sentCount = 0;
  let failedCount = 0;

  for (;;) {
    const { data: batch, error: fetchErr } = await supabase
      .from('announcement_recipients')
      .select('*')
      .eq('announcement_id', announcementId)
      .eq('status', 'pending')
      .limit(BATCH_SIZE);
    if (fetchErr) throw new Error(`Failed to fetch pending recipients: ${fetchErr.message}`);
    if (!batch || batch.length === 0) break;

    const items: BatchEmailItem[] = batch.map((r) => {
      const token = recipientLookup.get(r.email) ?? 'unknown';
      const url = unsubscribeUrl(token);
      const { subject, html } = announcementEmail({
        headline: ann.headline,
        body: ann.body,
        ctaLabel: ann.cta_label,
        ctaUrl: ann.cta_url,
        unsubscribeUrl: url,
      });
      return {
        to: r.email,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${url}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };
    });

    const result = await sendBatchEmails(items);
    const status = result.ok ? 'sent' : 'failed';
    const ids = batch.map((r) => r.id);

    await supabase
      .from('announcement_recipients')
      .update({ status, sent_at: result.ok ? new Date().toISOString() : null, error: result.ok ? null : (result.error ?? 'unknown') })
      .in('id', ids);

    await supabase.from('email_log').insert(
      batch.map((r) => ({
        recipient_email: r.email,
        email_type: `announcement:${announcementId}`,
        subject: ann.subject,
        delivery_status: status,
        failure_reason: result.ok ? null : (result.error ?? 'unknown'),
      }))
    );

    if (result.ok) sentCount += batch.length;
    else failedCount += batch.length;

    await supabase
      .from('announcements')
      .update({ sent_count: sentCount, failed_count: failedCount })
      .eq('id', announcementId);

    if (batch.length < BATCH_SIZE) break;
    await sleep(BATCH_DELAY_MS);
  }

  const finalStatus = failedCount === 0 ? 'sent' : 'failed';
  await supabase
    .from('announcements')
    .update({ status: finalStatus, completed_at: new Date().toISOString() })
    .eq('id', announcementId);

  await logAdminAction({
    actorId,
    action: 'announcement.send',
    targetType: 'announcement',
    targetId: announcementId,
    newValue: { audience: ann.audience, sent_count: sentCount, failed_count: failedCount, status: finalStatus },
  });
}

export async function getAnnouncementProgress(
  announcementId: string
): Promise<Pick<Announcement, 'status' | 'total_recipients' | 'sent_count' | 'failed_count'>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('announcements')
    .select('status, total_recipients, sent_count, failed_count')
    .eq('id', announcementId)
    .single();
  if (error || !data) throw new Error(`Failed to fetch announcement progress: ${error?.message}`);
  return data;
}

export interface GetAnnouncementsFilters {
  page?: number;
  page_size?: number;
}

export async function getAnnouncements(
  filters: GetAnnouncementsFilters = {}
): Promise<PaginatedResult<Announcement>> {
  const supabase = createServiceClient();
  const { page = 1, page_size = 20 } = filters;
  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  const { data, error, count } = await supabase
    .from('announcements')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw new Error(`Failed to fetch announcements: ${error.message}`);

  const total = count ?? 0;
  return {
    data: (data ?? []) as Announcement[],
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}

export async function getAnnouncementRecipients(announcementId: string): Promise<AnnouncementRecipient[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('announcement_recipients')
    .select('*')
    .eq('announcement_id', announcementId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`Failed to fetch recipients: ${error.message}`);
  return (data ?? []) as AnnouncementRecipient[];
}

/** Sets marketing_opt_out for the profile owning this token. Public, no auth — the token itself is the capability. */
export async function unsubscribeByToken(token: string): Promise<{ ok: boolean; alreadyUnsubscribed?: boolean }> {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, marketing_opt_out')
    .eq('unsubscribe_token', token)
    .maybeSingle();
  if (!profile) return { ok: false };
  if (profile.marketing_opt_out) return { ok: true, alreadyUnsubscribed: true };

  const { error } = await supabase.from('profiles').update({ marketing_opt_out: true }).eq('id', profile.id);
  if (error) return { ok: false };
  return { ok: true };
}
