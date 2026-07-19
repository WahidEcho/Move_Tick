'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/lib/auth';
import {
  createAnnouncement,
  sendAnnouncement,
  sendTestAnnouncementEmail,
  getAudienceCount,
  getAnnouncementProgress,
  getAnnouncementRecipients,
} from '@/services/announcements.service';
import { announcementEmail } from '@/lib/email-templates';
import type { AnnouncementAudience } from '@/types/database.types';

export interface ComposerInput {
  subject: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  audience: AnnouncementAudience;
  sendInApp: boolean;
}

export async function getAudienceCountAction(audience: AnnouncementAudience): Promise<number> {
  await requireSuperAdmin();
  return getAudienceCount(audience);
}

export async function previewAnnouncementAction(input: ComposerInput): Promise<string> {
  await requireSuperAdmin();
  const { html } = announcementEmail({
    headline: input.headline || 'Your headline here',
    body: input.body || 'Your message here',
    ctaLabel: input.ctaLabel || null,
    ctaUrl: input.ctaUrl || null,
    unsubscribeUrl: '#',
  });
  return html;
}

export async function sendTestEmailAction(input: ComposerInput): Promise<void> {
  const profile = await requireSuperAdmin();
  await sendTestAnnouncementEmail(
    { headline: input.headline, body: input.body, ctaLabel: input.ctaLabel || null, ctaUrl: input.ctaUrl || null },
    profile.email
  );
}

/** Creates the announcement row and immediately kicks off the real blast — the only path that writes to announcements/recipients. */
export async function sendAnnouncementToAudienceAction(input: ComposerInput): Promise<{ announcementId: string }> {
  const profile = await requireSuperAdmin();
  const created = await createAnnouncement({
    subject: input.subject,
    headline: input.headline,
    body: input.body,
    ctaLabel: input.ctaLabel || null,
    ctaUrl: input.ctaUrl || null,
    audience: input.audience,
    sendInApp: input.sendInApp,
    createdBy: profile.id,
  });
  await sendAnnouncement(created.id, profile.id);
  revalidatePath('/admin/announcements');
  return { announcementId: created.id };
}

/** Retries a 'failed' announcement — only re-sends recipients still pending. */
export async function retryAnnouncementAction(announcementId: string): Promise<void> {
  const profile = await requireSuperAdmin();
  await sendAnnouncement(announcementId, profile.id);
  revalidatePath('/admin/announcements');
}

export async function getAnnouncementProgressAction(announcementId: string) {
  await requireSuperAdmin();
  return getAnnouncementProgress(announcementId);
}

export async function getAnnouncementRecipientsAction(announcementId: string) {
  await requireSuperAdmin();
  return getAnnouncementRecipients(announcementId);
}
