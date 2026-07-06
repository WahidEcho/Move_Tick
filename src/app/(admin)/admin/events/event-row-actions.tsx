'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MoreVertical,
  Pencil,
  LayoutDashboard,
  Users,
  Eye,
  EyeOff,
  Megaphone,
  MegaphoneOff,
  Building2,
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
import { FormSelect } from '@/components/forms/form-select';
import { ReasonDialog } from '@/components/layout/reason-dialog';
import type { EventWithDetails } from '@/services/events.service';
import {
  setEventHiddenAction,
  setEventPublishedAction,
  archiveEventAction,
  restoreEventAction,
  changeEventOrganizerAction,
  getOrganizationOptions,
} from './actions';

export function EventRowActions({ event }: { event: EventWithDetails }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [orgOptions, setOrgOptions] = useState<{ id: string; name: string }[] | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [changingOrg, setChangingOrg] = useState(false);

  const isArchived = Boolean(event.archived_at);

  const runToggle = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  };

  const openOrgDialog = async () => {
    setSelectedOrgId(event.organization_id);
    setOrgDialogOpen(true);
    if (!orgOptions) {
      const options = await getOrganizationOptions();
      setOrgOptions(options);
    }
  };

  const handleChangeOrganizer = async () => {
    if (!selectedOrgId || selectedOrgId === event.organization_id) {
      setOrgDialogOpen(false);
      return;
    }
    setChangingOrg(true);
    try {
      await changeEventOrganizerAction(event.id, selectedOrgId);
      setOrgDialogOpen(false);
      router.refresh();
    } finally {
      setChangingOrg(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
          <MoreVertical className="size-4" />
          <span className="sr-only">Event actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem render={<Link href={`/organizer/events/${event.id}`} />}>
            <LayoutDashboard className="size-4 shrink-0" />
            Manage event
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`/organizer/events/${event.id}/edit`} />}>
            <Pencil className="size-4 shrink-0" />
            Edit details
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`/organizer/events/${event.id}/team`} />}>
            <Users className="size-4 shrink-0" />
            Manage team
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isPending}
            onClick={() => runToggle(() => setEventPublishedAction(event.id, !event.is_published))}
          >
            {event.is_published ? (
              <MegaphoneOff className="size-4 shrink-0" />
            ) : (
              <Megaphone className="size-4 shrink-0" />
            )}
            {event.is_published ? 'Unpublish' : 'Publish'}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isPending}
            onClick={() => runToggle(() => setEventHiddenAction(event.id, !event.is_hidden))}
          >
            {event.is_hidden ? <Eye className="size-4 shrink-0" /> : <EyeOff className="size-4 shrink-0" />}
            {event.is_hidden ? 'Unhide' : 'Hide'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openOrgDialog}>
            <Building2 className="size-4 shrink-0" />
            Change organizer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isArchived ? (
            <DropdownMenuItem disabled={isPending} onClick={() => runToggle(() => restoreEventAction(event.id))}>
              <RotateCcw className="size-4 shrink-0" />
              Restore event
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onClick={() => setArchiveDialogOpen(true)}>
              <Archive className="size-4 shrink-0" />
              Archive event
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change organizer</DialogTitle>
            <DialogDescription>
              Move &ldquo;{event.title}&rdquo; to a different organization. Tickets, registrations, and analytics stay attached to the event.
            </DialogDescription>
          </DialogHeader>
          <FormSelect
            label="Organization"
            name="organization_id"
            value={selectedOrgId}
            onChange={setSelectedOrgId}
            options={(orgOptions ?? []).map((o) => ({ label: o.name, value: o.id }))}
            placeholder={orgOptions ? 'Select an organization' : 'Loading organizations...'}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgDialogOpen(false)} disabled={changingOrg}>
              Cancel
            </Button>
            <Button onClick={handleChangeOrganizer} disabled={changingOrg || !selectedOrgId}>
              Move event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive this event?"
        description="The event is hidden everywhere (including the organizer's own dashboard listing) but tickets, registrations, and analytics are preserved. This can be undone from the Archived filter."
        confirmLabel="Archive event"
        variant="destructive"
        reasonRequired
        reasonLabel="Reason (required for the audit log)"
        onConfirm={async (reason) => {
          await archiveEventAction(event.id, reason);
          router.refresh();
        }}
      />
    </>
  );
}
