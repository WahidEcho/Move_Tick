'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import type { PlatformSettings } from '@/types/database.types';
import { updatePlatformSettingsAction, type EditablePlatformSettings } from './actions';

export function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<EditablePlatformSettings>({
    commission_percentage: settings.commission_percentage,
    fixed_fee_egp: settings.fixed_fee_egp,
    event_expiry_buffer_hours: settings.event_expiry_buffer_hours,
    default_timezone: settings.default_timezone,
    org_approval_required: settings.org_approval_required,
    default_max_events: settings.default_max_events,
    default_event_duration_hours: settings.default_event_duration_hours,
    support_email: settings.support_email,
    admin_alert_email: settings.admin_alert_email,
    public_contact: settings.public_contact,
  });

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updatePlatformSettingsAction(form);
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fees & commission</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Default commission %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.commission_percentage}
              onChange={(e) => setForm((f) => ({ ...f, commission_percentage: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fixed fee per paid ticket (EGP)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.fixed_fee_egp}
              onChange={(e) => setForm((f) => ({ ...f, fixed_fee_egp: Number(e.target.value) }))}
            />
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Applies to organizations without a custom commission override. Scaffolded — not yet deducted at checkout.
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event visibility & organizer defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Event expiry buffer (hours)</Label>
              <Input
                type="number"
                min={0}
                value={form.event_expiry_buffer_hours}
                onChange={(e) => setForm((f) => ({ ...f, event_expiry_buffer_hours: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">
                Events disappear from public discovery this many hours after they end.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Default timezone</Label>
              <Input
                value={form.default_timezone}
                onChange={(e) => setForm((f) => ({ ...f, default_timezone: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Default max events (blank = unlimited)</Label>
              <Input
                type="number"
                min={0}
                value={form.default_max_events ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, default_max_events: e.target.value ? Number(e.target.value) : null }))
                }
              />
              <p className="text-xs text-muted-foreground">Applied to newly-approved organizations only.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Default max event duration (hours, blank = none)</Label>
              <Input
                type="number"
                min={0}
                value={form.default_event_duration_hours ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    default_event_duration_hours: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Require admin approval for new organizations</p>
              <p className="text-xs text-muted-foreground">
                When on, new applications need manual review before becoming active organizations.
              </p>
            </div>
            <Switch
              checked={form.org_approval_required}
              onCheckedChange={(v) => setForm((f) => ({ ...f, org_approval_required: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Support email (shown to applicants and organizers)</Label>
            <Input
              type="email"
              value={form.support_email}
              onChange={(e) => setForm((f) => ({ ...f, support_email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Admin alert inbox (internal — receives every platform alert)</Label>
            <Input
              type="email"
              value={form.admin_alert_email}
              onChange={(e) => setForm((f) => ({ ...f, admin_alert_email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Public contact (optional — shown on the site footer/contact page)</Label>
            <Input
              value={form.public_contact ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, public_contact: e.target.value || null }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save settings'}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">Saved.</span>}
      </div>
    </div>
  );
}
