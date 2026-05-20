'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { redeemItemSchema, type RedeemItemInput } from '@/lib/validations';
import type { RedeemItem } from '@/types/database.types';
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
import { REDEEM_CATEGORIES } from '@/lib/constants';
import { createRedeemItemAction, updateRedeemItemAction } from './actions';

const CATEGORY_OPTIONS = REDEEM_CATEGORIES.map((c) => ({ label: c, value: c }));

interface RedeemFormProps {
  eventId: string;
  redeemItem?: RedeemItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RedeemForm({
  eventId,
  redeemItem,
  open,
  onOpenChange,
  onSuccess,
}: RedeemFormProps) {
  const isEdit = !!redeemItem;

  const form = useForm<RedeemItemInput>({
    resolver: zodResolver(redeemItemSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      station: '',
      time_window_start: '',
      time_window_end: '',
    },
  });

  useEffect(() => {
    if (open && redeemItem) {
      form.reset({
        name: redeemItem.name ?? '',
        category: redeemItem.category ?? '',
        description: redeemItem.description ?? '',
        station: redeemItem.station ?? '',
        time_window_start: redeemItem.time_window_start?.slice(0, 16) ?? '',
        time_window_end: redeemItem.time_window_end?.slice(0, 16) ?? '',
      });
    } else if (!open) {
      form.reset();
    }
  }, [open, redeemItem, form]);

  const onSubmit = async (data: RedeemItemInput) => {
    const payload = {
      name: data.name,
      category: data.category || null,
      description: data.description || null,
      station: data.station || null,
      time_window_start: data.time_window_start || null,
      time_window_end: data.time_window_end || null,
    };

    const result = isEdit
      ? await updateRedeemItemAction(redeemItem.id, eventId, payload)
      : await createRedeemItemAction(eventId, payload);

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
          <DialogTitle>{isEdit ? 'Edit Redeem Item' : 'Add Redeem Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Name"
            name="name"
            error={form.formState.errors.name?.message}
            required
          >
            <Input {...form.register('name')} placeholder="e.g. Lunch Voucher" />
          </FormField>
          <FormSelect
            label="Category"
            name="category"
            options={CATEGORY_OPTIONS}
            value={form.watch('category')}
            onChange={(v) => form.setValue('category', v)}
            error={form.formState.errors.category?.message}
            required
          />
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
          <FormField
            label="Station"
            name="station"
            error={form.formState.errors.station?.message}
          >
            <Input {...form.register('station')} placeholder="e.g. Station A" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Time Window Start"
              name="time_window_start"
              error={form.formState.errors.time_window_start?.message}
            >
              <Input type="datetime-local" {...form.register('time_window_start')} />
            </FormField>
            <FormField
              label="Time Window End"
              name="time_window_end"
              error={form.formState.errors.time_window_end?.message}
            >
              <Input type="datetime-local" {...form.register('time_window_end')} />
            </FormField>
          </div>
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
