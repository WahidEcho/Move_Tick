'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreVertical,
  Pencil,
  Ban,
  PauseCircle,
  PlayCircle,
  BarChart3,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ReasonDialog } from '@/components/layout/reason-dialog';
import type { OrganizationWithCounts } from '@/services/organizations.service';
import type { OrganizerDashboardSummary } from '@/types/domain.types';
import {
  updateOrganizationAction,
  setOrgStatusAction,
  archiveOrganizationAction,
  restoreOrganizationAction,
  getOrgStatsAction,
  type EditableOrgFields,
} from './actions';

export function OrgRowActions({ org }: { org: OrganizationWithCounts }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [stats, setStats] = useState<OrganizerDashboardSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<EditableOrgFields>({
    name: org.name,
    contact_email: org.contact_email,
    contact_phone: org.contact_phone,
    max_events: org.max_events,
    max_published_events: org.max_published_events,
    can_create_paid: org.can_create_paid,
    requires_publish_approval: org.requires_publish_approval,
    commission_percentage: org.commission_percentage,
    fixed_fee_egp: org.fixed_fee_egp,
    hide_events_on_suspend: org.hide_events_on_suspend,
  });

  const isArchived = Boolean(org.archived_at);

  const runToggle = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  };

  const openStats = async () => {
    setStatsOpen(true);
    setStatsLoading(true);
    const s = await getOrgStatsAction(org.id);
    setStats(s);
    setStatsLoading(false);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateOrganizationAction(org.id, form);
      setEditOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
          <MoreVertical className="size-4" />
          <span className="sr-only">Organization actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4 shrink-0" />
            Edit organization
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openStats}>
            <BarChart3 className="size-4 shrink-0" />
            View revenue &amp; history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {org.status !== 'active' && (
            <DropdownMenuItem
              disabled={isPending}
              onClick={() => runToggle(() => setOrgStatusAction(org.id, 'active'))}
            >
              <PlayCircle className="size-4 shrink-0" />
              Reactivate
            </DropdownMenuItem>
          )}
          {org.status !== 'on_hold' && (
            <DropdownMenuItem onClick={() => setHoldDialogOpen(true)}>
              <PauseCircle className="size-4 shrink-0" />
              Put on hold
            </DropdownMenuItem>
          )}
          {org.status !== 'suspended' && (
            <DropdownMenuItem variant="destructive" onClick={() => setSuspendDialogOpen(true)}>
              <Ban className="size-4 shrink-0" />
              Suspend
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {isArchived ? (
            <DropdownMenuItem disabled={isPending} onClick={() => runToggle(() => restoreOrganizationAction(org.id))}>
              <RotateCcw className="size-4 shrink-0" />
              Restore organization
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onClick={() => setArchiveDialogOpen(true)}>
              <Archive className="size-4 shrink-0" />
              Delete organization
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {org.name}</DialogTitle>
            <DialogDescription>Contact info, event limits, and commission settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact email</Label>
                <Input
                  value={form.contact_email ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Contact phone</Label>
                <Input
                  value={form.contact_phone ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max events (blank = unlimited)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.max_events ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, max_events: e.target.value ? Number(e.target.value) : null }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max published (blank = unlimited)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.max_published_events ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, max_published_events: e.target.value ? Number(e.target.value) : null }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Commission %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={form.commission_percentage ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, commission_percentage: e.target.value ? Number(e.target.value) : null }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fixed fee (EGP)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.fixed_fee_egp ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, fixed_fee_egp: e.target.value ? Number(e.target.value) : null }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Can create paid events</p>
              <Switch
                checked={form.can_create_paid ?? true}
                onCheckedChange={(v) => setForm((f) => ({ ...f, can_create_paid: v }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Requires approval to publish</p>
              <Switch
                checked={form.requires_publish_approval ?? false}
                onCheckedChange={(v) => setForm((f) => ({ ...f, requires_publish_approval: v }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Hide events automatically when suspended</p>
              <Switch
                checked={form.hide_events_on_suspend ?? false}
                onCheckedChange={(v) => setForm((f) => ({ ...f, hide_events_on_suspend: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{org.name} — revenue &amp; history</DialogTitle>
            <DialogDescription>
              Commission {org.commission_percentage ?? 0}% + {org.fixed_fee_egp ?? 0} EGP fixed fee per paid ticket
              (scaffolded — not yet applied at checkout).
            </DialogDescription>
          </DialogHeader>
          {statsLoading || !stats ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground">Upcoming events</p>
                <p className="text-lg font-semibold">{stats.upcoming_events}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground">Total registrations</p>
                <p className="text-lg font-semibold">{stats.total_registrations}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground">Total invitations</p>
                <p className="text-lg font-semibold">{stats.total_invitations}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground">Active staff</p>
                <p className="text-lg font-semibold">{stats.active_staff}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={holdDialogOpen}
        onOpenChange={setHoldDialogOpen}
        title={`Put ${org.name} on hold?`}
        description="The organization keeps its data but can't create or publish new events while on hold."
        confirmLabel="Put on hold"
        reasonRequired
        onConfirm={async (reason) => {
          await setOrgStatusAction(org.id, 'on_hold', reason);
          router.refresh();
        }}
      />

      <ReasonDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        title={`Suspend ${org.name}?`}
        description="The organization's team can't create, publish, or manage events until reactivated."
        confirmLabel="Suspend"
        variant="destructive"
        reasonRequired
        onConfirm={async (reason) => {
          await setOrgStatusAction(org.id, 'suspended', reason);
          router.refresh();
        }}
      />

      <ReasonDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title={`Delete ${org.name}?`}
        description="This is a soft delete: the organization is suspended and hidden, and all its events are hidden too. Nothing is permanently removed — tickets, registrations, and members stay intact and can be restored."
        confirmLabel="Delete organization"
        variant="destructive"
        reasonRequired
        onConfirm={async (reason) => {
          await archiveOrganizationAction(org.id, reason);
          router.refresh();
        }}
      />
    </>
  );
}
