'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase-browser';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { profileSchema, type ProfileInput } from '@/lib/validations';
import { AvatarUpload } from '@/components/forms/avatar-upload';
import { toast } from 'sonner';
import type { Profile } from '@/types/database.types';
import { Loader2, Mail, Phone, ShieldCheck, Headphones, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      avatar_url: '',
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        toast.error('Failed to load profile');
        return;
      }

      setProfile(data as Profile);
      reset({
        full_name: data.full_name ?? '',
        phone: data.phone ?? '',
        avatar_url: data.avatar_url ?? '',
      });
      setLoading(false);
    };

    fetchProfile();
  }, [supabase, reset]);

  const onSubmit = async (data: ProfileInput) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Not authenticated');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name || null,
        phone: data.phone || null,
        avatar_url: data.avatar_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update profile');
      return;
    }

    toast.success('Profile updated successfully');
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const newPassword = (form.elements.namedItem('newPassword') as HTMLInputElement)
      ?.value;
    const confirmPassword = (
      form.elements.namedItem('confirmPassword') as HTMLInputElement
    )?.value;

    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);

    if (error) {
      toast.error('Failed to update password');
      return;
    }

    toast.success('Password updated successfully');
    form.reset();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load profile
      </div>
    );
  }

  const completedFields = [profile.full_name, profile.phone, profile.avatar_url, profile.email].filter(Boolean).length;
  const completion = Math.round((completedFields / 4) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="cinematic-panel relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="grid size-20 shrink-0 place-items-center rounded-3xl border border-white/10 bg-gradient-to-br from-primary to-brand-green text-2xl font-bold text-black shadow-xl">
            {(profile.full_name || profile.email || 'M').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="cinematic-kicker">Your identity</p>
            <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight">{profile.full_name || 'Complete your profile'}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Mail className="size-4" />{profile.email}</p>
            {profile.phone && <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="size-4" />{profile.phone}</p>}
          </div>
          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:w-44">
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Profile complete</span><strong>{completion}%</strong></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-primary to-brand-green transition-all" style={{ width: `${completion}%` }} /></div>
          </div>
        </div>
      </div>

      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle>Profile information</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update your name, phone, and avatar
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                {...register('full_name')}
                placeholder="Your name"
                className={errors.full_name ? 'border-destructive' : ''}
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">
                  {errors.full_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="+1 234 567 8900"
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Profile picture</Label>
              <AvatarUpload
                value={watch('avatar_url') || null}
                onChange={(url) =>
                  setValue('avatar_url', url, { shouldDirty: true })
                }
                userId={profile.id}
              />
              {errors.avatar_url && (
                <p className="text-sm text-destructive">
                  {errors.avatar_url.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Save changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Set a new password for your account
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handlePasswordChange}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={passwordLoading}>
              {passwordLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Update password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/70 bg-card/70"><CardContent className="flex items-center gap-4 py-5"><div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div><div className="flex-1"><p className="font-semibold">Privacy & security</p><p className="text-sm text-muted-foreground">Your account and ticket data</p></div></CardContent></Card>
        <Link href="/contact"><Card className="border-border/70 bg-card/70 transition-colors hover:border-primary/30"><CardContent className="flex items-center gap-4 py-5"><div className="grid size-11 place-items-center rounded-xl bg-brand-green/10 text-brand-green"><Headphones className="size-5" /></div><div className="flex-1"><p className="font-semibold">Support</p><p className="text-sm text-muted-foreground">We&apos;re here when you need us</p></div><ArrowUpRight className="size-4 text-muted-foreground" /></CardContent></Card></Link>
      </div>
    </div>
  );
}
