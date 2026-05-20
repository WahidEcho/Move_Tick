import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/events', '/login', '/signup', '/apply-organizer'];
const ATTENDEE_ROUTES = ['/dashboard', '/tickets', '/invitations', '/profile'];
const ORGANIZER_ROUTES = ['/organizer'];
const ADMIN_ROUTES = ['/admin'];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (pathname.startsWith('/events/')) return true;
  if (pathname.startsWith('/api/auth')) return true;
  return false;
}

export async function middleware(request: NextRequest) {
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

  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (pathname.startsWith('/admin')) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('platform_role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.platform_role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (pathname.startsWith('/organizer')) {
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
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
