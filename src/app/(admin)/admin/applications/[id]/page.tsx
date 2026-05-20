import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { getApplicationById } from '@/services/organizerApplications.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { APPLICATION_STATUS_COLORS } from '@/lib/constants';
import { ApplicationActions } from './application-actions';
import { ChevronLeft } from 'lucide-react';

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-2">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value ?? '—'}</span>
    </div>
  );
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const application = await getApplicationById(id);

  if (!application) notFound();

  const statusColor =
    APPLICATION_STATUS_COLORS[application.status] ??
    'bg-muted text-muted-foreground';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/applications">
          <Button variant="ghost" size="icon-sm" aria-label="Back to applications">
            <ChevronLeft className="size-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground truncate">
            {application.full_name}
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            {application.organization_name}
          </p>
        </div>
        <Badge variant="outline" className={statusColor}>
          {formatStatus(application.status)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow label="Name" value={application.full_name} />
              <Separator />
              <InfoRow label="Email" value={application.email} />
              <Separator />
              <InfoRow label="Phone" value={application.phone} />
              <Separator />
              <InfoRow label="Role / Title" value={application.role_title} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow label="Name" value={application.organization_name} />
              <Separator />
              <InfoRow label="Type" value={application.organization_type} />
              <Separator />
              <InfoRow
                label="Description"
                value={application.organization_description}
              />
              <Separator />
              <InfoRow
                label="Website"
                value={
                  application.website ? (
                    <a
                      href={application.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {application.website}
                    </a>
                  ) : null
                }
              />
              <Separator />
              <InfoRow label="Instagram" value={application.instagram} />
              <Separator />
              <InfoRow label="LinkedIn" value={application.linkedin} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow label="Country" value={application.country} />
              <Separator />
              <InfoRow label="City" value={application.city} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Planning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow
                label="Categories"
                value={
                  application.event_categories?.length
                    ? application.event_categories.join(', ')
                    : null
                }
              />
              <Separator />
              <InfoRow
                label="Expected events per month"
                value={
                  application.expected_events_per_month != null
                    ? String(application.expected_events_per_month)
                    : null
                }
              />
              <Separator />
              <InfoRow
                label="Expected avg attendees"
                value={
                  application.expected_avg_attendees != null
                    ? String(application.expected_avg_attendees)
                    : null
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status & Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Current status:
                </span>
                <Badge variant="outline" className={statusColor}>
                  {formatStatus(application.status)}
                </Badge>
              </div>
              {application.admin_notes && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Admin Notes
                    </span>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {application.admin_notes}
                    </p>
                  </div>
                </>
              )}
              <Separator />
              <ApplicationActions application={application} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
