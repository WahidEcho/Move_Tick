import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { dataUrlToBase64 } from './email';

// Move-Tick brand
const BRAND_PURPLE = rgb(0x5b / 255, 0x3b / 255, 0xe8 / 255); // #5B3BE8
const NEAR_BLACK = rgb(0x07 / 255, 0x07 / 255, 0x0f / 255); // #07070F
const MUTED = rgb(0.42, 0.42, 0.46);
const WHITE = rgb(1, 1, 1);

export interface TicketPdfData {
  eventTitle: string;
  dateLabel?: string | null;
  venue?: string | null;
  city?: string | null;
  ticketTypeName: string;
  attendeeName: string;
  /** PNG data URL (data:image/png;base64,...) — the ticket's QR code. */
  qrPngDataUrl: string;
}

/** Wrap text to a max width, returning lines. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Generate a branded PDF ticket (event details + embedded QR). */
export async function generateTicketPdf(data: TicketPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page: PDFPage = pdf.addPage([420, 620]);
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 32;

  // Header band
  page.drawRectangle({ x: 0, y: height - 92, width, height: 92, color: BRAND_PURPLE });
  page.drawText('Move-Tick', { x: margin, y: height - 50, size: 22, font: bold, color: WHITE });
  page.drawText('YOUR TICKET', { x: margin, y: height - 72, size: 9, font, color: WHITE });

  let y = height - 130;

  // Event title (wrapped)
  for (const line of wrapText(data.eventTitle, bold, 20, width - margin * 2)) {
    page.drawText(line, { x: margin, y, size: 20, font: bold, color: NEAR_BLACK });
    y -= 26;
  }
  y -= 6;

  // Date + location
  if (data.dateLabel) {
    page.drawText(data.dateLabel, { x: margin, y, size: 11, font, color: MUTED });
    y -= 18;
  }
  const location = [data.venue, data.city].filter(Boolean).join(', ');
  if (location) {
    for (const line of wrapText(location, font, 11, width - margin * 2)) {
      page.drawText(line, { x: margin, y, size: 11, font, color: MUTED });
      y -= 16;
    }
  }

  // Divider
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.9, 0.9, 0.92) });
  y -= 24;

  // Ticket + attendee
  page.drawText('TICKET', { x: margin, y, size: 8, font: bold, color: MUTED });
  page.drawText(data.ticketTypeName, { x: margin, y: y - 16, size: 13, font: bold, color: NEAR_BLACK });
  page.drawText('ATTENDEE', { x: width / 2, y, size: 8, font: bold, color: MUTED });
  page.drawText(data.attendeeName, { x: width / 2, y: y - 16, size: 13, font: bold, color: NEAR_BLACK });
  y -= 52;

  // QR code (embedded PNG)
  try {
    const qrBytes = Buffer.from(dataUrlToBase64(data.qrPngDataUrl), 'base64');
    const qr = await pdf.embedPng(qrBytes);
    const qrSize = 210;
    const qrX = (width - qrSize) / 2;
    const qrY = y - qrSize;
    // White card behind QR
    page.drawRectangle({ x: qrX - 14, y: qrY - 14, width: qrSize + 28, height: qrSize + 28, color: WHITE, borderColor: rgb(0.9, 0.9, 0.92), borderWidth: 1 });
    page.drawImage(qr, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    y = qrY - 34;
  } catch {
    // If QR fails to embed, continue without it.
  }

  // Caption + warm footer
  const caption = 'Show this QR at the entrance to check in.';
  page.drawText(caption, {
    x: (width - font.widthOfTextAtSize(caption, 10)) / 2,
    y,
    size: 10,
    font,
    color: MUTED,
  });

  const footer = "We can't wait to see you there.";
  page.drawText(footer, {
    x: (width - font.widthOfTextAtSize(footer, 10)) / 2,
    y: 36,
    size: 10,
    font,
    color: BRAND_PURPLE,
  });

  return pdf.save();
}
