import { getOrganizerContext } from '@/lib/auth';
import { OrganizerShell } from './organizer-shell';
import type { Organization } from '@/types/database.types';

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, org } = await getOrganizerContext();

  // Assignment-only co-organizers and platform admins have no organization of
  // their own; show a neutral label so the shell still renders for them.
  const shellOrg =
    org ?? ({ name: profile.platform_role === 'admin' ? 'Platform Admin' : 'Shared events' } as Organization);

  return (
    <OrganizerShell profile={profile} org={shellOrg}>
      {children}
    </OrganizerShell>
  );
}
