/**
 * DocuSign integration — PLACEHOLDER ONLY. No live calls are made here.
 *
 * Do not implement the real envelope-creation flow until Mohamed provides
 * the contract template (see docs/DOCUSIGN_SETUP.md for the full checklist
 * and the 7 required env vars). When that happens, this file is where the
 * DocuSign eSignature REST API (JWT grant auth + envelopes:create) gets
 * wired up, called from src/services/contracts.service.ts.
 *
 * Reference: https://developers.docusign.com/docs/esign-rest-api/
 */

export interface DocuSignConfig {
  integrationKey: string;
  userId: string;
  accountId: string;
  privateKey: string;
  authServer: string;
  templateId: string;
  webhookSecret: string;
}

/** Reads the 7 DocuSign env vars without throwing — returns null if any are missing (expected pre-template). */
export function getDocuSignConfig(): DocuSignConfig | null {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;
  const templateId = process.env.DOCUSIGN_TEMPLATE_ID;
  const webhookSecret = process.env.DOCUSIGN_WEBHOOK_SECRET;

  if (!integrationKey || !userId || !accountId || !privateKey || !authServer || !templateId || !webhookSecret) {
    return null;
  }

  return { integrationKey, userId, accountId, privateKey, authServer, templateId, webhookSecret };
}

export function isDocuSignConfigured(): boolean {
  return getDocuSignConfig() !== null;
}

export interface CreateEnvelopeParams {
  organizationName: string;
  signerName: string;
  signerEmail: string;
  commissionPercentage: number;
  fixedFeePerPaidTicket: number;
}

export interface CreateEnvelopeResult {
  envelopeId: string;
  signingUrl: string;
}

/**
 * TODO(DocuSign): implement once the contract template is provided.
 * Expected flow: JWT grant → access token → envelopes:create from
 * templateId with signer + template roles (organizationName,
 * commissionPercentage, fixedFeePerPaidTicket as template fields) →
 * return the envelope id and an embedded/remote signing url.
 */
export async function createEnvelope(_params: CreateEnvelopeParams): Promise<CreateEnvelopeResult> {
  throw new Error(
    'DocuSign integration is not implemented yet — pending the contract template. See docs/DOCUSIGN_SETUP.md.'
  );
}

/** TODO(DocuSign): verify the HMAC signature on incoming DocuSign Connect webhook payloads using DOCUSIGN_WEBHOOK_SECRET. */
export function verifyWebhookSignature(_payload: string, _signature: string): boolean {
  throw new Error('DocuSign webhook verification is not implemented yet — pending the contract template.');
}
