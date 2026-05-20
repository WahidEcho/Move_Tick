'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { spaceSchema, type SpaceInput } from '@/lib/validations';
import type { Space } from '@/types/database.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/forms/form-field';
import { FormSelect } from '@/components/forms/form-select';
import { SPACE_TYPES } from '@/lib/constants';
import { createSpaceAction, updateSpaceAction } from './actions';

const REGISTRATION_MODE_OPTIONS = [
  { label: 'Walk-in Only', value: 'walk_in_only' },
  { label: 'Pre-registration Required', value: 'preregistration_required' },
  { label: 'Mixed', value: 'mixed' },
];

const VISIBILITY_OPTIONS = [
  { label: 'Public on Event Page', value: 'public_on_event_page' },
  { label: 'Internal Only', value: 'internal_only' },
];

const SPACE_TYPE_OPTIONS = SPACE_TYPES.map((t) => ({ label: t, value: t }));

interface SpaceFormProps {
  eventId: string;
  space?: Space;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SpaceForm({
  eventId,
  space,
  open,
  onOpenChange,
  onSuccess,
}: SpaceFormProps) {
  const isEdit = !!space;

  const form = useForm<SpaceInput>({
    resolver: zodResolver(spaceSchema),
    defaultValues: {
      name: '',
      description: '',
      type: '',
      capacity: undefined,
      start_time: '',
      end_time: '',
      registration_mode: 'walk_in_only',
      visibility: 'public_on_event_page',
    },
  });

  useEffect(() => {
    if (open && space) {
      form.reset({
        name: space.name ?? '',
        description: space.description ?? '',
        type: space.type ?? '',
        capacity: space.capacity ?? undefined,
        start_time: space.start_time?.slice(0, 16) ?? '',
        end_time: space.end_time?.slice(0, 16) ?? '',
        registration_mode: space.registration_mode ?? 'walk_in_only',
        visibility: space.visibility ?? 'public_on_event_page',
      });
    } else if (!open) {
      form.reset();
    }
  }, [open, space, form]);

  const onSubmit = async (data: SpaceInput) => {
    const payload = {
      name: data.name,
      description: data.description || null,
      type: data.type || null,
      capacity: data.capacity ?? null,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      registration_mode: data.registration_mode,
      visibility: data.visibility,
    };

    const result = isEdit
      ? await updateSpaceAction(space.id, eventId, payload)
      : await createSpaceAction(eventId, payload);

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
    } else {
      form.setError('root', { message: result.error });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Space' : 'Add Space'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Name"
            name="name"
            error={form.formState.errors.name?.message}
            required
          >
            <Input {...form.register('name')} placeholder="e.g. VIP Lounge" />
          </FormField>
          <FormField
            label="Description"
            name="description"
            error={form.formState.errors.description?.message}
          >
            <Textarea
              {...form.register('description')}
              placeholder="Optional description"
              rows={2}
            />
          </FormField>
          <FormSelect
            label="Type"
            name="type"
            options={SPACE_TYPE_OPTIONS}
            value={form.watch('type')}
            onChange={(v) => form.setValue('type', v)}
            error={form.formState.errors.type?.message}
            required
          />
          <FormField
            label="Capacity"
            name="capacity"
            error={form.formState.errors.capacity?.message}
            description="Leave empty for unlimited"
          >
            <Input
              type="number"
              min={1}
              {...form.register('capacity', { valueAsNumber: true })}
              placeholder="Unlimited"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Start Time"
              name="start_time"
              error={form.formState.errors.start_time?.message}
            >
              <Input type="datetime-local" {...form.register('start_time')} />
            </FormField>
            <FormField
              label="End Time"
              name="end_time"
              error={form.formState.errors.end_time?.message}
            >
              <Input type="datetime-local" {...form.register('end_time')} />
            </FormField>
          </div>
          <FormSelect
            label="Registration Mode"
            name="registration_mode"
            options={REGISTRATION_MODE_OPTIONS}
            value={form.watch('registration_mode')}
            onChange={(v) =>
              form.setValue('registration_mode', v as SpaceInput['registration_mode'])
            }
            error={form.formState.errors.registration_mode?.message}
          />
          <FormSelect
            label="Visibility"
            name="visibility"
            options={VISIBILITY_OPTIONS}
            value={form.watch('visibility')}
            onChange={(v) =>
              form.setValue('visibility', v as SpaceInput['visibility'])
            }
            error={form.formState.errors.visibility?.message}
          />
          {form.formState.errors.root?.message && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
