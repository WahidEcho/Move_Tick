'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/layout/confirm-dialog';
import {
  approveApplication,
  rejectApplication,
  requestMoreInfo,
} from '../actions';
import type { OrganizerApplicationWithProfile } from '@/services/organizerApplications.service';

interface ApplicationActionsProps {
  application: OrganizerApplicationWithProfile;
}

export function ApplicationActions({ application }: ApplicationActionsProps) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await approveApplication(application.id);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await rejectApplication(application.id, notes);
      setNotes('');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestMoreInfo = async () => {
    setIsSubmitting(true);
    try {
      await requestMoreInfo(application.id, notes);
      setNotes('');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (application.status === 'approved') {
    return (
      <p className="text-sm text-muted-foreground">
        <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Already Approved
        </span>
      </p>
    );
  }

  if (application.status === 'rejected') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push('/admin/applications')}
      >
        Back to Applications
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Admin Notes (required for Reject / More Info)
        </label>
        <Textarea
          placeholder="Add notes for the applicant..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1.5"
          rows={3}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {application.status === 'pending' && (
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            Approve
          </Button>
        )}
        {application.status === 'pending' && (
          <>
            <Button
              variant="destructive"
              onClick={() => setRejectOpen(true)}
              disabled={isSubmitting || !notes.trim()}
            >
              Reject
            </Button>
            <ConfirmDialog
              open={rejectOpen}
              onOpenChange={setRejectOpen}
              title="Reject Application"
              description="Are you sure you want to reject this application? The applicant will be notified."
              confirmLabel="Reject"
              variant="destructive"
              onConfirm={handleReject}
            />
          </>
        )}
        {application.status === 'pending' && (
          <>
            <Button
              variant="outline"
              onClick={() => setMoreInfoOpen(true)}
              disabled={isSubmitting || !notes.trim()}
            >
              Request More Info
            </Button>
            <ConfirmDialog
              open={moreInfoOpen}
              onOpenChange={setMoreInfoOpen}
              title="Request More Info"
              description="The applicant will be notified and can update their application with additional information."
              confirmLabel="Send Request"
              onConfirm={handleRequestMoreInfo}
            />
          </>
        )}
        {application.status === 'more_info_requested' && (
          <Button variant="outline" size="sm" disabled>
            Waiting for applicant response
          </Button>
        )}
      </div>
    </div>
  );
}
