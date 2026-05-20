'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { staffAssignmentSchema, type StaffAssignmentInput } from '@/lib/validations';
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
import { FormField } from '@/components/forms/form-field';
import { FormSelect } from '@/components/forms/form-select';
import { assignStaffAction } from './actions';

const EVENT_STAFF_ROLES = [
  { label: 'Event Manager', value: 'event_manager' },
  { label: 'Gate Scanner', value: 'gate_scanner' },
  { label: 'Space Controller', value: 'space_controller' },
  { label: 'Redeemer', value: 'redeemer' },
  { label: 'Support Staff', value: 'support_staff' },
] as { label: string; value: string }[];

interface StaffInviteFormProps {
  eventId: string;
  spaces: Space[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StaffInviteForm({
  eventId,
  spaces,
  open,
  onOpenChange,
  onSuccess,
}: StaffInviteFormProps) {
  const spaceOptions = [
    { label: 'No space assignment', value: '' },
    ...spaces.map((s) => ({ label: s.name, value: s.id })),
  ];

  const form = useForm<StaffAssignmentInput>({
    resolver: zodResolver(staffAssignmentSchema),
    defaultValues: {
      user_email: '',
      role: 'gate_scanner',
      space_id: null,
    },
  });

  const onSubmit = async (data: StaffAssignmentInput) => {
    const result = await assignStaffAction(
      eventId,
      data.user_email,
      data.role,
      data.space_id || null
    );

    if (result.success) {
      form.reset({ user_email: '', role: 'gate_scanner', space_id: null });
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
          <DialogTitle>Invite Staff</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Email"
            name="user_email"
            error={form.formState.errors.user_email?.message}
            required
          >
            <Input
              type="email"
              {...form.register('user_email')}
              placeholder="staff@example.com"
            />
          </FormField>
          <FormSelect
            label="Role"
            name="role"
            options={EVENT_STAFF_ROLES}
            value={form.watch('role')}
            onChange={(v) => form.setValue('role', v as StaffAssignmentInput['role'])}
            error={form.formState.errors.role?.message}
            required
          />
          <FormSelect
            label="Space assignment"
            name="space_id"
            options={spaceOptions}
            value={form.watch('space_id') ?? ''}
            onChange={(v) => form.setValue('space_id', v || null)}
            error={form.formState.errors.space_id?.message}
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
              {form.formState.isSubmitting ? 'Inviting...' : 'Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
