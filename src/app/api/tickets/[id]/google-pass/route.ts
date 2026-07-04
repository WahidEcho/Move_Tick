import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleSaveUrlForTicket } from '@/services/wallet.service';
import { getGoogleConfig } from '@/lib/wallet/config';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!getGoogleConfig()) {
    return NextResponse.json({ error: 'Google Wallet is not configured' }, { status: 501 });
  }

  const { id } = await params;
  // Capability token for guests adding from the invitation email (the ticket's
  // own qr_token); logged-in users are covered by the cookie session instead.
  const token = req.nextUrl.searchParams.get('t');

  let url: string | null;
  try {
    url = await buildGoogleSaveUrlForTicket(id, token);
  } catch (e) {
    console.error('[google-pass] generation failed:', e);
    return NextResponse.json({ error: 'Failed to generate pass' }, { status: 500 });
  }

  if (!url) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  // Redirect straight to Google's save flow.
  return NextResponse.redirect(url, { status: 302 });
}
