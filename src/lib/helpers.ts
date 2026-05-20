import { format, formatDistanceToNow, isPast, isFuture, isToday } from 'date-fns';

export function formatDate(date: string | Date, pattern = 'MMM d, yyyy'): string {
  return format(new Date(date), pattern);
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function isEventLive(startDate: string, endDate: string): boolean {
  const now = new Date();
  return new Date(startDate) <= now && now <= new Date(endDate);
}

export function isEventUpcoming(startDate: string): boolean {
  return isFuture(new Date(startDate));
}

export function isEventPast(endDate: string): boolean {
  return isPast(new Date(endDate));
}

export function isEventToday(startDate: string): boolean {
  return isToday(new Date(startDate));
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getPresenceLabel(presence: string): string {
  switch (presence) {
    case 'inside_event': return 'Inside';
    case 'outside_event': return 'Left';
    case 'never_arrived': return 'No-show';
    default: return presence;
  }
}

export function getPresenceColor(presence: string): string {
  switch (presence) {
    case 'inside_event': return 'bg-green-100 text-green-800';
    case 'outside_event': return 'bg-gray-100 text-gray-800';
    case 'never_arrived': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export function derivePresence(movements: { movement_type: string }[]): string {
  if (movements.length === 0) return 'never_arrived';
  const lastMovement = movements[movements.length - 1];
  return lastMovement.movement_type === 'check_in' ? 'inside_event' : 'outside_event';
}

export function calculateCapacityPercentage(used: number, total: number | null): number | null {
  if (!total || total === 0) return null;
  return Math.round((used / total) * 100);
}

export function downloadCSV(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
