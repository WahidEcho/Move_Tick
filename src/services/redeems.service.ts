import { createServiceClient } from '@/lib/supabase-server';
import type {
  RedeemItem,
  TicketTypeRedeem,
  TicketRedeemBalance,
  RedeemLog,
} from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';

export interface CreateRedeemItemData {
  name: string;
  category?: string | null;
  description?: string | null;
  station?: string | null;
  time_window_start?: string | null;
  time_window_end?: string | null;
}

export interface UpdateRedeemItemData {
  name?: string;
  category?: string | null;
  description?: string | null;
  station?: string | null;
  time_window_start?: string | null;
  time_window_end?: string | null;
}

export interface RedeemLogFilters {
  redeem_item_id?: string;
  ticket_id?: string;
  page?: number;
  page_size?: number;
}

export interface RedeemSummaryItem {
  item_id: string;
  item_name: string;
  total_redeemed: number;
  total_remaining: number;
  total_allowed: number;
}

export type TicketTypeRedeemWithItem = TicketTypeRedeem & { redeem_item: RedeemItem };

export interface EventRedeemMapping {
  id: string;
  ticket_type_id: string;
  redeem_item_id: string;
  quantity_allowed: number;
  ticket_type_name: string;
  redeem_item_name: string;
}

export async function getEventRedeemMappings(eventId: string): Promise<EventRedeemMapping[]> {
  const supabase = createServiceClient();

  const { data: ticketTypes, error: ttError } = await supabase
    .from('ticket_types')
    .select('id')
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (ttError) throw new Error(`Failed to fetch ticket types: ${ttError.message}`);
  const ticketTypeIds = (ticketTypes ?? []).map((t) => t.id);
  if (ticketTypeIds.length === 0) return [];

  const { data: mappings, error } = await supabase
    .from('ticket_type_redeems')
    .select(
      `
      id,
      ticket_type_id,
      redeem_item_id,
      quantity_allowed,
      ticket_type:ticket_types(name),
      redeem_item:redeem_items(name)
    `
    )
    .in('ticket_type_id', ticketTypeIds);

  if (error) throw new Error(`Failed to fetch redeem mappings: ${error.message}`);

  return ((mappings ?? []) as unknown as Array<{
    id: string;
    ticket_type_id: string;
    redeem_item_id: string;
    quantity_allowed: number;
    ticket_type: { name: string } | null;
    redeem_item: { name: string } | null;
  }>).map((m) => ({
    id: m.id,
    ticket_type_id: m.ticket_type_id,
    redeem_item_id: m.redeem_item_id,
    quantity_allowed: m.quantity_allowed,
    ticket_type_name: m.ticket_type?.name ?? '',
    redeem_item_name: m.redeem_item?.name ?? '',
  }));
}
export type TicketRedeemBalanceWithItem = TicketRedeemBalance & { redeem_item: RedeemItem };

export async function createRedeemItem(
  eventId: string,
  data: CreateRedeemItemData
): Promise<RedeemItem> {
  const supabase = createServiceClient();

  const { data: item, error } = await supabase
    .from('redeem_items')
    .insert({
      event_id: eventId,
      name: data.name,
      category: data.category ?? null,
      description: data.description ?? null,
      station: data.station ?? null,
      time_window_start: data.time_window_start ?? null,
      time_window_end: data.time_window_end ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create redeem item: ${error.message}`);
  return item as RedeemItem;
}

export async function getEventRedeemItems(eventId: string): Promise<RedeemItem[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('redeem_items')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to fetch redeem items: ${error.message}`);
  return (data ?? []) as RedeemItem[];
}

export async function updateRedeemItem(
  id: string,
  data: UpdateRedeemItemData
): Promise<RedeemItem> {
  const supabase = createServiceClient();

  const { data: item, error } = await supabase
    .from('redeem_items')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update redeem item: ${error.message}`);
  return item as RedeemItem;
}

export async function deleteRedeemItem(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('redeem_items')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Failed to delete redeem item: ${error.message}`);
}

export async function mapRedeemToTicketType(
  ticketTypeId: string,
  redeemItemId: string,
  quantityAllowed: number
): Promise<TicketTypeRedeem> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('ticket_type_redeems')
    .insert({
      ticket_type_id: ticketTypeId,
      redeem_item_id: redeemItemId,
      quantity_allowed: quantityAllowed,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to map redeem to ticket type: ${error.message}`);
  return data as TicketTypeRedeem;
}

export async function removeRedeemMapping(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('ticket_type_redeems')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to remove redeem mapping: ${error.message}`);
}

