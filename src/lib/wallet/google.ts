import jwt from 'jsonwebtoken';
import { getGoogleConfig } from './config';
import type { WalletTicketData } from './types';

const BRAND_PURPLE_HEX = '#5B3BE8';

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}

/**
 * Build an "Add to Google Wallet" save URL for a ticket, or null if Google
 * Wallet isn't configured. The EventTicketObject's barcode carries the qr_token
 * so scanning the saved pass checks in like the in-app QR.
 *
 * The EventTicketClass is included in the JWT payload, so Google provisions it
 * on first save — no separate class-creation API call is required.
 */
export function getGoogleWalletSaveUrl(ticket: WalletTicketData): string | null {
  const cfg = getGoogleConfig();
  if (!cfg) return null;

  const classId = `${cfg.issuerId}.${cfg.classSuffix}`;
  // Object id: issuerId.<sanitized-ticket-id>; allowed chars [A-Za-z0-9._-].
  const objectId = `${cfg.issuerId}.${ticket.ticketId.replace(/[^A-Za-z0-9._-]/g, '')}`;

  const ticketClass = {
    id: classId,
    issuerName: 'Move Beyond',
    reviewStatus: 'UNDER_REVIEW',
    eventName: { defaultValue: { language: 'en-US', value: ticket.eventTitle } },
    hexBackgroundColor: BRAND_PURPLE_HEX,
  };

  const location = [ticket.venue, ticket.city].filter(Boolean).join(', ');

  const ticketObject = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    barcode: { type: 'QR_CODE', value: ticket.qrToken, alternateText: ticket.ticketTypeName },
    ticketHolderName: ticket.attendeeName,
    ticketType: { defaultValue: { language: 'en-US', value: ticket.ticketTypeName } },
    ...(ticket.eventDateISO
      ? { dateTime: { start: ticket.eventDateISO } }
      : {}),
    ...(location
      ? { venue: { name: { defaultValue: { language: 'en-US', value: location } }, address: { defaultValue: { language: 'en-US', value: location } } } }
      : {}),
  };

  const claims = {
    iss: cfg.serviceAccountEmail,
    aud: 'google',
    typ: 'savetowallet',
    origins: [appUrl()],
    payload: {
      eventTicketClasses: [ticketClass],
      eventTicketObjects: [ticketObject],
    },
  };

  const token = jwt.sign(claims, cfg.serviceAccountPrivateKey, { algorithm: 'RS256' });
  return `https://pay.google.com/gp/v/save/${token}`;
}
