import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import { dataUrlToBase64 } from './email';

// Move-Tick wallet-card palette (matches the web ticket card + brand purple/green).
const GRADIENT_TOP: [number, number, number] = [0x12 / 255, 0x0e / 255, 0x28 / 255]; // #120E28
const GRADIENT_MID: [number, number, number] = [0x25 / 255, 0x1a / 255, 0x66 / 255]; // #251A66
const GRADIENT_BOTTOM: [number, number, number] = [0x4c / 255, 0x33 / 255, 0xd6 / 255]; // #4C33D6
const GLOW_VIOLET = rgb(0x8b / 255, 0x7b / 255, 1);
const GLOW_GREEN = rgb(0x4a / 255, 0xde / 255, 0);
const LABEL_PURPLE = rgb(0xa9 / 255, 0x9b / 255, 0xff / 255); // #A99BFF
const WHITE = rgb(1, 1, 1);
const NEAR_BLACK = rgb(0x07 / 255, 0x07 / 255, 0x0f / 255);
const MUTED_ON_WHITE = rgb(0.42, 0.42, 0.46);
const DIVIDER = rgb(1, 1, 1);

export interface TicketPdfData {
  eventTitle: string;
  dateLabel?: string | null;
  venue?: string | null;
  city?: string | null;
  ticketTypeName: string;
  attendeeName: string;
  /** PNG data URL (data:image/png;base64,...) — the ticket's QR code. */
  qrPngDataUrl: string;
  organizationName?: string | null;
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): RGB {
  return rgb(lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t));
}

/** Vertical 3-stop gradient (top → 55% → bottom), drawn as thin horizontal bands. */
function drawGradientBackground(page: PDFPage, width: number, height: number): void {
  const bands = 140;
  const bandHeight = height / bands + 0.5;
  const midStop = 0.55;

  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1); // 0 at top, 1 at bottom
    const color =
      t <= midStop
        ? lerpColor(GRADIENT_TOP, GRADIENT_MID, t / midStop)
        : lerpColor(GRADIENT_MID, GRADIENT_BOTTOM, (t - midStop) / (1 - midStop));
    const y = height - (i + 1) * (height / bands);
    page.drawRectangle({ x: 0, y, width, height: bandHeight, color });
  }
}

/** A soft diagonal glow sweeping the lower third, simulating the reference design's light streaks. */
function drawGlowStreaks(page: PDFPage, width: number, height: number): void {
  const sweeps: { yFrac: number; h: number; color: RGB; opacity: number }[] = [
    { yFrac: 0.24, h: 70, color: GLOW_VIOLET, opacity: 0.14 },
    { yFrac: 0.18, h: 34, color: WHITE, opacity: 0.16 },
    { yFrac: 0.1, h: 90, color: GLOW_GREEN, opacity: 0.05 },
  ];
  for (const s of sweeps) {
    page.drawRectangle({
      x: -width * 0.4,
      y: height * s.yFrac,
      width: width * 1.8,
      height: s.h,
      rotate: degrees(-11),
      color: s.color,
      opacity: s.opacity,
    });
  }
}

