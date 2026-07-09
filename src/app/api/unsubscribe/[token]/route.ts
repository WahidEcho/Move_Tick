import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/services/announcements.service';

/** One-click unsubscribe (RFC 8058 / List-Unsubscribe-Post) — mail clients POST here directly, no page visit. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await unsubscribeByToken(token);
  if (!result.ok) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
