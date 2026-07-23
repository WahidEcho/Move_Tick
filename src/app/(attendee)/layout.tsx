import { requireAuth } from '@/lib/auth';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { AttendeeNav } from './attendee-nav';

export default async function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader allowThemeToggle />
      <div className="flex flex-1 flex-col lg:flex-row">
        <AttendeeNav />
        <main className="flex-1 px-4 py-6 pb-24 md:px-6 lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}
