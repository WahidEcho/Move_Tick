import { createServiceClient } from './supabase-server';
import { getPlatformSettings } from '@/services/platform-settings.service';
import type { Organization } from '@/types/database.types';

/**
 * Server-side enforcement of per-organization limits/permissions set by a
 * platform admin (organizations.max_events, max_published_events,
 * can_create_paid, requires_publish_approval, status). Throws a plain Error
 * with a user-facing message on violation — callers surface `err.message`
 * directly to the organizer. Admins bypass all of this (checked by the
 * caller, not here) since they have override authority.
 */

async function getOrgForLimits(orgId: string): Promise<Organization> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).single();
  if (error || !data) throw new Error('Organization not found');
  return data as Organization;
}

function assertOrgActive(org: Organization, action: string): void {
  if (org.status === 'suspended') {
    throw new Error(`Your organization is suspended and can't ${action}. Contact Move-Tick support.`);
  }
  if (org.status === 'on_hold') {
    throw new Error(`Your organization is on hold and can't ${action} right now. Contact Move-Tick support.`);
  }
}

async function countOrgEvents(orgId: string): Promise<number> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('archived_at', null);
  return count ?? 0;
}

async function countOrgPublishedEvents(orgId: string): Promise<number> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_published', true)
    .is('archived_at', null);
  return count ?? 0;
}

export async function assertCanCreateEvent(orgId: string): Promise<void> {
  const org = await getOrgForLimits(orgId);
  assertOrgActive(org, 'create events');

  if (org.max_events != null) {
    const count = await countOrgEvents(orgId);
    if (count >= org.max_events) {
      throw new Error(
        `You've reached your organization's event limit (${org.max_events}). Contact Move-Tick support to increase it.`
      );
    }
  }
}

/**
 * Checks status/paid-permission/published-count limits and throws if any is
 * violated. Returns `{ requiresApproval }` so the caller can decide how to
 * handle the (non-blocking) admin-approval requirement — this function never
 * blocks on it, since "requires approval" isn't a hard cap, it's a workflow.
 */
export async function assertCanPublish(orgId: string, isPaid: boolean): Promise<{ requiresApproval: boolean }> {
  const org = await getOrgForLimits(orgId);
  assertOrgActive(org, 'publish events');

  if (isPaid && !org.can_create_paid) {
    throw new Error("Your organization isn't approved to sell paid tickets yet. Contact Move-Tick support.");
  }

  // W9 (4.5a): when the platform requires a signed contract, publishing is
  // blocked until this organization's contract is completed. Toggle lives in
  // platform_settings.contract_required (default off until DocuSign is live);
  // an admin can also mark a manually-signed contract completed.
  const settings = await getPlatformSettings();
  if (settings.contract_required) {
    const supabase = createServiceClient();
    const { data: contract } = await supabase
      .from('contracts')
      .select('contract_status')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (contract?.contract_status !== 'completed') {
      throw new Error(
        'A signed organizer agreement is required before publishing events. Contact Move-Tick support to complete your contract.'
      );
    }
  }

  if (org.max_published_events != null) {
    const count = await countOrgPublishedEvents(orgId);
    if (count >= org.max_published_events) {
      throw new Error(
        `You've reached your organization's published-event limit (${org.max_published_events}). Unpublish another event first, or contact support.`
      );
    }
  }

  return { requiresApproval: org.requires_publish_approval };
}
