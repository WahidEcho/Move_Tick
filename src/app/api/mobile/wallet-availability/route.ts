import { walletAvailability } from '@/lib/wallet/config';
import { corsJson, optionsResponse } from '@/lib/api/mobile-cors';

/**
 * Which wallet providers are configured on this deployment.
 *
 * The mobile app uses this to decide whether to offer "Add to Apple Wallet" /
 * "Add to Google Wallet" at all — without it the app would have to show both
 * buttons and let one of them fail with a 501, which reads as a broken app
 * rather than an unconfigured provider.
 *
 * Deliberately unauthenticated: the response is two booleans about the server's
 * own configuration and reveals nothing about any user or ticket.
 */
export async function GET() {
  const { apple, google } = walletAvailability();
  return corsJson({ success: true, apple, google });
}

export async function OPTIONS() {
  return optionsResponse();
}
