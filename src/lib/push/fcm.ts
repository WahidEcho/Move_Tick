import crypto from 'crypto';

/**
 * W8: Firebase Cloud Messaging HTTP v1 sender — zero new dependencies.
 * Auth: a service-account JWT (RS256, signed with Node crypto) exchanged for
 * an OAuth token, cached until near expiry.
 *
 * Configure with FIREBASE_SERVICE_ACCOUNT_JSON — the full service-account
 * JSON (raw or base64) from Firebase console → Project settings → Service
 * accounts → Generate new private key. Without it every send is a no-op, so
 * the platform works fine before the key exists.
 */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedAccount: ServiceAccount | null | undefined;
let cachedToken: { token: string; expiresAt: number } | null = null;

function getServiceAccount(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    cachedAccount = null;
    return null;
  }
  try {
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as ServiceAccount;
    cachedAccount = parsed.project_id && parsed.client_email && parsed.private_key ? parsed : null;
  } catch {
    cachedAccount = null;
  }
  return cachedAccount;
}

export function isPushConfigured(): boolean {
  return getServiceAccount() !== null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(): Promise<string | null> {
  const account = getServiceAccount();
  if (!account) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const signature = crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(account.private_key);
  const assertion = `${header}.${claims}.${b64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    console.error('[fcm] token exchange failed:', res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushSendResult {
  sent: number;
  invalidTokens: string[];
}

/** Sends one notification to many device tokens; reports tokens FCM says are dead. */
export async function sendPushToTokens(tokens: string[], message: PushMessage): Promise<PushSendResult> {
  const account = getServiceAccount();
  const accessToken = await getAccessToken();
  if (!account || !accessToken || tokens.length === 0) return { sent: 0, invalidTokens: [] };

  const url = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;
  const invalidTokens: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    tokens.map(async (token) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: message.title, body: message.body },
            data: message.data ?? {},
            android: { priority: 'HIGH' },
            apns: { payload: { aps: { sound: 'default' } } },
          },
        }),
      });
      if (res.ok) {
        sent += 1;
        return;
      }
      const body = await res.text();
      if (res.status === 404 || body.includes('UNREGISTERED') || body.includes('INVALID_ARGUMENT')) {
        invalidTokens.push(token);
      } else {
        console.warn('[fcm] send failed:', res.status, body.slice(0, 200));
      }
    })
  );

  return { sent, invalidTokens };
}
