/** Normalized data needed to build a wallet pass for one ticket. */
export interface WalletTicketData {
  ticketId: string;
  /** The qr_token — same value the gate scanner validates. Encoded as the pass barcode. */
  qrToken: string;
  eventTitle: string;
  eventDateISO?: string | null;
  /** Event end (ISO). The pass expires 24h after this. */
  eventEndISO?: string | null;
  venue?: string | null;
  city?: string | null;
  ticketTypeName: string;
  attendeeName: string;
}
