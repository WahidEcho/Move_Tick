import { createServiceClient } from '@/lib/supabase-server';
import type { Contract, ContractStatus } from '@/types/database.types';

/**
 * DocuSign contract scaffold — TABLE and CRUD only, no live DocuSign calls.
 * Do not wire src/lib/docusign/* into these functions until Mohamed provides
 * the contract template (see docs/DOCUSIGN_SETUP.md). Once a template
 * exists, `createContractForOrganization` is the place to call
 * `docusign.createEnvelope(...)` and store the returned envelope id/url.
 */

export async function getContractsForOrganization(organizationId: string): Promise<Contract[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch contracts: ${error.message}`);
  return (data ?? []) as Contract[];
}

export async function getLatestContractForOrganization(organizationId: string): Promise<Contract | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch contract: ${error.message}`);
  return data as Contract | null;
}

export interface CreateContractData {
  organizationId: string;
  entityName: string;
  commissionPercentage?: number | null;
  fixedFeePerPaidTicket?: number | null;
}

/**
 * Creates a draft contract row only — does NOT call DocuSign. Once a
 * template is available, this is where `docusign.envelopes.create(...)`
 * gets called and the returned envelope id / signing url get stored via
 * `updateContractStatus`.
 */
export async function createDraftContract(data: CreateContractData): Promise<Contract> {
  const supabase = createServiceClient();
  const { data: contract, error } = await supabase
    .from('contracts')
    .insert({
      organization_id: data.organizationId,
      entity_name: data.entityName,
      commission_percentage: data.commissionPercentage ?? null,
      fixed_fee_per_paid_ticket: data.fixedFeePerPaidTicket ?? null,
      contract_status: 'draft' satisfies ContractStatus,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create contract: ${error.message}`);
  return contract as Contract;
}

export async function updateContractStatus(
  contractId: string,
  status: ContractStatus,
  fields?: {
    docusignEnvelopeId?: string | null;
    docusignSigningUrl?: string | null;
    generatedAt?: string | null;
    sentAt?: string | null;
    signedAt?: string | null;
    completedAt?: string | null;
  }
): Promise<Contract> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('contracts')
    .update({
      contract_status: status,
      docusign_envelope_id: fields?.docusignEnvelopeId,
      docusign_signing_url: fields?.docusignSigningUrl,
      generated_at: fields?.generatedAt,
      sent_at: fields?.sentAt,
      signed_at: fields?.signedAt,
      completed_at: fields?.completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update contract: ${error.message}`);
  return data as Contract;
}
