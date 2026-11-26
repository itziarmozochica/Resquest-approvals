/**
 * Party-size / shared-availability rule attached to a session, mirroring the contract the
 * marketplace already consumes (GAME-795). Each entry's `type` is the shared GROUP key — an opaque
 * string the backend assigns to the thing whose availability is shared, e.g. `"a-16"` (asset 16) or
 * `"stg_ts-<uuid>"` (a session-type group). Every session belonging to a group carries an entry with
 * that same `type`, and the group total = the sum of the selected units of every session referencing
 * it. `min`/`max` are the GROUP bounds, both enforced at cart level (GAME-824). An unbounded `max`
 * is serialized as INT32_MAX, so it never produces a violation.
 *
 * A session also occupies its assets at instants beyond the one it starts in (GAME-1451). Those are
 * carried by `shared_availability_footprint`, a list of keys whose budgets travel once per response
 * in `shared_availability_budgets`. Footprint keys are adapted into extra item types flagged
 * `isCartWide`: they are summed across the WHOLE cart, because the key names an absolute instant,
 * while every other key keeps its per-cart-datetime bucket. Block membership is the test — never the
 * key's prefix, which stays opaque. No block in the response means no cart-wide key, which is
 * today's behaviour everywhere.
 */

export interface SharedAvailabilityRuleItemTypeData {
  type: string;
  min: number;
  max: number;
  quantity_multiplier?: number;
  message_on_failure?: string | null;
  message_on_failure_min?: string | null;
}

export interface SharedAvailabilityRuleData {
  item_types_sharing_availability_all_of: SharedAvailabilityRuleItemTypeData[];
}

export interface SharedAvailabilityBudgetData {
  max: number;
  message_on_failure?: string | null;
}

export type SharedAvailabilityBudgetsData = Record<string, SharedAvailabilityBudgetData>;

export interface SharedAvailabilityRuleItemType {
  type: string;
  min: number;
  max: number;
  isCartWide?: boolean;
  quantityMultiplier?: number;
  messageOnFailure?: string | null;
  messageOnFailureMin?: string | null;
}

export interface SharedAvailabilityRule {
  itemTypesSharingAvailabilityAllOf: SharedAvailabilityRuleItemType[];
}

export interface SharedAvailabilityBudget {
  max: number;
  messageOnFailure?: string | null;
}

export type SharedAvailabilityBudgets = ReadonlyMap<string, SharedAvailabilityBudget>;

export type SharedAvailabilityKeyScope = 'bucketed' | 'cartWide';

export function isInScope(itemType: SharedAvailabilityRuleItemType, scope?: SharedAvailabilityKeyScope): boolean {
  if (scope === undefined) {
    return true;
  }
  return scope === (itemType.isCartWide === true ? 'cartWide' : 'bucketed');
}

/**
 * The same cart-wide key can arrive from several availability responses with different maxes — they
 * are snapshots of one `(asset set, instant)` quantity, differing by staleness or by reschedule
 * credit, never by rule. The largest wins: too large costs a late failure at cart block, too small
 * refuses a sale. Resolved once so the stepper clamp and the Continue gate cannot disagree.
 */
export function resolveCartWideMaxByKey(itemTypes: Iterable<SharedAvailabilityRuleItemType>): Map<string, number> {
  const maxByKey = new Map<string, number>();
  for (const itemType of itemTypes) {
    if (itemType.isCartWide !== true) {
      continue;
    }
    const currentMax = maxByKey.get(itemType.type);
    if (currentMax === undefined || itemType.max > currentMax) {
      maxByKey.set(itemType.type, itemType.max);
    }
  }
  return maxByKey;
}

export function itemTypesOf(rules: Iterable<SharedAvailabilityRule | undefined>): SharedAvailabilityRuleItemType[] {
  const itemTypes: SharedAvailabilityRuleItemType[] = [];
  for (const rule of rules) {
    if (rule !== undefined) {
      itemTypes.push(...rule.itemTypesSharingAvailabilityAllOf);
    }
  }
  return itemTypes;
}
