import { CartSession } from '../../models/cart/cart-session.model';
import {
  isInScope,
  itemTypesOf,
  resolveCartWideMaxByKey,
  SharedAvailabilityKeyScope,
  SharedAvailabilityRule,
  SharedAvailabilityRuleItemType,
} from '../../models/session-availability/shared-availability-rule.model';
import { normalizeCartDatetime, SessionCartContext } from './ticketing.utils';

export interface SharedAvailabilityGroupLimits {
  addableUnits: number;
  maxUnits: number;
}

export type SharedAvailabilityGroupLimitsScope = 'all' | 'cartWide' | 'none';

export interface CartWideGroupTotals {
  maxByGroupKey: ReadonlyMap<string, number>;
  unitsByGroupKey: ReadonlyMap<string, number>;
}

export function sumSelectedUnitsByGroupKey(cartSessions: Iterable<CartSession>, scope?: SharedAvailabilityKeyScope): Map<string, number> {
  const selectedUnitsByGroupKey = new Map<string, number>();
  for (const cartSession of cartSessions) {
    const rule = cartSession.sharedAvailabilityRule;
    if (rule === undefined || cartSession.units <= 0) {
      continue;
    }
    for (const itemType of rule.itemTypesSharingAvailabilityAllOf) {
      if (!isInScope(itemType, scope)) {
        continue;
      }
      const consumedUnits = cartSession.units * quantityMultiplierOf(itemType);
      selectedUnitsByGroupKey.set(itemType.type, (selectedUnitsByGroupKey.get(itemType.type) ?? 0) + consumedUnits);
    }
  }
  return selectedUnitsByGroupKey;
}

export function cartWideGroupTotals(cartSessions: Iterable<CartSession>): CartWideGroupTotals {
  const sessions = [...cartSessions];
  return {
    maxByGroupKey: resolveCartWideMaxByKey(itemTypesOf(sessions.map(cartSession => cartSession.sharedAvailabilityRule))),
    unitsByGroupKey: sumSelectedUnitsByGroupKey(sessions, 'cartWide'),
  };
}

export function groupLimitsForRule(
  rule: SharedAvailabilityRule | undefined,
  selectedUnitsByGroupKey: ReadonlyMap<string, number>,
  ownSelectedUnits: number,
  cartWideTotals?: CartWideGroupTotals,
  keyScope?: SharedAvailabilityKeyScope,
): SharedAvailabilityGroupLimits | undefined {
  if (rule === undefined) {
    return undefined;
  }
  let addableUnits: number | undefined = undefined;
  for (const itemType of rule.itemTypesSharingAvailabilityAllOf) {
    if (!isInScope(itemType, keyScope)) {
      continue;
    }
    const readsCartWideTotals = itemType.isCartWide === true && cartWideTotals !== undefined;
    const maxUnits = readsCartWideTotals ? Math.max(cartWideTotals.maxByGroupKey.get(itemType.type) ?? 0, itemType.max) : itemType.max;
    if (maxUnits <= 0) {
      continue;
    }
    const selectedUnits = readsCartWideTotals
      ? (cartWideTotals.unitsByGroupKey.get(itemType.type) ?? 0)
      : (selectedUnitsByGroupKey.get(itemType.type) ?? 0);
    const quantityMultiplier = quantityMultiplierOf(itemType);
    const remainingUnits = Math.max(0, maxUnits - selectedUnits);
    const addableUnitsForItemType = Math.floor(remainingUnits / quantityMultiplier);
    addableUnits = addableUnits === undefined ? addableUnitsForItemType : Math.min(addableUnits, addableUnitsForItemType);
  }
  if (addableUnits === undefined) {
    return undefined;
  }
  return { addableUnits, maxUnits: ownSelectedUnits + addableUnits };
}

export function buildGroupLimitsBySessionId(
  cartSessionsByDatetime: ReadonlyMap<string, CartSession[]>,
  sessionContextBySessionId: ReadonlyMap<number, SessionCartContext>,
  scope: SharedAvailabilityGroupLimitsScope = 'all',
  ownSelectedUnitsBySessionId?: ReadonlyMap<number, number>,
): Map<number, SharedAvailabilityGroupLimits> {
  if (scope === 'none') {
    return new Map<number, SharedAvailabilityGroupLimits>();
  }
  const keyScope: SharedAvailabilityKeyScope | undefined = scope === 'cartWide' ? 'cartWide' : undefined;
  const selectedUnitsByGroupKeyByDatetime = new Map<string, Map<string, number>>();
  const selectedUnitsBySessionId = new Map<number, number>();
  const allCartSessions: CartSession[] = [];
  for (const [datetime, cartSessions] of cartSessionsByDatetime) {
    if (datetime === 'products') {
      continue;
    }
    selectedUnitsByGroupKeyByDatetime.set(normalizeCartDatetime(datetime), sumSelectedUnitsByGroupKey(cartSessions, 'bucketed'));
    for (const cartSession of cartSessions) {
      allCartSessions.push(cartSession);
      if (cartSession.units > 0) {
        selectedUnitsBySessionId.set(cartSession.sessionId, (selectedUnitsBySessionId.get(cartSession.sessionId) ?? 0) + cartSession.units);
      }
    }
  }
  const cartWideTotals = cartWideGroupTotals(allCartSessions);

  const groupLimitsBySessionId = new Map<number, SharedAvailabilityGroupLimits>();
  for (const [sessionId, { datetime, session }] of sessionContextBySessionId) {
    const selectedUnitsByGroupKey = selectedUnitsByGroupKeyByDatetime.get(normalizeCartDatetime(datetime)) ?? new Map<string, number>();
    const groupLimits = groupLimitsForRule(
      session.sharedAvailabilityRule,
      selectedUnitsByGroupKey,
      (ownSelectedUnitsBySessionId ?? selectedUnitsBySessionId).get(sessionId) ?? 0,
      cartWideTotals,
      keyScope,
    );
    if (groupLimits !== undefined) {
      groupLimitsBySessionId.set(sessionId, groupLimits);
    }
  }
  return groupLimitsBySessionId;
}

export function areGroupLimitsEqual(
  someGroupLimits: ReadonlyMap<number, SharedAvailabilityGroupLimits>,
  otherGroupLimits: ReadonlyMap<number, SharedAvailabilityGroupLimits>,
): boolean {
  if (someGroupLimits.size !== otherGroupLimits.size) {
    return false;
  }
  for (const [sessionId, groupLimits] of someGroupLimits) {
    const otherLimits = otherGroupLimits.get(sessionId);
    if (otherLimits === undefined) {
      return false;
    }
    if (otherLimits.addableUnits !== groupLimits.addableUnits || otherLimits.maxUnits !== groupLimits.maxUnits) {
      return false;
    }
  }
  return true;
}

function quantityMultiplierOf(itemType: SharedAvailabilityRuleItemType): number {
  const quantityMultiplier = itemType.quantityMultiplier ?? 1;
  return quantityMultiplier > 0 ? quantityMultiplier : 1;
}
