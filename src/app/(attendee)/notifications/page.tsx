import { requireAuth } from '@/lib/auth';
import { getUserNotifications } from '@/services/notifications.service';
import { NotificationsList } from './notifications-list';

export default async function NotificationsPage() {
  const profile = await requireAuth();
  const { data: notifications } = await getUserNotifications(profile.id, { page_size: 50 });

  return (
    <div className="space-y-6">
      <div className="cinematic-panel p-6 sm:p-8">
        <p className="cinematic-kicker">Stay in the moment</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Notifications</h1>
        <p className="mt-2 text-muted-foreground">Ticket, payment, invitation, and event updates—together and actionable.</p>
      </div>

      <NotificationsList initialNotifications={notifications} />
    </div>
  );
}
