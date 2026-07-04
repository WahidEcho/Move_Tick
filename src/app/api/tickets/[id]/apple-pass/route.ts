import { NextRequest, NextResponse } from 'next/server';
import { buildApplePassForTicket } from '@/services/wallet.service';
import { getAppleConfig } from '@/lib/wallet/config';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!getAppleConfig()) {
    return NextResponse.json({ error: 'Apple Wallet is not configured' }, { status: 501 });
  }

  const { id } = await params;
  // Capability token for guests adding from the invitation email (the ticket's
  // own qr_token); logged-in users are covered by the cookie session instead.
  const token = req.nextUrl.searchParams.get('t');

  let pass: Buffer | null;
  try {
    pass = await buildApplePassForTicket(id, token);
  } catch (e) {
    console.error('[apple-pass] generation failed:', e);
    return NextResponse.json({ error: 'Failed to generate pass' }, { status: 500 });
  }

  if (!pass) {
    // Not found, not owned (RLS), or no qr_token.
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(pass), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename="ticket-${id}.pkpass"`,
      'Cache-Control': 'no-store',
    },
  });
}
