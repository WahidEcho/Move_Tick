import { NextResponse } from 'next/server';
import { requireAuth, getOrgRole, getEventStaffRole } from '@/lib/auth';
import { getEvent } from '@/services/events.service';

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

  // Org members OR assigned event staff (co-organizers) may load the event.
  const orgRole = await getOrgRole(profile.id, event.organization_id);
  const staffRole = orgRole ? null : await getEventStaffRole(profile.id, id);
  if (!orgRole && !staffRole) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json(event);
}
