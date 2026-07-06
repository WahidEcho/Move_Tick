import { requireAuth } from '@/lib/auth';
import { getUserNotifications } from '@/services/notifications.service';
import { NotificationsList } from './notifications-list';

export default async function NotificationsPage() {
  const profile = await requireAuth();
  const { data: notifications } = await getUserNotifications(profile.id, { page_size: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-1 text-muted-foreground">
          Updates about your applications, organizations, and events
        </p>
      </div>

      <NotificationsList initialNotifications={notifications} />
    </div>
  );
}
