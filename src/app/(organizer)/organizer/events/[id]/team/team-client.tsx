'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StaffAssignmentWithDetails } from '@/services/team.service';
import type { Space } from '@/types/database.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/tables/data-table';
import { UsersRound, Plus, Trash2 } from 'lucide-react';
import { StaffInviteForm } from './staff-invite-form';
import { ConfirmDialog } from '@/components/layout/confirm-dialog';
import { removeStaffAction } from './actions';
import { EmptyState } from '@/components/layout/empty-state';

interface TeamClientProps {
  eventId: string;
  staff: StaffAssignmentWithDetails[];
  spaces: Space[];
}

export function TeamClient({
  eventId,
  staff,
  spaces,
}: TeamClientProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeStaff, setRemoveStaff] = useState<StaffAssignmentWithDetails | null>(null);

  const handleSuccess = () => router.refresh();

  const handleRemove = async () => {
    if (!removeStaff) return;
    const result = await removeStaffAction(eventId, removeStaff.id);
    if (result.success) {
      setRemoveStaff(null);
      handleSuccess();
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (r: StaffAssignmentWithDetails) =>
        r.profile?.full_name ?? r.profile?.email ?? '—',
    },
    {
      key: 'email',
      label: 'Email',
      render: (r: StaffAssignmentWithDetails) => r.profile?.email ?? '—',
    },
    {
      key: 'role',
      label: 'Role',
      render: (r: StaffAssignmentWithDetails) => (
        <Badge variant="secondary" className="text-xs">
          {r.role.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'space',
      label: 'Space Assignment',
      render: (r: StaffAssignmentWithDetails) =>
        r.space?.name ?? '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: () => (
        <Badge variant="outline" className="text-xs">
          Active
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r: StaffAssignmentWithDetails) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setRemoveStaff(r)}
          aria-label="Remove"
        >
          <Trash2 className="size-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Team</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage event staff assignments
            </p>
          </div>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus className="size-4" />
            Invite Staff
          </Button>
        </CardHeader>
        <CardContent>
          {staff.length > 0 ? (
            <DataTable
              columns={columns}
              data={staff}
              emptyMessage="No staff assigned yet"
              emptyIcon={UsersRound}
            />
          ) : (
            <EmptyState
              icon={UsersRound}
              title="No staff yet"
              description="Invite staff to help manage your event"
              action={{
                label: 'Invite Staff',
                onClick: () => setInviteOpen(true),
              }}
            />
          )}
        </CardContent>
      </Card>

      <StaffInviteForm
        eventId={eventId}
        spaces={spaces}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={handleSuccess}
      />
      <ConfirmDialog
        open={!!removeStaff}
        onOpenChange={(open) => !open && setRemoveStaff(null)}
        title="Remove Staff"
        description={`Are you sure you want to remove ${removeStaff?.profile?.full_name ?? removeStaff?.profile?.email} from the team?`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemove}
      />
    </div>
  );
}
