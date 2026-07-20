import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'mt_vsid';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * W7: records a public event page view for conversion analytics. Deduped per
 * (event, anonymous session, day) by a unique index — a refresh doesn't
 * inflate counts. No PII: the session id is a random cookie value.
 */
export async function POST(req: NextRequest) {
  let body: { eventId?: string; authed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const eventId = body.eventId;
  if (typeof eventId !== 'string' || !UUID_RE.test(eventId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Stable per-browser session id in a first-party cookie (set if absent).
  let sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  const res = NextResponse.json({ ok: true });
  if (!sessionId || sessionId.length < 16) {
    sessionId = crypto.randomUUID();
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }

  const supabase = createServiceClient();
  // Idempotent for the day: the unique index turns a duplicate into a no-op.
  await supabase
    .from('event_page_views')
    .insert({ event_id: eventId, session_id: sessionId, is_authenticated: Boolean(body.authed) });

  return res;
}
