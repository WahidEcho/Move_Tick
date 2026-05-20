import { createServiceClient } from '@/lib/supabase-server';
import type {
  Space,
  SpaceRegistration,
  SpaceMovement,
  MovementType,
} from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';
import { derivePresence } from '@/lib/helpers';

export interface CreateSpaceData {
  name: string;
  description?: string | null;
  type?: string | null;
  capacity?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  registration_mode?: 'walk_in_only' | 'preregistration_required' | 'mixed';
  visibility?: 'public_on_event_page' | 'internal_only';
}

export interface SpaceOccupancy {
  current_inside: number;
  available_spots: number | null;
  total_visits: number;
}

export interface SpaceDashboard {
  current_inside: number;
  capacity: number | null;
  available: number | null;
  entered_count: number;
  left_count: number;
}

export interface GetSpaceRegistrationsFilters {
  status?: 'registered' | 'waitlisted' | 'cancelled';
  page?: number;
  page_size?: number;
}

export async function createSpace(
  eventId: string,
  data: CreateSpaceData
): Promise<Space> {
  const supabase = createServiceClient();

  const { data: space, error } = await supabase
    .from('spaces')
    .insert({
      event_id: eventId,
      name: data.name,
      description: data.description ?? null,
      type: data.type ?? null,
      capacity: data.capacity ?? null,
      start_time: data.start_time ?? null,
      end_time: data.end_time ?? null,
      registration_mode: data.registration_mode ?? 'walk_in_only',
      visibility: data.visibility ?? 'public_on_event_page',
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create space: ${error.message}`);
  return space as Space;
}

export async function getEventSpaces(eventId: string): Promise<Space[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch event spaces: ${error.message}`);
  return (data ?? []) as Space[];
}

export async function getSpace(id: string): Promise<Space | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch space: ${error.message}`);
  }
  return data as Space;
}

export async function updateSpace(
  id: string,
  data: Partial<CreateSpaceData>
): Promise<Space> {
  const supabase = createServiceClient();

  const updates: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  const { data: space, error } = await supabase
    .from('spaces')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update space: ${error.message}`);
  return space as Space;
}

export async function archiveSpace(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('spaces')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Failed to archive space: ${error.message}`);
}

function determineNextSpaceMovementType(
  movements: { movement_type: string }[]
): MovementType {
  if (movements.length === 0) return 'check_in';
  const last = movements[movements.length - 1];
  return last.movement_type === 'check_in' ? 'check_out' : 'check_in';
}

export async function registerForSpace(
  spaceId: string,
  eventId: string,
  userId: string,
  ticketId: string
): Promise<SpaceRegistration> {
  const supabase = createServiceClient();

  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .select('capacity')
    .eq('id', spaceId)
    .eq('event_id', eventId)
    .single();

  if (spaceError || !space)
    throw new Error('Space not found');

  const { count } = await supabase
    .from('space_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('space_id', spaceId)
    .eq('status', 'registered');

  const capacity = space.capacity as number | null;
  if (capacity != null && (count ?? 0) >= capacity)
    throw new Error('Space is at capacity');

  const { data: existing } = await supabase
    .from('space_registrations')
    .select('id')
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .eq('status', 'registered')
    .maybeSingle();

  if (existing) throw new Error('Already registered for this space');

  const { data: reg, error } = await supabase
    .from('space_registrations')
    .insert({
      space_id: spaceId,
      event_id: eventId,
      user_id: userId,
      ticket_id: ticketId,
      status: 'registered',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to register for space: ${error.message}`);
  return reg as SpaceRegistration;
}