export async function getTicketTypeRedeems(
  ticketTypeId: string
): Promise<TicketTypeRedeemWithItem[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('ticket_type_redeems')
    .select('*, redeem_item:redeem_items(*)')
    .eq('ticket_type_id', ticketTypeId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch ticket type redeems: ${error.message}`);

  return ((data ?? []) as unknown as Array<TicketTypeRedeem & { redeem_item: RedeemItem }>).map(
    ({ redeem_item, ...rest }) => ({ ...rest, redeem_item })
  );
}

export async function getTicketRedeemBalances(
  ticketId: string
): Promise<TicketRedeemBalanceWithItem[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('ticket_redeem_balances')
    .select('*, redeem_item:redeem_items(*)')
    .eq('ticket_id', ticketId);

  if (error) throw new Error(`Failed to fetch ticket redeem balances: ${error.message}`);

  return ((data ?? []) as unknown as Array<TicketRedeemBalance & { redeem_item: RedeemItem }>).map(
    ({ redeem_item, ...rest }) => ({ ...rest, redeem_item })
  );
}

export async function initializeRedeemBalances(
  ticketId: string,
  ticketTypeId: string
): Promise<TicketRedeemBalance[]> {
  const supabase = createServiceClient();

  const mappings = await getTicketTypeRedeems(ticketTypeId);
  if (mappings.length === 0) return [];

  const balances = mappings.map((m) => ({
    ticket_id: ticketId,
    redeem_item_id: m.redeem_item_id,
    total_allowed: m.quantity_allowed,
    total_redeemed: 0,
    remaining: m.quantity_allowed,
  }));

  const { data, error } = await supabase
    .from('ticket_redeem_balances')
    .insert(balances)
    .select();

  if (error) throw new Error(`Failed to initialize redeem balances: ${error.message}`);
  return (data ?? []) as TicketRedeemBalance[];
}

export async function recordRedemption(
  ticketId: string,
  redeemItemId: string,
  eventId: string,
  userId: string,
  redeemedBy: string | null,
  quantity: number = 1
): Promise<RedeemLog> {
  const supabase = createServiceClient();

  const { data: balance, error: balanceError } = await supabase
    .from('ticket_redeem_balances')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('redeem_item_id', redeemItemId)
    .maybeSingle();

  if (balanceError) throw new Error(`Failed to check balance: ${balanceError.message}`);
  if (!balance || balance.remaining < quantity) {
    throw new Error(`Insufficient redeem balance. Remaining: ${balance?.remaining ?? 0}, requested: ${quantity}`);
  }

  const { data: log, error: logError } = await supabase
    .from('redeem_logs')
    .insert({
      ticket_id: ticketId,
      redeem_item_id: redeemItemId,
      event_id: eventId,
      user_id: userId,
      redeemed_by: redeemedBy,
      quantity,
      redeemed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (logError) throw new Error(`Failed to create redeem log: ${logError.message}`);

  const newRemaining = balance.remaining - quantity;
  const newTotalRedeemed = balance.total_redeemed + quantity;

  const { error: updateError } = await supabase
    .from('ticket_redeem_balances')
    .update({
      total_redeemed: newTotalRedeemed,
      remaining: newRemaining,
      updated_at: new Date().toISOString(),
    })
    .eq('id', balance.id);

  if (updateError) throw new Error(`Failed to update redeem balance: ${updateError.message}`);

  return log as RedeemLog;
}

export async function getRedeemLogs(
  eventId: string,
  filters: RedeemLogFilters = {}
): Promise<PaginatedResult<RedeemLog>> {
  const supabase = createServiceClient();
  const { redeem_item_id, ticket_id, page = 1, page_size = 20 } = filters;

  let query = supabase
    .from('redeem_logs')
    .select('*', { count: 'exact' })
    .eq('event_id', eventId);

  if (redeem_item_id) query = query.eq('redeem_item_id', redeem_item_id);
  if (ticket_id) query = query.eq('ticket_id', ticket_id);

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.order('redeemed_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch redeem logs: ${error.message}`);

  const total = count ?? 0;
  return {
    data: (data ?? []) as RedeemLog[],
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}

export async function getRedeemSummary(eventId: string): Promise<RedeemSummaryItem[]> {
  const supabase = createServiceClient();

  const { data: items, error: itemsError } = await supabase
    .from('redeem_items')
    .select('id, name')
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (itemsError) throw new Error(`Failed to fetch redeem items: ${itemsError.message}`);
  if (!items || items.length === 0) return [];

  const { data: redeemLogs, error: logsError } = await supabase
    .from('redeem_logs')
    .select('redeem_item_id, quantity')
    .eq('event_id', eventId);

  if (logsError) throw new Error(`Failed to fetch redeem logs: ${logsError.message}`);

  const { data: balances, error: balancesError } = await supabase
    .from('ticket_redeem_balances')
    .select('redeem_item_id, total_allowed, remaining')
    .in('redeem_item_id', items.map((i) => i.id));

  if (balancesError) throw new Error(`Failed to fetch redeem balances: ${balancesError.message}`);

  const redeemedByItem = new Map<string, number>();
  const allowedByItem = new Map<string, number>();
  const remainingByItem = new Map<string, number>();

  for (const log of redeemLogs ?? []) {
    redeemedByItem.set(log.redeem_item_id, (redeemedByItem.get(log.redeem_item_id) ?? 0) + log.quantity);
  }

  for (const bal of balances ?? []) {
    allowedByItem.set(
      bal.redeem_item_id,
      (allowedByItem.get(bal.redeem_item_id) ?? 0) + bal.total_allowed
    );
    remainingByItem.set(
      bal.redeem_item_id,
      (remainingByItem.get(bal.redeem_item_id) ?? 0) + bal.remaining
    );
  }

  return items.map((item) => ({
    item_id: item.id,
    item_name: item.name,
    total_redeemed: redeemedByItem.get(item.id) ?? 0,
    total_remaining: remainingByItem.get(item.id) ?? 0,
    total_allowed: allowedByItem.get(item.id) ?? 0,
  }));
}
