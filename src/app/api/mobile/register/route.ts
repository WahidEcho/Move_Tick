import { createServiceClient } from '@/lib/supabase-server';
import { registerForEvent } from '@/app/(public)/events/[slug]/register-action';
import { corsJson, optionsResponse } from '@/lib/api/mobile-cors';

/**
 * Registration endpoint for the mobile app. Authenticates via the Supabase
 * access token (Authorization: Bearer <jwt>) instead of cookies, then runs the
 * exact same registration logic as the web (capacity, approval, waitlist,
 * free-only guard, atomic ticket issuance, confirmation email + PDF).
 */
export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return corsJson({ success: false, message: 'Not authenticated' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return corsJson({ success: false, message: 'Not authenticated' }, { status: 401 });
  }

  let body: { eventId?: string; ticketTypeId?: string };
  try {
    body = await request.json();
  } catch {
    return corsJson({ success: false, message: 'Invalid request body' }, { status: 400 });
  }

  const { eventId, ticketTypeId } = body;
  if (typeof eventId !== 'string' || typeof ticketTypeId !== 'string') {
    return corsJson(
      { success: false, message: 'eventId and ticketTypeId are required' },
      { status: 400 }
    );
  }

  const result = await registerForEvent(eventId, ticketTypeId, user.id);
  return corsJson(result, { status: result.success ? 200 : 400 });
}
