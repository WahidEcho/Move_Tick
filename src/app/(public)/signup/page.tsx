'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase-browser';
import { z } from 'zod';
import { signupSchema, type SignupInput } from '@/lib/validations';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/form-field';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const extendedSchema = signupSchema.extend({
    terms_accepted: z.literal(true, {
      message: 'You must accept the terms',
    }),
  });

  type ExtendedSignup = z.infer<typeof extendedSchema>;

  const form = useForm<ExtendedSignup>({
    resolver: zodResolver(extendedSchema) as never,
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      terms_accepted: false as unknown as true,
    },
  });

  const onSubmit = async (data: SignupInput & { terms_accepted: boolean }) => {
    setSubmitError(null);
    const supabase = createClient();

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setSubmitError(error.message);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: authData.user.id,
          email: data.email,
          full_name: data.full_name,
          platform_role: 'attendee',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your details to get started with Move Beyond
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              label="Full name"
              name="full_name"
              error={form.formState.errors.full_name?.message}
              required
            >
              <Input
                id="full_name"
                type="text"
                placeholder="Your name"
                autoComplete="name"
                {...form.register('full_name')}
                aria-invalid={!!form.formState.errors.full_name}
                className="w-full"
              />
            </FormField>
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
                autoComplete="new-password"
                {...form.register('password')}
                aria-invalid={!!form.formState.errors.password}
                className="w-full"
              />
            </FormField>
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms_accepted"
                checked={form.watch('terms_accepted')}
                onCheckedChange={(checked) =>
                  form.setValue('terms_accepted', (checked === true) as true)
                }
                aria-invalid={!!form.formState.errors.terms_accepted}
              />
              <label
                htmlFor="terms_accepted"
                className="text-sm text-muted-foreground"
              >
                I accept the{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {form.formState.errors.terms_accepted && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.terms_accepted.message}
              </p>
            )}
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
                  Creating account...
                </>
              ) : (
                'Sign up'
              )}
            </Button>
            <div className="text-center text-sm">
              <Link
                href="/login"
                className="text-primary hover:underline"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