export async function getSpaceRegistrations(
  spaceId: string,
  filters: GetSpaceRegistrationsFilters = {}
): Promise<PaginatedResult<SpaceRegistration>> {
  const supabase = createServiceClient();
  const { status, page = 1, page_size = 20 } = filters;

  let query = supabase
    .from('space_registrations')
    .select('*, profile:profiles(id, full_name, email)', { count: 'exact' })
    .eq('space_id', spaceId);

  if (status) query = query.eq('status', status);

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch space registrations: ${error.message}`);

  return {
    data: (data ?? []) as SpaceRegistration[],
    total: count ?? 0,
    page,
    page_size,
    total_pages: Math.ceil((count ?? 0) / page_size) || 1,
  };
}

export async function recordSpaceMovement(
  spaceId: string,
  eventId: string,
  ticketId: string,
  userId: string,
  scannedBy?: string | null
): Promise<SpaceMovement> {
  const supabase = createServiceClient();

  const { data: movements } = await supabase
    .from('space_movements')
    .select('movement_type')
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .order('scanned_at', { ascending: true });

  const movementType = determineNextSpaceMovementType(movements ?? []);

  const { data, error } = await supabase
    .from('space_movements')
    .insert({
      space_id: spaceId,
      event_id: eventId,
      ticket_id: ticketId,
      user_id: userId,
      movement_type: movementType,
      scanned_by: scannedBy ?? null,
      scanned_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to record space movement: ${error.message}`);
  return data as SpaceMovement;
}

export async function getSpaceOccupancy(spaceId: string): Promise<SpaceOccupancy> {
  const supabase = createServiceClient();

  const { data: space } = await supabase
    .from('spaces')
    .select('capacity')
    .eq('id', spaceId)
    .single();

  const { data: movements } = await supabase
    .from('space_movements')
    .select('user_id, movement_type')
    .eq('space_id', spaceId)
    .order('scanned_at', { ascending: true });

  const userMovements = new Map<string, { movement_type: string }[]>();
  for (const m of movements ?? []) {
    const arr = userMovements.get(m.user_id) ?? [];
    arr.push({ movement_type: m.movement_type });
    userMovements.set(m.user_id, arr);
  }

  let currentInside = 0;
  let totalVisits = 0;
  for (const [, movs] of userMovements) {
    const presence = derivePresence(movs);
    if (presence === 'inside_event') currentInside++;
    totalVisits += movs.filter((m) => m.movement_type === 'check_in').length;
  }

  const capacity = space?.capacity as number | null;
  const available = capacity != null ? Math.max(0, capacity - currentInside) : null;

  return {
    current_inside: currentInside,
    available_spots: capacity != null ? available : null,
    total_visits: totalVisits,
  };
}

export async function getSpaceMovements(spaceId: string): Promise<SpaceMovement[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('space_movements')
    .select('*')
    .eq('space_id', spaceId)
    .order('scanned_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch space movements: ${error.message}`);
  return (data ?? []) as SpaceMovement[];
}

export async function getSpaceDashboard(spaceId: string): Promise<SpaceDashboard> {
  const supabase = createServiceClient();

  const { data: space } = await supabase
    .from('spaces')
    .select('capacity')
    .eq('id', spaceId)
    .single();

  const { data: movements } = await supabase
    .from('space_movements')
    .select('user_id, movement_type')
    .eq('space_id', spaceId)
    .order('scanned_at', { ascending: true });

  const userMovements = new Map<string, { movement_type: string }[]>();
  for (const m of movements ?? []) {
    const arr = userMovements.get(m.user_id) ?? [];
    arr.push({ movement_type: m.movement_type });
    userMovements.set(m.user_id, arr);
  }

  let currentInside = 0;
  let enteredCount = 0;
  let leftCount = 0;
  for (const [, movs] of userMovements) {
    const presence = derivePresence(movs);
    if (presence === 'inside_event') currentInside++;
    enteredCount += movs.filter((m) => m.movement_type === 'check_in').length;
    leftCount += movs.filter((m) => m.movement_type === 'check_out').length;
  }

  const capacity = space?.capacity as number | null;
  const available = capacity != null ? Math.max(0, capacity - currentInside) : null;

  return {
    current_inside: currentInside,
    capacity,
    available,
    entered_count: enteredCount,
    left_count: leftCount,
  };
}
