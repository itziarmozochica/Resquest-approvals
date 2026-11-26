export interface SharedAvailabilityItemTypeRule {
  readonly min: number;
  readonly type: string;
}

export interface SharedAvailabilityRuleHolder {
  readonly sharedAvailabilityRule: {
    readonly itemTypesSharingAvailabilityAllOf: readonly SharedAvailabilityItemTypeRule[];
  } | null;
}

/**
 * The party-size floor a session carries from its shared-availability rule, across the timeslot it
 * sits in. Port of the Point of Sale rule: an item type's `min` only binds when no other session of
 * the timeslot shares that type, and a `min` of one or less never binds.
 */
export function partySizeMinimumForSession(
  target: SharedAvailabilityRuleHolder,
  timeslotSessions: readonly SharedAvailabilityRuleHolder[],
): number {
  const rule = target.sharedAvailabilityRule;

  if (rule === null) {
    return 0;
  }

  let minimum = 0;

  for (const itemType of rule.itemTypesSharingAvailabilityAllOf) {
    const contributors = timeslotSessions.filter(session =>
      session.sharedAvailabilityRule?.itemTypesSharingAvailabilityAllOf.some(other => other.type === itemType.type),
    );

    if (itemType.min > 1 && contributors.length <= 1) {
      minimum = Math.max(minimum, itemType.min);
    }
  }

  return minimum;
}
