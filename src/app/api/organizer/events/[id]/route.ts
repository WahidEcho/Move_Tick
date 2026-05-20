import { NextResponse } from 'next/server';
import { getActiveOrganizerOrg } from '@/lib/auth';
import { getEvent } from '@/services/events.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { org } = await getActiveOrganizerOrg();
  const { id } = await params;
  const event = await getEvent(id);

  if (!event || event.organization_id !== org.id) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json(event);
}
