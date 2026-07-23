import { NextResponse } from 'next/server';
import { requireAuth, getOrgRole, getEventStaffRole } from '@/lib/auth';
import { getEvent, getEventStoryContent } from '@/services/events.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await requireAuth();
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Org members, assigned event staff (co-organizers), or a platform admin
  // (full manage access to any event) may load the event.
  const isAdmin = profile.platform_role === 'admin';
  const orgRole = await getOrgRole(profile.id, event.organization_id);
  const staffRole = orgRole ? null : await getEventStaffRole(profile.id, id);
  if (!isAdmin && !orgRole && !staffRole) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const story = await getEventStoryContent(id);
  return NextResponse.json({ ...event, story });
}
