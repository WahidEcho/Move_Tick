'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getMyOrganization, updateOrganizationSettings } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/forms/form-field';
import { ImageUpload } from '@/components/forms/image-upload';
import type { Organization } from '@/types/database.types';

interface OrgFormData {
  name: string;
  description: string;
  website: string;
  instagram: string;
  linkedin: string;
  country: string;
  city: string;
  logo_url: string;
}

export default function OrganizerSettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<OrgFormData>({
    defaultValues: {
      name: '',
      description: '',
      website: '',
      instagram: '',
      linkedin: '',
      country: '',
      city: '',
      logo_url: '',
    },
  });

  useEffect(() => {
    async function load() {
      const organization = await getMyOrganization();
      if (organization) {
        setOrg(organization);
        reset({
          name: organization.name ?? '',
          description: organization.description ?? '',
          website: organization.website ?? '',
          instagram: organization.instagram ?? '',
          linkedin: organization.linkedin ?? '',
          country: organization.country ?? '',
          city: organization.city ?? '',
          logo_url: organization.logo_url ?? '',
        });
      }
      setLoading(false);
    }
    load();
  }, [reset]);

  const onSubmit = async (data: OrgFormData) => {
    if (!org) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updateOrganizationSettings({
      name: data.name,
      description: data.description,
      website: data.website,
      instagram: data.instagram,
      linkedin: data.linkedin,
      country: data.country,
      city: data.city,
      logo_url: data.logo_url,
    });

    setSaving(false);
    if (!result.success) {
      setError(result.error ?? 'Failed to save settings');
    } else {
      setSuccess(true);
      setOrg((prev) => prev ? { ...prev, ...data } : null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Organization not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Organization Settings</h2>
        <p className="text-sm text-muted-foreground">
          Update your organization details
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Basic information about your organization
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Name"
              name="name"
              error={errors.name?.message}
              required
            >
              <Input {...register('name', { required: 'Name is required' })} placeholder="Organization name" />
            </FormField>

            <FormField label="Description" name="description" error={errors.description?.message}>
              <Textarea {...register('description')} placeholder="Brief description" rows={4} />
            </FormField>

            <FormField label="Website" name="website" error={errors.website?.message}>
              <Input {...register('website')} placeholder="https://..." type="url" />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Instagram" name="instagram" error={errors.instagram?.message}>
                <Input {...register('instagram')} placeholder="@handle" />
              </FormField>
              <FormField label="LinkedIn" name="linkedin" error={errors.linkedin?.message}>
                <Input {...register('linkedin')} placeholder="LinkedIn URL" />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="City" name="city" error={errors.city?.message}>
                <Input {...register('city')} placeholder="City" />
              </FormField>
              <FormField label="Country" name="country" error={errors.country?.message}>
                <Input {...register('country')} placeholder="Country" />
              </FormField>
            </div>

            <FormField label="Logo" name="logo_url" error={errors.logo_url?.message}>
              <ImageUpload
                orgId={org.id}
                value={watch('logo_url')}
                onChange={(url) => setValue('logo_url', url, { shouldDirty: true })}
              />
            </FormField>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">Settings saved successfully.</p>}

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
