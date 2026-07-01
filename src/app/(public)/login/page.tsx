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

    const [profileRes, memberRes] = await Promise.all([
      supabase.from('profiles').select('platform_role').eq('id', user.id).single(),
      supabase.from('organization_members').select('id').eq('user_id', user.id).limit(1),
    ]);

    if (profileRes.data?.platform_role === 'admin') return '/admin';
    if ((memberRes.data?.length ?? 0) > 0) return '/organizer/overview';
  } catch {
    // fall through to the attendee default
  }
  return '/dashboard';
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const [submitError, setSubmitError] = useState<string | null>(null);

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
