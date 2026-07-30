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
  /**
   * The attendee's profile photo (uploaded, or from Google sign-in). Rendered
   * as the pass thumbnail — a faded circle. Absent for guest tickets and for
   * accounts with no photo, in which case the pass simply has no thumbnail.
   */
  attendeeAvatarUrl?: string | null;
}
