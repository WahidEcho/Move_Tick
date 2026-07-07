import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

// Move-Tick brand (mirrors ticket-pdf.ts)
const BRAND_PURPLE = rgb(0x5b / 255, 0x3b / 255, 0xe8 / 255); // #5B3BE8
const NEAR_BLACK = rgb(0x07 / 255, 0x07 / 255, 0x0f / 255); // #07070F
const MUTED = rgb(0.42, 0.42, 0.46);
const WHITE = rgb(1, 1, 1);
const LINE = rgb(0.9, 0.9, 0.92);

export interface SettlementPdfData {
  invoiceNumber: string;
  organizationName: string;
  eventTitle: string;
  eventDateLabel?: string | null;
  paidTicketCount: number;
  grossTicketRevenue: number;
  appliedCommissionPercentage: number;
  percentageCommissionAmount: number;
  fixedFeePerPaidTicket: number;
  fixedTicketFeeAmount: number;
  totalPlatformFees: number;
  organizerNetProfit: number;
  amountPaid: number;
  remainingBalance: number;
  paymentDateLabel?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  contactEmail: string;
}

function money(n: number): string {
  return `EGP ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

/** Sanitize a settlement PDF filename: "[Org] - [Event] - Settlement Statement.pdf". */
export function settlementPdfFilename(organizationName: string, eventTitle: string): string {
  const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, '').trim();
  return `${safe(organizationName)} - ${safe(eventTitle)} - Settlement Statement.pdf`;
}

/** Generate a branded settlement statement PDF: full commission/fee breakdown + payment details. */
export async function generateSettlementPdf(data: SettlementPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page: PDFPage = pdf.addPage([420, 700]);
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 32;

  page.drawRectangle({ x: 0, y: height - 92, width, height: 92, color: BRAND_PURPLE });
  page.drawText('Move-Tick', { x: margin, y: height - 50, size: 22, font: bold, color: WHITE });
  page.drawText('EVENT SETTLEMENT STATEMENT', { x: margin, y: height - 72, size: 9, font, color: WHITE });

  let y = height - 128;

  for (const line of wrapText(data.eventTitle, bold, 18, width - margin * 2)) {
    page.drawText(line, { x: margin, y, size: 18, font: bold, color: NEAR_BLACK });
    y -= 24;
  }
  page.drawText(data.organizationName, { x: margin, y, size: 12, font, color: MUTED });
  y -= 16;
  if (data.eventDateLabel) {
    page.drawText(data.eventDateLabel, { x: margin, y, size: 11, font, color: MUTED });
    y -= 16;
  }
  page.drawText(`Invoice ${data.invoiceNumber}`, { x: margin, y, size: 11, font: bold, color: BRAND_PURPLE });
  y -= 24;

  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: LINE });
  y -= 20;

  const row = (label: string, value: string, opts?: { boldValue?: boolean; boldLabel?: boolean }) => {
    page.drawText(label, { x: margin, y, size: 11, font: opts?.boldLabel ? bold : font, color: opts?.boldLabel ? NEAR_BLACK : MUTED });
    const valueFont = opts?.boldValue ? bold : font;
    const valueWidth = valueFont.widthOfTextAtSize(value, 11);
    page.drawText(value, { x: width - margin - valueWidth, y, size: 11, font: valueFont, color: NEAR_BLACK });
    y -= 20;
  };

  row('Paid tickets sold', String(data.paidTicketCount));
  row('Gross ticket revenue', money(data.grossTicketRevenue), { boldValue: true });
  y -= 4;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: LINE });
  y -= 20;

  page.drawText('Platform fees', { x: margin, y, size: 10, font: bold, color: MUTED });
  y -= 20;
  row(`Commission (${data.appliedCommissionPercentage}%)`, money(data.percentageCommissionAmount));
  row(`Fixed fee (${money(data.fixedFeePerPaidTicket)} x ${data.paidTicketCount})`, money(data.fixedTicketFeeAmount));
  row('Total platform fees', money(data.totalPlatformFees), { boldValue: true, boldLabel: true });
  y -= 4;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: LINE });
  y -= 20;

  row('Organizer net profit', money(data.organizerNetProfit), { boldValue: true, boldLabel: true });
  y -= 4;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: LINE });
  y -= 20;

  row('Amount paid to date', money(data.amountPaid));
  row('Remaining balance', money(data.remainingBalance), { boldValue: true });
  y -= 12;

  if (data.paymentDateLabel || data.paymentMethod || data.paymentReference) {
    page.drawText('Latest payment', { x: margin, y, size: 10, font: bold, color: MUTED });
    y -= 20;
    if (data.paymentDateLabel) row('Payment date', data.paymentDateLabel);
    if (data.paymentMethod) row('Method', data.paymentMethod);
    if (data.paymentReference) row('Reference', data.paymentReference);
    y -= 8;
  }

  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: LINE });
  y -= 24;

  const footer = `Questions about this statement? Contact ${data.contactEmail}`;
  for (const line of wrapText(footer, font, 10, width - margin * 2)) {
    page.drawText(line, { x: margin, y, size: 10, font, color: MUTED });
    y -= 14;
  }

  return pdf.save();
}
