import { requireAdmin } from '@/lib/auth';
import { getPlatformSettings } from '@/services/platform-settings.service';
import { SettingsForm } from './settings-form';

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getPlatformSettings();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Platform Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Default commission, event expiry, approval requirements, and contact addresses for the whole platform.
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
