import { getActiveOrganizerOrg } from '@/lib/auth';
import { OrganizerShell } from './organizer-shell';

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, org } = await getActiveOrganizerOrg();

  return <OrganizerShell profile={profile} org={org}>{children}</OrganizerShell>;
}
