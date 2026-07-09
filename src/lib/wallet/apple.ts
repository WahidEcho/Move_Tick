import { PKPass } from 'passkit-generator';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getAppleConfig } from './config';
import type { WalletTicketData } from './types';

const ASSETS_DIR = join(process.cwd(), 'src/lib/wallet/assets');

function asset(name: string): Buffer {
  return readFileSync(join(ASSETS_DIR, name));
}

const BRAND_PURPLE = 'rgb(91, 59, 232)';
const WHITE = 'rgb(255, 255, 255)';

/**
 * Build a signed Apple Wallet `.pkpass` for a ticket, or null if Apple Wallet
 * isn't configured. The pass barcode carries the qr_token, so scanning the pass
 * checks in exactly like the in-app QR.
 */
export async function generateApplePass(ticket: WalletTicketData): Promise<Buffer | null> {
  const cfg = getAppleConfig();
  if (!cfg) return null;

  // Pass expires 24h after the event ends, then Wallet marks it expired.
  const expirationDate = ticket.eventEndISO
    ? new Date(new Date(ticket.eventEndISO).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const pass = new PKPass(
    {
      'icon.png': asset('icon.png'),
      'icon@2x.png': asset('icon@2x.png'),
      'logo.png': asset('logo.png'),
      'logo@2x.png': asset('logo@2x.png'),
    },
    {
      wwdr: cfg.wwdrCert,
      signerCert: cfg.signerCert,
      signerKey: cfg.signerKey,
      signerKeyPassphrase: cfg.signerKeyPassphrase,
    },
    {
      passTypeIdentifier: cfg.passTypeIdentifier,
      teamIdentifier: cfg.teamIdentifier,
      organizationName: cfg.organizationName,
      description: `${ticket.eventTitle} ticket`,
      serialNumber: ticket.ticketId,
      // Header reads [MB mark logo] MoveTick — matches the ticket design.
      logoText: 'MoveTick',
      foregroundColor: WHITE,
      labelColor: WHITE,
      backgroundColor: BRAND_PURPLE,
    }
  );

  pass.type = 'eventTicket';

  // expirationDate is a "method prop" in passkit-generator — set via the method.
  if (expirationDate) {
    pass.setExpirationDate(new Date(expirationDate));
  }

  pass.primaryFields.push({
    key: 'event',
    label: 'EVENT',
    value: ticket.eventTitle,
  });

  if (ticket.eventDateISO) {
    pass.secondaryFields.push({
      key: 'date',
      label: 'DATE',
      value: ticket.eventDateISO,
      dateStyle: 'PKDateStyleMedium',
      timeStyle: 'PKDateStyleShort',
    });
  }

  const location = [ticket.venue, ticket.city].filter(Boolean).join(', ');
  if (location) {
    pass.secondaryFields.push({ key: 'venue', label: 'VENUE', value: location });
  }

  pass.auxiliaryFields.push(
    { key: 'ticketType', label: 'TICKET', value: ticket.ticketTypeName },
    { key: 'attendee', label: 'ATTENDEE', value: ticket.attendeeName }
  );

  pass.setBarcodes({
    message: ticket.qrToken,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
    altText: ticket.ticketTypeName,
  });

  return pass.getAsBuffer();
}
