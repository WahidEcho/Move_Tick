'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pagination } from '@/components/tables/pagination';
import { Loader2, Eye, Send, Megaphone } from 'lucide-react';
import {
  getAudienceCountAction,
  previewAnnouncementAction,
  sendTestEmailAction,
  sendAnnouncementToAudienceAction,
  getAnnouncementProgressAction,
  retryAnnouncementAction,
  type ComposerInput,
} from './actions';
import type { Announcement, AnnouncementAudience } from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  attendees: 'All attendees',
  organizers: 'All organizers',
  both: 'Attendees + organizers',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  sent: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const EMPTY_FORM: ComposerInput = {
  subject: '',
  headline: '',
  body: '',
  ctaLabel: '',
  ctaUrl: '',
  audience: 'attendees',
  sendInApp: false,
};

interface AnnouncementsClientProps {
  history: PaginatedResult<Announcement>;
  searchParams: { page?: string };
}

export function AnnouncementsClient({ history, searchParams }: AnnouncementsClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<ComposerInput>(EMPTY_FORM);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(true);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const [testSending, setTestSending] = useState(false);
  const [testSentMessage, setTestSentMessage] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ status: string; total: number; sent: number; failed: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCountLoading(true);
    getAudienceCountAction(form.audience)
      .then((count) => {
        if (!cancelled) setAudienceCount(count);
      })
      .finally(() => {
        if (!cancelled) setCountLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.audience]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const isFormValid = form.subject.trim() && form.headline.trim() && form.body.trim();

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const html = await previewAnnouncementAction(form);
      setPreviewHtml(html);
      setPreviewOpen(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendTest = async () => {
    setTestSending(true);
    setTestSentMessage(null);
    try {
      await sendTestEmailAction(form);
      setTestSentMessage('Test email sent to your own inbox.');
    } finally {
      setTestSending(false);
    }
  };

  const startPolling = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const p = await getAnnouncementProgressAction(id);
      setProgress({ status: p.status, total: p.total_recipients, sent: p.sent_count, failed: p.failed_count });
      if (p.status === 'sent' || p.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
        router.refresh();
      }
    }, 2000);
  };

  const handleConfirmSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setProgress({ status: 'sending', total: audienceCount ?? 0, sent: 0, failed: 0 });
    try {
      const { announcementId } = await sendAnnouncementToAudienceAction(form);
      startPolling(announcementId);
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await retryAnnouncementAction(id);
      startPolling(id);
    } finally {
      setRetryingId(null);
    }
  };

  const handlePageChange = (page: number) => {
    router.push(`/admin/announcements?page=${page}`);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>New announcement</CardTitle>
          <p className="text-sm text-muted-foreground">
            Structured fields only — the message renders inside the branded Move-Tick email shell.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email subject line</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="🎉 New feature on Move-Tick"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={form.audience} onValueChange={(v) => setForm((f) => ({ ...f, audience: v as AnnouncementAudience }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendees">All attendees</SelectItem>
                  <SelectItem value="organizers">All organizers</SelectItem>
                  <SelectItem value="both">Attendees + organizers</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {countLoading ? 'Counting recipients…' : `${audienceCount ?? 0} recipient${audienceCount === 1 ? '' : 's'} (opted-in only)`}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Headline (shown inside the email)</Label>
            <Input
              value={form.headline}
              onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
              placeholder="We just shipped something new"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              rows={6}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Write your announcement... separate paragraphs with a blank line."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Button label (optional)</Label>
              <Input
                value={form.ctaLabel}
                onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                placeholder="Explore events"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Button link (optional)</Label>
              <Input
                value={form.ctaUrl}
                onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                placeholder="https://move-tick.mbeg.org/events"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Also send as an in-app notification</p>
              <p className="text-xs text-muted-foreground">Shows up in the bell dropdown for every recipient with an account.</p>
            </div>
            <Switch checked={form.sendInApp} onCheckedChange={(v) => setForm((f) => ({ ...f, sendInApp: v }))} />
          </div>

          {progress && (
            <div className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">
                  {progress.status === 'sending' ? 'Sending…' : progress.status === 'sent' ? 'Sent' : 'Failed'}
                </span>
                <span className="text-muted-foreground">
                  {progress.sent + progress.failed} / {progress.total}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress.total > 0 ? ((progress.sent + progress.failed) / progress.total) * 100 : 0}%` }}
                />
              </div>
              {progress.failed > 0 && (
                <p className="mt-2 text-xs text-destructive">{progress.failed} failed — use Retry from the history below.</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={handlePreview} disabled={!isFormValid || previewLoading} className="gap-1.5">
              {previewLoading ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              Preview
            </Button>
            <Button variant="outline" onClick={handleSendTest} disabled={!isFormValid || testSending} className="gap-1.5">
              {testSending && <Loader2 className="size-4 animate-spin" />}
              Send test to me
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!isFormValid || sending || (progress?.status === 'sending')}
              className="gap-1.5"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send to audience
            </Button>
            {testSentMessage && <span className="text-xs text-muted-foreground">{testSentMessage}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Megaphone className="size-10 opacity-40" />
              <p className="text-sm">No announcements sent yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.data.map((a) => (
                <div key={a.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {AUDIENCE_LABELS[a.audience]} · {new Date(a.created_at).toLocaleString()} · {a.sent_count}/{a.total_recipients} sent
                      {a.failed_count > 0 ? `, ${a.failed_count} failed` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className={STATUS_BADGE_CLASSES[a.status] ?? 'bg-muted text-muted-foreground'}>
                      {a.status}
                    </Badge>
                    {a.status === 'failed' && (
                      <Button size="sm" variant="outline" disabled={retryingId === a.id} onClick={() => handleRetry(a.id)}>
                        {retryingId === a.id && <Loader2 className="size-3.5 animate-spin" />}
                        Retry failed
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {history.total_pages > 1 && (
            <div className="mt-4">
              <Pagination
                page={Number(searchParams.page) || 1}
                totalPages={history.total_pages}
                onPageChange={handlePageChange}
                pageSize={history.page_size}
                total={history.total}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>This is exactly what recipients will see.</DialogDescription>
          </DialogHeader>
          <iframe srcDoc={previewHtml} className="h-[500px] w-full rounded-lg border border-border bg-white" title="Email preview" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to {audienceCount ?? 0} recipients?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends &quot;{form.subject}&quot; to <strong>{AUDIENCE_LABELS[form.audience]}</strong> right now. This can&apos;t be undone
              once it starts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>Send now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
