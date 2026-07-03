'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ticketTypeSchema, type TicketTypeInput } from '@/lib/validations';
import type { TicketType } from '@/types/database.types';
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
import { createTicketTypeAction, updateTicketTypeAction } from './actions';

const VISIBILITY_OPTIONS = [
  { label: 'Public', value: 'public' },
  { label: 'Hidden', value: 'hidden' },
  { label: 'Invite Only', value: 'invite_only' },
];

interface TicketTypeFormProps {
  eventId: string;
  ticketType?: TicketType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TicketTypeForm({
  eventId,
  ticketType,
  open,
  onOpenChange,
  onSuccess,
}: TicketTypeFormProps) {
  const isEdit = !!ticketType;

  const form = useForm<TicketTypeInput>({
    resolver: zodResolver(ticketTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      capacity: undefined,
      sales_start: '',
      sales_end: '',
      max_per_user: 1,
      visibility: 'public',
    },
  });

  const resetForm = () => {
    form.reset({
      name: ticketType?.name ?? '',
      description: ticketType?.description ?? '',
      price: ticketType?.price ?? 0,
      capacity: ticketType?.capacity ?? undefined,
      sales_start: ticketType?.sales_start?.slice(0, 16) ?? '',
      sales_end: ticketType?.sales_end?.slice(0, 16) ?? '',
      max_per_user: ticketType?.max_per_user ?? 1,
      visibility: ticketType?.visibility ?? 'public',
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (next && ticketType) resetForm();
    else if (!next) form.reset();
    onOpenChange(next);
  };

  const onSubmit = async (data: TicketTypeInput) => {
    const payload = {
      name: data.name,
      description: data.description || null,
      price: data.price,
      capacity: data.capacity ?? null,
      sales_start: data.sales_start || null,
      sales_end: data.sales_end || null,
      max_per_user: data.max_per_user,
      visibility: data.visibility,
    };

    const result = isEdit
      ? await updateTicketTypeAction(ticketType.id, payload, eventId)
      : await createTicketTypeAction(eventId, payload);

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
    } else {
      form.setError('root', { message: result.error });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Ticket Type' : 'Add Ticket Type'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Name"
            name="name"
            error={form.formState.errors.name?.message}
            required
          >
            <Input {...form.register('name')} placeholder="e.g. General Admission" />
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
          <FormField
            label="Price (EGP)"
            name="price"
            error={form.formState.errors.price?.message}
          >
            <div className="relative">
              <Input
                type="number"
                min={0}
                step={0.01}
                {...form.register('price', { valueAsNumber: true })}
                placeholder="0"
                className="pr-12"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                EGP
              </span>
            </div>
          </FormField>
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
              label="Sales Start"
              name="sales_start"
              error={form.formState.errors.sales_start?.message}
            >
              <Input type="datetime-local" {...form.register('sales_start')} />
            </FormField>
            <FormField
              label="Sales End"
              name="sales_end"
              error={form.formState.errors.sales_end?.message}
            >
              <Input type="datetime-local" {...form.register('sales_end')} />
            </FormField>
          </div>
          <FormField
            label="Max per User"
            name="max_per_user"
            error={form.formState.errors.max_per_user?.message}
          >
            <Input
              type="number"
              min={1}
              max={10}
              {...form.register('max_per_user', { valueAsNumber: true })}
            />
          </FormField>
          <FormSelect
            label="Visibility"
            name="visibility"
            options={VISIBILITY_OPTIONS}
            value={form.watch('visibility')}
            onChange={(v) => form.setValue('visibility', v as TicketTypeInput['visibility'])}
            error={form.formState.errors.visibility?.message}
          />
          {form.formState.errors.root?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
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
