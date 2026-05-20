import { requireAdmin } from '@/lib/auth';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          title="Platform Admin"
          description="Manage applications, organizations, events, and users"
        />
        <main className="flex-1 p-4 lg:p-6 border-l border-orange-500/10">
          {children}
        </main>
      </div>
    </div>
  );
}
