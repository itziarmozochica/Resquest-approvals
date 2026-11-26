import type { CartSessionItemQuery, CreateCartQuery, PrepareCartQuery, UpdateCartQuery } from '../models/cart-query.model';
import type { CartSessionItemLine } from '../models/cart-session-item-line.model';
import { canUseCartSessionItemLines } from '../utils/build-cart-session-item-lines';
import type {
  CartActorApi,
  CartCustomerApi,
  CartSessionItemLineRequestApi,
  CartSessionItemRequestApi,
  CreateCartRequestApi,
  PrepareCartRequestApi,
  UpdateCartRequestApi,
} from './cart-request.model';

const DEFAULT_TERMS: readonly string[] = ['on-site-privacy-22032022'];

const MAPPER_OWNED_PREPARE_FIELDS: ReadonlySet<string> = new Set(['b2b_user', 'channel_id', 'user']);

function hostFieldsOf(query: PrepareCartQuery): Readonly<Record<string, unknown>> {
  return Object.fromEntries(Object.entries(query.hostFields ?? {}).filter(([field]) => !MAPPER_OWNED_PREPARE_FIELDS.has(field)));
}

function mapSessionItem(item: CartSessionItemQuery): CartSessionItemRequestApi {
  return {
    session_id: item.sessionId,
    units: item.units,
    ...(item.mainPlanId === undefined ? {} : { main_plan_id: item.mainPlanId }),
    ...(item.seatingHoldToken === undefined ? {} : { seating_hold_token: item.seatingHoldToken }),
    ...(item.seats === undefined
      ? {}
      : { seats: item.seats.map(seat => ({ label: seat.label ?? seat.reference, reference: seat.reference })) }),
  };
}

function mapSessionItemLine(line: CartSessionItemLine): CartSessionItemLineRequestApi {
  return {
    parent: line.parent,
    session_id: line.sessionId,
    ...(line.id === undefined ? {} : { id: line.id }),
    ...(line.mainPlanId === null ? {} : { main_plan_id: line.mainPlanId }),
  };
}

function mapSessionPayload(
  query: CreateCartQuery | UpdateCartQuery,
): { session_item_lines: CartSessionItemLineRequestApi[] } | { session_items: CartSessionItemRequestApi[] } {
  const lines = query.sessionItemLines ?? [];

  if (lines.length > 0 && canUseCartSessionItemLines(query.sessionItems)) {
    return { session_item_lines: lines.map(mapSessionItemLine) };
  }

  return { session_items: query.sessionItems.map(mapSessionItem) };
}

export function mapToCreateCartRequest(query: CreateCartQuery): CreateCartRequestApi {
  return {
    ...mapSessionPayload(query),
    ...(query.bundleIds !== undefined && query.bundleIds.length > 0 ? { bundle_ids: [...query.bundleIds] } : {}),
    ...(query.channel === undefined ? {} : { channel: query.channel }),
    ...(query.overrideCapacity === undefined ? {} : { override_capacity: query.overrideCapacity }),
  };
}

export function mapToUpdateCartRequest(query: UpdateCartQuery): UpdateCartRequestApi {
  return {
    ...mapSessionPayload(query),
    ...(query.bundleIds === undefined ? {} : { bundle_ids: [...query.bundleIds] }),
    ...(query.overrideCapacity === undefined ? {} : { override_capacity: query.overrideCapacity }),
  };
}

function mapActor(query: PrepareCartQuery): CartActorApi {
  return {
    b2b_user_email: query.actor?.email ?? null,
    b2b_user_id: query.actor?.id ?? null,
    b2b_user_interface: query.actor?.userInterface ?? null,
    b2b_user_name: query.actor?.name ?? null,
    b2b_user_username: query.actor?.username ?? null,
  };
}

function mapCustomer(query: PrepareCartQuery): CartCustomerApi {
  return {
    city: query.customer?.cityStandardId ?? null,
    email: query.customer?.email ?? null,
    first_name: query.customer?.firstName ?? null,
    last_name: query.customer?.lastName ?? null,
    terms: [...(query.terms ?? DEFAULT_TERMS)],
  };
}

export function mapToPrepareCartRequest(query: PrepareCartQuery): PrepareCartRequestApi {
  return {
    ...hostFieldsOf(query),
    b2b_user: mapActor(query),
    user: mapCustomer(query),
    ...(query.channel === undefined ? {} : { channel_id: query.channel }),
  };
}
