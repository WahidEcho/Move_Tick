'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Pencil, ShieldCheck, Ban, CheckCircle2, Building2, CalendarPlus } from 'lucide-react';
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
import { FormSelect } from '@/components/forms/form-select';
import { ReasonDialog } from '@/components/layout/reason-dialog';
import type { Profile, UserRole, OrgRole, EventStaffRole } from '@/types/database.types';
import {
  updateUserAction,
  setUserRoleAction,
  setUserDisabledAction,
  assignUserToOrgAction,
  assignUserToEventTeamAction,
  getOrganizationOptionsAction,
  searchEventsForAssignmentAction,
} from './actions';

const ROLE_OPTIONS = [
  { label: 'Attendee', value: 'attendee' },
  { label: 'Organizer', value: 'organizer' },
  { label: 'Admin', value: 'admin' },
];

const ORG_ROLE_OPTIONS = [
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
  { label: 'Manager', value: 'manager' },
];

const STAFF_ROLE_OPTIONS = [
  { label: 'Event Manager', value: 'event_manager' },
  { label: 'Gate Scanner', value: 'gate_scanner' },
  { label: 'Space Controller', value: 'space_controller' },
  { label: 'Redeemer', value: 'redeemer' },
  { label: 'Support Staff', value: 'support_staff' },
];

export function UserRowActions({ user }: { user: Profile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: user.full_name ?? '', phone: user.phone ?? '' });
  const [saving, setSaving] = useState(false);

  const [roleOpen, setRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>(user.platform_role);
  const [savingRole, setSavingRole] = useState(false);

  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  const [orgOpen, setOrgOpen] = useState(false);
  const [orgOptions, setOrgOptions] = useState<{ id: string; name: string }[] | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedOrgRole, setSelectedOrgRole] = useState<OrgRole>('manager');
  const [savingOrg, setSavingOrg] = useState(false);

  const [teamOpen, setTeamOpen] = useState(false);
  const [eventQuery, setEventQuery] = useState('');
  const [eventResults, setEventResults] = useState<
    { id: string; title: string; organizationId: string; organizationName: string }[]
  >([]);
  const [selectedEvent, setSelectedEvent] = useState<{ id: string; organizationId: string; title: string } | null>(
    null
  );
  const [selectedStaffRole, setSelectedStaffRole] = useState<EventStaffRole>('gate_scanner');
  const [searchingEvents, setSearchingEvents] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);

  const runToggle = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateUserAction(user.id, editForm);
      setEditOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRole = async () => {
    setSavingRole(true);
    try {
      await setUserRoleAction(user.id, newRole);
      setRoleOpen(false);
      router.refresh();
    } finally {
      setSavingRole(false);
    }
  };

  const openOrgDialog = async () => {
    setOrgOpen(true);
    if (!orgOptions) {
      setOrgOptions(await getOrganizationOptionsAction());
    }
  };

  const handleSaveOrg = async () => {
    if (!selectedOrgId) return;
    setSavingOrg(true);
    try {
      await assignUserToOrgAction(user.id, selectedOrgId, selectedOrgRole);
      setOrgOpen(false);
      router.refresh();
    } finally {
      setSavingOrg(false);
    }
  };

  const handleSearchEvents = async () => {
    setSearchingEvents(true);
    try {
      setEventResults(await searchEventsForAssignmentAction(eventQuery));
    } finally {
      setSearchingEvents(false);
    }
  };

  const handleSaveTeam = async () => {
    if (!selectedEvent) return;
    setSavingTeam(true);
    try {
      await assignUserToEventTeamAction(user.email, selectedEvent.id, selectedEvent.organizationId, selectedStaffRole);
      setTeamOpen(false);
      setSelectedEvent(null);
      setEventResults([]);
      setEventQuery('');
      router.refresh();
    } finally {
      setSavingTeam(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
          <MoreVertical className="size-4" />
          <span className="sr-only">User actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4 shrink-0" />
            Edit user
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRoleOpen(true)}>
            <ShieldCheck className="size-4 shrink-0" />
            Change role
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openOrgDialog}>
            <Building2 className="size-4 shrink-0" />
            Assign to organization
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTeamOpen(true)}>
            <CalendarPlus className="size-4 shrink-0" />
            Assign to event team
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.is_disabled ? (
            <DropdownMenuItem
              disabled={isPending}
              onClick={() => runToggle(() => setUserDisabledAction(user.id, false))}
            >
              <CheckCircle2 className="size-4 shrink-0" />
              Enable account
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onClick={() => setDisableDialogOpen(true)}>
              <Ban className="size-4 shrink-0" />
              Disable account
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {user.full_name || user.email}</DialogTitle>
            <DialogDescription>Update this user&apos;s profile info.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
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

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role for {user.full_name || user.email}</DialogTitle>
            <DialogDescription>
              Platform role controls which parts of Move-Tick this user can access.
            </DialogDescription>
          </DialogHeader>
          <FormSelect
            label="Platform role"
            name="platform_role"
            value={newRole}
            onChange={(v) => setNewRole(v as UserRole)}
            options={ROLE_OPTIONS}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)} disabled={savingRole}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={savingRole}>
              Save role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={orgOpen} onOpenChange={setOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {user.full_name || user.email} to an organization</DialogTitle>
            <DialogDescription>Adds them as a member, or updates their role if already a member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <FormSelect
              label="Organization"
              name="organization_id"
              value={selectedOrgId}
              onChange={setSelectedOrgId}
              options={(orgOptions ?? []).map((o) => ({ label: o.name, value: o.id }))}
              placeholder={orgOptions ? 'Select an organization' : 'Loading organizations...'}
            />
            <FormSelect
              label="Role in organization"
              name="org_role"
              value={selectedOrgRole}
              onChange={(v) => setSelectedOrgRole(v as OrgRole)}
              options={ORG_ROLE_OPTIONS}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgOpen(false)} disabled={savingOrg}>
              Cancel
            </Button>
            <Button onClick={handleSaveOrg} disabled={savingOrg || !selectedOrgId}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {user.full_name || user.email} to an event team</DialogTitle>
            <DialogDescription>Search for an event, then pick their staff role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search events by title..."
                value={eventQuery}
                onChange={(e) => setEventQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchEvents()}
              />
              <Button type="button" variant="outline" onClick={handleSearchEvents} disabled={searchingEvents}>
                Search
              </Button>
            </div>
            {eventResults.length > 0 && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                {eventResults.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedEvent({ id: ev.id, organizationId: ev.organizationId, title: ev.title })}
                    className={`flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${
                      selectedEvent?.id === ev.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span className="font-medium">{ev.title}</span>
                    <span className="text-xs text-muted-foreground">{ev.organizationName}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedEvent && (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selectedEvent.title}</span>
              </p>
            )}
            <FormSelect
              label="Staff role"
              name="staff_role"
              value={selectedStaffRole}
              onChange={(v) => setSelectedStaffRole(v as EventStaffRole)}
              options={STAFF_ROLE_OPTIONS}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamOpen(false)} disabled={savingTeam}>
              Cancel
            </Button>
            <Button onClick={handleSaveTeam} disabled={savingTeam || !selectedEvent}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        title={`Disable ${user.full_name || user.email}?`}
        description="They won't be able to sign in until re-enabled. Their tickets, events, and data are untouched."
        confirmLabel="Disable account"
        variant="destructive"
        reasonRequired
        onConfirm={async (reason) => {
          await setUserDisabledAction(user.id, true, reason);
          router.refresh();
        }}
      />
    </>
  );
}
