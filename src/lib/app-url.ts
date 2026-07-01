/**
 * Single source of truth for the app's public URL. Used everywhere an
 * absolute link is generated (emails, payment redirects, wallet passes).
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_APP_URL — the canonical production domain (https://move-tick.mbeg.org)
 *  2. VERCEL_URL — preview deployments where the env var isn't set
 *  3. http://localhost:3000 — local development only
 *
 * In production a missing NEXT_PUBLIC_APP_URL is a misconfiguration: we log
 * loudly instead of silently minting localhost links in real emails.
 */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (configured) return configured;

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[app-url] NEXT_PUBLIC_APP_URL is not set in production — generated links will point to localhost. Set it to https://move-tick.mbeg.org.'
    );
  }
  return 'http://localhost:3000';
}
