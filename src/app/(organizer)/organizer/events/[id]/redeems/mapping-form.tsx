'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ticketTypeRedeemSchema, type TicketTypeRedeemInput } from '@/lib/validations';
import type { TicketType } from '@/types/database.types';
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
import { FormField } from '@/components/forms/form-field';
import { FormSelect } from '@/components/forms/form-select';
import { mapRedeemAction } from './actions';

interface MappingFormProps {
  eventId: string;
  ticketTypes: TicketType[];
  redeemItems: RedeemItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MappingForm({
  eventId,
  ticketTypes,
  redeemItems,
  open,
  onOpenChange,
  onSuccess,
}: MappingFormProps) {
  const ticketTypeOptions = ticketTypes.map((tt) => ({
    label: tt.name,
    value: tt.id,
  }));
  const redeemItemOptions = redeemItems.map((ri) => ({
    label: ri.name,
    value: ri.id,
  }));

  const form = useForm<TicketTypeRedeemInput>({
    resolver: zodResolver(ticketTypeRedeemSchema),
    defaultValues: {
      ticket_type_id: '',
      redeem_item_id: '',
      quantity_allowed: 1,
    },
  });

  const onSubmit = async (data: TicketTypeRedeemInput) => {
    const result = await mapRedeemAction(
      eventId,
      data.ticket_type_id,
      data.redeem_item_id,
      Number(data.quantity_allowed)
    );

    if (result.success) {
      form.reset({ ticket_type_id: '', redeem_item_id: '', quantity_allowed: 1 });
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
          <DialogTitle>Map Redeem to Ticket Type</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormSelect
            label="Ticket Type"
            name="ticket_type_id"
            options={ticketTypeOptions}
            value={form.watch('ticket_type_id')}
            onChange={(v) => form.setValue('ticket_type_id', v)}
            error={form.formState.errors.ticket_type_id?.message}
            required
          />
          <FormSelect
            label="Redeem Item"
            name="redeem_item_id"
            options={redeemItemOptions}
            value={form.watch('redeem_item_id')}
            onChange={(v) => form.setValue('redeem_item_id', v)}
            error={form.formState.errors.redeem_item_id?.message}
            required
          />
          <FormField
            label="Quantity"
            name="quantity_allowed"
            error={form.formState.errors.quantity_allowed?.message}
            required
          >
            <Input
              type="number"
              min={1}
              {...form.register('quantity_allowed', { valueAsNumber: true })}
            />
          </FormField>
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
              {form.formState.isSubmitting ? 'Mapping...' : 'Map'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
