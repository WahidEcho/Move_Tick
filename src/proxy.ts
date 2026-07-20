import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = [
  '/',
  '/events',
  '/login',
  '/signup',
  '/apply-organizer',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/forgot-password',
  '/reset-password',
];
const ATTENDEE_ROUTES = ['/dashboard', '/tickets', '/invitations', '/profile', '/notifications'];
const ORGANIZER_ROUTES = ['/organizer'];
const ADMIN_ROUTES = ['/admin'];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (pathname.startsWith('/events/')) return true;
  if (pathname.startsWith('/api/auth')) return true;
  if (pathname.startsWith('/api/webhooks')) return true; // provider webhooks self-authenticate (signature)
  if (pathname.startsWith('/api/mobile')) return true; // mobile app self-authenticates (Bearer token)
  if (pathname.startsWith('/api/track')) return true; // anonymous analytics beacon (no auth, no PII)
  if (pathname.startsWith('/api/cron')) return true; // cron self-authenticates via CRON_SECRET
  // Wallet passes self-authenticate (cookie session OR the ticket's secret
  // token) so guests can add to wallet straight from the invitation email.
  if (/^\/api\/tickets\/[^/]+\/(apple-pass|google-pass)$/.test(pathname)) return true;
  return false;
}

/**
 * Only known app areas require auth. Anything else (a typo'd or dead link)
 * falls through so Next.js renders the custom 404 instead of bouncing
 * visitors to /login for pages that don't exist.
 */
function isProtectedRoute(pathname: string): boolean {
  return (
    ATTENDEE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`)) ||
    ORGANIZER_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`)) ||
    ADMIN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`)) ||
    pathname.startsWith('/api')
  );
}

// ---------------------------------------------------------------------------
// Role-check cache. The admin/organizer gates below cost 1-3 DB round-trips on
// EVERY navigation; a short-lived HMAC-signed cookie remembers a passed check
// so repeat navigations skip the queries. Worst case after a role is revoked:
// stale access to the route shell for ROLE_TTL_MS (pages re-verify with their
// own guards). auth.getUser() still runs every request for session refresh.
// ---------------------------------------------------------------------------

const ROLE_COOKIE = 'mt-role';
const ROLE_TTL_MS = 5 * 60 * 1000;

async function hmacSign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

type RoleScope = 'admin' | 'organizer';

/** Parse + verify the role cookie; returns granted scopes or null. */
async function readRoleCookie(
  request: NextRequest,
  userId: string
): Promise<Set<RoleScope> | null> {
  const raw = request.cookies.get(ROLE_COOKIE)?.value;
  if (!raw) return null;
  const [uid, expires, scopes, sig] = raw.split('.');
  if (!uid || !expires || !scopes || !sig) return null;
  if (uid !== userId) return null;
  if (Number(expires) < Date.now()) return null;
  const expected = await hmacSign(`${uid}.${expires}.${scopes}`);
  if (expected !== sig) return null;
  return new Set(scopes.split(',') as RoleScope[]);
}

async function buildRoleCookie(userId: string, scopes: Set<RoleScope>): Promise<string> {
  const expires = Date.now() + ROLE_TTL_MS;
  const scopeStr = [...scopes].sort().join(',');
  const payload = `${userId}.${expires}.${scopeStr}`;
  return `${payload}.${await hmacSign(payload)}`;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (isPublicRoute(pathname) || !isProtectedRoute(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const needsAdmin = pathname.startsWith('/admin');
  const needsOrganizer = pathname.startsWith('/organizer');

  if (needsAdmin || needsOrganizer) {
    const cachedScopes = await readRoleCookie(request, user.id);
    const requiredScope: RoleScope = needsAdmin ? 'admin' : 'organizer';

    if (!cachedScopes?.has(requiredScope)) {
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      if (needsAdmin) {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('platform_role')
          .eq('id', user.id)
          .single();

        if (!profile || (profile.platform_role !== 'admin' && profile.platform_role !== 'support')) {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }

      if (needsOrganizer) {
        const { data: memberships } = await adminClient
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        const { data: profile } = await adminClient
          .from('profiles')
          .select('platform_role')
          .eq('id', user.id)
          .single();

        const isAdmin = profile?.platform_role === 'admin';
        const isMember = memberships && memberships.length > 0;

        if (!isAdmin && !isMember) {
          // Assigned event staff (co-organizers) belong in the portal too —
          // they were previously bounced here before any page could scope
          // their access.
          const { data: assignments } = await adminClient
            .from('event_staff_assignments')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(1);

          if (!assignments || assignments.length === 0) {
            return NextResponse.redirect(new URL('/', request.url));
          }
        }
      }

      // Check passed — remember it briefly so the next navigations are fast.
      const scopes = new Set<RoleScope>(cachedScopes ?? []);
      scopes.add(requiredScope);
      supabaseResponse.cookies.set(ROLE_COOKIE, await buildRoleCookie(user.id, scopes), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: ROLE_TTL_MS / 1000,
        path: '/',
      });
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
