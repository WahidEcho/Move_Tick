'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase-browser';
import { loginSchema, type LoginInput } from '@/lib/validations';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/form-field';
import { Loader2 } from 'lucide-react';

/** Failsafe: reject if the auth call hangs so the button never stays frozen. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

/**
 * Where a user lands when they didn't ask for a specific page:
 * platform admin → /admin, org member → /organizer/overview, else /dashboard.
 * Any lookup failure falls back to /dashboard — never blocks login.
 */
async function resolveRoleDestination(supabase: SupabaseClient): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '/dashboard';

    const [profileRes, memberRes, staffRes] = await Promise.all([
      supabase.from('profiles').select('platform_role').eq('id', user.id).single(),
      supabase.from('organization_members').select('id').eq('user_id', user.id).limit(1),
      supabase
        .from('event_staff_assignments')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1),
    ]);

    if (profileRes.data?.platform_role === 'admin') return '/admin';
    if ((memberRes.data?.length ?? 0) > 0) return '/organizer/overview';
    // Assigned co-organizers (no org of their own) land on their shared events.
    if ((staffRes.data?.length ?? 0) > 0) return '/organizer/events';
  } catch {
    // fall through to the attendee default
  }
  return '/dashboard';
}

/** Official Google "G" mark (inline so no extra asset request). */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.97 10.97 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onGoogle = async () => {
    setSubmitError(null);
    const supabase = createClient();
    const next = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/dashboard';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setSubmitError(error.message);
  };

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setSubmitError(null);
    const supabase = createClient();

    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        }),
        15_000
      );

      if (error) {
        setSubmitError(error.message);
        return;
      }

      // Honor an explicit ?redirect= (from a protected page or an event
      // registration); otherwise send the user to their role's home.
      const destination = redirectParam ?? (await resolveRoleDestination(supabase));

      // Hard navigation: guarantees the server picks up the new auth cookie and
      // redirects reliably. (router.push + router.refresh raced and left the user
      // authenticated but stuck on /login.)
      window.location.assign(destination);
    } catch {
      setSubmitError(
        'Signing in is taking too long. Check your connection and try again.'
      );
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              label="Email"
              name="email"
              error={form.formState.errors.email?.message}
              required
            >
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...form.register('email')}
                aria-invalid={!!form.formState.errors.email}
                className="w-full"
              />
            </FormField>
            <FormField
              label="Password"
              name="password"
              error={form.formState.errors.password?.message}
              required
            >
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...form.register('password')}
                aria-invalid={!!form.formState.errors.password}
                className="w-full"
              />
            </FormField>
            {submitError && (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onGoogle}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
            <div className="space-y-2 text-center text-sm">
              <Link
                href="/signup"
                className="text-primary hover:underline"
              >
                Don&apos;t have an account? Sign up
              </Link>
              <div>
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
