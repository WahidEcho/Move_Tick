import { requireAuth } from '@/lib/auth';
import { PublicHeader } from '@/components/layout/public-header';
import { AttendeeNav } from './attendee-nav';

export default async function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <div className="flex flex-1 flex-col lg:flex-row">
        <AttendeeNav />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
