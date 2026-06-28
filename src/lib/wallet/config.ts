/**
 * Wallet (Apple/Google) configuration + feature gating.
 *
 * Everything is read from server env. If the required secrets for a provider
 * are absent, that provider is reported as disabled and the UI/endpoints
 * gracefully skip it — so the app runs fine before certs are set up.
 *
 * Certs/keys are passed as BASE64-encoded env vars (safe for multi-line PEM in
 * .env and hosting dashboards). Use:  base64 -i cert.pem | pbcopy
 */

function b64(envVar: string | undefined): string | null {
  if (!envVar) return null;
  try {
    return Buffer.from(envVar, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

export interface AppleWalletConfig {
  passTypeIdentifier: string;
  teamIdentifier: string;
  organizationName: string;
  signerCert: string; // PEM
  signerKey: string; // PEM
  signerKeyPassphrase?: string;
  wwdrCert: string; // PEM
}

export interface GoogleWalletConfig {
  issuerId: string;
  serviceAccountEmail: string;
  serviceAccountPrivateKey: string; // PEM
  classSuffix: string;
}

export function getAppleConfig(): AppleWalletConfig | null {
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_IDENTIFIER;
  const teamIdentifier = process.env.APPLE_TEAM_IDENTIFIER;
  const signerCert = b64(process.env.APPLE_PASS_SIGNER_CERT_B64);
  const signerKey = b64(process.env.APPLE_PASS_SIGNER_KEY_B64);
  const wwdrCert = b64(process.env.APPLE_WWDR_CERT_B64);

  if (!passTypeIdentifier || !teamIdentifier || !signerCert || !signerKey || !wwdrCert) {
    return null;
  }
  return {
    passTypeIdentifier,
    teamIdentifier,
    organizationName: process.env.APPLE_PASS_ORG_NAME ?? 'Move Beyond',
    signerCert,
    signerKey,
    signerKeyPassphrase: process.env.APPLE_PASS_SIGNER_KEY_PASSPHRASE || undefined,
    wwdrCert,
  };
}

export function getGoogleConfig(): GoogleWalletConfig | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const serviceAccountEmail = process.env.GOOGLE_WALLET_SA_EMAIL;
  // Private key may be base64 (preferred) or raw PEM with literal \n.
  const rawKey = process.env.GOOGLE_WALLET_SA_PRIVATE_KEY_B64
    ? b64(process.env.GOOGLE_WALLET_SA_PRIVATE_KEY_B64)
    : process.env.GOOGLE_WALLET_SA_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? null;

  if (!issuerId || !serviceAccountEmail || !rawKey) {
    return null;
  }
  return {
    issuerId,
    serviceAccountEmail,
    serviceAccountPrivateKey: rawKey,
    classSuffix: process.env.GOOGLE_WALLET_CLASS_SUFFIX ?? 'movetick_event_ticket',
  };
}

/** Cheap booleans for UI gating (server-side). */
export function walletAvailability(): { apple: boolean; google: boolean } {
  return { apple: getAppleConfig() !== null, google: getGoogleConfig() !== null };
}