/** Generate a branded wallet-style PDF ticket (dark gradient card, notch, labeled fields, QR). */
export async function generateTicketPdf(data: TicketPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page: PDFPage = pdf.addPage([420, 740]);
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 32;
  const colRightX = width / 2 + 12;

  drawGradientBackground(page, width, height);
  drawGlowStreaks(page, width, height);

  // Notch (a white circle straddling the top edge reads as a cutout against a white PDF viewer page).
  page.drawCircle({ x: width / 2, y: height, size: 16, color: WHITE });

  // Header: MoveTick wordmark
  page.drawText('MoveTick', { x: margin, y: height - 58, size: 22, font: bold, color: WHITE });
  page.drawText('by Move Beyond', { x: margin, y: height - 74, size: 9, font, color: WHITE, opacity: 0.65 });

  const divider = (y: number) =>
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.8, color: DIVIDER, opacity: 0.14 });

  divider(height - 100);

  let y = height - 128;
  page.drawText('EVENT', { x: margin, y, size: 8, font: bold, color: LABEL_PURPLE });
  y -= 28;
  const titleLines = wrapText(data.eventTitle, bold, 26, width - margin * 2).slice(0, 2);
  for (const line of titleLines) {
    page.drawText(line, { x: margin, y, size: 26, font: bold, color: WHITE });
    y -= 30;
  }

  const fieldsTop = height - 234;
  divider(fieldsTop);

  const dateVenueLabelY = fieldsTop - 28;
  page.drawText('DATE', { x: margin, y: dateVenueLabelY, size: 8, font: bold, color: LABEL_PURPLE });
  page.drawText('VENUE', { x: colRightX, y: dateVenueLabelY, size: 8, font: bold, color: LABEL_PURPLE });

  const dateVenueValueY = dateVenueLabelY - 18;
  if (data.dateLabel) {
    page.drawText(data.dateLabel, { x: margin, y: dateVenueValueY, size: 12, font: bold, color: WHITE });
  }
  const venueText = [data.venue, data.city].filter(Boolean).join(', ');
  const venueLines = wrapText(venueText, bold, 12, width - colRightX - margin).slice(0, 2);
  venueLines.forEach((line, i) => {
    page.drawText(line, { x: colRightX, y: dateVenueValueY - i * 16, size: 12, font: bold, color: WHITE });
  });

  const ticketFieldsTop = fieldsTop - 112;
  divider(ticketFieldsTop);

  const ticketAttendeeLabelY = ticketFieldsTop - 28;
  page.drawText('TICKET', { x: margin, y: ticketAttendeeLabelY, size: 8, font: bold, color: LABEL_PURPLE });
  page.drawText('ATTENDEE', { x: colRightX, y: ticketAttendeeLabelY, size: 8, font: bold, color: LABEL_PURPLE });

  const ticketAttendeeValueY = ticketAttendeeLabelY - 18;
  for (const line of wrapText(data.ticketTypeName, bold, 12, colRightX - margin - 12).slice(0, 2)) {
    page.drawText(line, { x: margin, y: ticketAttendeeValueY, size: 12, font: bold, color: WHITE });
  }
  for (const line of wrapText(data.attendeeName, bold, 12, width - colRightX - margin).slice(0, 2)) {
    page.drawText(line, { x: colRightX, y: ticketAttendeeValueY, size: 12, font: bold, color: WHITE });
  }

  // QR card (white, sharp corners — a rounded card needs SVG-path math that isn't worth the fragility here).
  const qrCardW = 240;
  const qrCardH = 264;
  const qrCardX = (width - qrCardW) / 2;
  const qrCardY = 64;
  page.drawRectangle({ x: qrCardX, y: qrCardY, width: qrCardW, height: qrCardH, color: WHITE });

  try {
    const qrBytes = Buffer.from(dataUrlToBase64(data.qrPngDataUrl), 'base64');
    const qr = await pdf.embedPng(qrBytes);
    const qrSize = 200;
    page.drawImage(qr, { x: qrCardX + (qrCardW - qrSize) / 2, y: qrCardY + 48, width: qrSize, height: qrSize });
  } catch {
    // If QR fails to embed, the white card still renders — better than a broken page.
  }

  const typeCaption = data.ticketTypeName;
  page.drawText(typeCaption, {
    x: qrCardX + (qrCardW - bold.widthOfTextAtSize(typeCaption, 10)) / 2,
    y: qrCardY + 30,
    size: 10,
    font: bold,
    color: NEAR_BLACK,
  });
  const scanCaption = 'Scan at entrance';
  page.drawText(scanCaption, {
    x: qrCardX + (qrCardW - font.widthOfTextAtSize(scanCaption, 8)) / 2,
    y: qrCardY + 16,
    size: 8,
    font,
    color: MUTED_ON_WHITE,
  });

  const footer = "We can't wait to see you there.";
  page.drawText(footer, {
    x: (width - font.widthOfTextAtSize(footer, 9)) / 2,
    y: 34,
    size: 9,
    font,
    color: WHITE,
    opacity: 0.7,
  });

  return pdf.save();
}
