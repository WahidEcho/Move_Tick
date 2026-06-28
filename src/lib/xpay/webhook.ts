import crypto from 'crypto';

/**
 * Verify an XPay webhook signature.
 *
 * Header format:  XPay-Signature: t=<unix_seconds>,v1=<hex_hmac_sha256>
 * Signed payload: `${t}.${rawBody}`  (raw request body, BEFORE JSON parsing)
 * Algorithm:      HMAC-SHA256 with the endpoint signing secret, hex-encoded.
 * Replay guard:   reject if |now - t| > 300 seconds.
 * Compare:        constant-time.
 */
export function verifyXpaySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;

  const parts: Record<string, string> = {};
  for (const segment of signatureHeader.split(',')) {
    const idx = segment.indexOf('=');
    if (idx === -1) continue;
    parts[segment.slice(0, idx).trim()] = segment.slice(idx + 1).trim();
  }

  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;

  const tsNum = Number(t);
  if (!Number.isFinite(tsNum)) return false;
  if (Math.abs(Date.now() / 1000 - tsNum) > 300) return false; // replay window

  const computed = crypto
    .createHmac('sha256', secret)
    .update(`${t}.${rawBody}`)
    .digest('hex');

  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
