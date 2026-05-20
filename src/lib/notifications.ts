import type { NotificationPayload, NotificationType } from '@/types/domain.types';

interface NotificationProvider {
  send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

class EmailNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload) {
    // Integration point for email provider (SendGrid, Resend, AWS SES, etc.)
    // In production, this would call the email API
    console.log(`[Email] Queued: ${payload.type} to ${payload.recipient_email}`);
    return { success: true, messageId: `email_${Date.now()}` };
  }
}

class WhatsAppNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload) {
    // Integration point for WhatsApp Business API provider
    console.log(`[WhatsApp] Queued: ${payload.type} to ${payload.recipient_email}`);
    return { success: true, messageId: `wa_${Date.now()}` };
  }
}

const providers: Record<string, NotificationProvider> = {
  email: new EmailNotificationProvider(),
  whatsapp: new WhatsAppNotificationProvider(),
};

export async function sendNotification(
  channel: 'email' | 'whatsapp',
  payload: NotificationPayload
) {
  const provider = providers[channel];
  if (!provider) {
    return { success: false, error: `Unknown channel: ${channel}` };
  }
  return provider.send(payload);
}

export function buildNotificationPayload(
  type: NotificationType,
  recipientEmail: string,
  recipientName: string,
  data: Record<string, unknown>
): NotificationPayload {
  const subjects: Record<NotificationType, string> = {
    approval_email: 'Your organizer application has been approved',
    organizer_welcome: 'Welcome to Move Beyond - Organizer Portal',
    invitation_email: `You're invited to an event`,
    confirmation_email: 'Your registration is confirmed',
    ticket_email: 'Your ticket is ready',
    terms_delivery: 'Terms and Conditions',
    organizer_manual: 'Important update from Move Beyond',
  };

  return {
    type,
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    subject: subjects[type] ?? 'Notification from Move Beyond',
    data,
  };
}
