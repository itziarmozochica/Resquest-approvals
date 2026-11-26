import { partySizeMinimumForSession } from '../../../core/utils/session/session-party-size.util';
import {
  getEffectiveAvailableTickets,
  getMaximumSelectableTickets,
  isSessionDisabled,
  type SessionDisabledParams,
} from '../../../core/utils/session/session-purchasability.util';
import { safeStepQuantity, stepAlignedMax } from '../../../core/utils/ticket-type/ticket-step.util';
import type {
  PartyFit,
  PartyFitParams,
  PartyMemberSessionOptions,
  PartyQuantities,
  PartySessionAllocationFit,
  PartySessionChoice,
  SessionAdditionStep,
  SessionQuantities,
  SharedAvailabilityViolation,
} from '../../models/party-members/party-members.model';
import type { TimeslotSummary } from '../../models/session-availability-summary.model';
import type { Session, SharedAvailabilityRuleItemType } from '../../models/session.model';
import { partyLeafKeyOfSession } from './party-hierarchy.util';
import { isPartyEligibleSession, partyMemberKeysOfSession } from './party-members.util';

type SessionAllocation = ReadonlyMap<Session, number>;

interface SharedAvailabilityBudget {
  max: number;
  maxItem: SharedAvailabilityRuleItemType;
  min: number;
  minItem: SharedAvailabilityRuleItemType;
  rawUnits: number;
  units: number;
}

export function fitPartyAtTimeslot(
  timeslot: TimeslotSummary,
  leafKey: string,
  party: PartyQuantities,
  params: PartyFitParams,
): PartyFit | null {
  return partySessionChoiceAt(timeslot, leafKey, party, params)?.fit ?? null;
}

export function partySessionChoiceAt(
  timeslot: TimeslotSummary,
  leafKey: string,
  party: PartyQuantities,
  params: PartyFitParams,
): PartySessionChoice | null {
  const requested = Object.entries(party).filter(([, quantity]: [string, number]) => quantity > 0);
  const candidates = timeslot.sessions.filter(
    (session: Session) => isPartyEligibleSession(session, params.timeZone) && partyLeafKeyOfSession(session) === leafKey,
  );

  if (requested.length === 0 || candidates.length === 0) {
    return null;
  }

  const sellable = candidates.filter((session: Session) => !isSessionDisabled(session, disabledParamsOf(params)));
  const memberSessionOptions = requested.map(
    ([memberKey, quantity]: [string, number]): PartyMemberSessionOptions => ({
      memberKey,
      quantity,
      sessions: sessionsForMember(sellable, memberKey),
    }),
  );
  const needsSessionChoice = memberSessionOptions.some((member: PartyMemberSessionOptions) => member.sessions.length > 1);
  const isEveryMemberServed = memberSessionOptions.every((member: PartyMemberSessionOptions) => member.sessions.length > 0);
  const defaultAllocation = allocate(
    memberSessionOptions,
    (member: PartyMemberSessionOptions) => member.sessions.at(0) ?? sessionsForMember(candidates, member.memberKey).at(0),
  );
  const defaultAllocationFits = isEveryMemberServed && isAllocationSelectable(timeslot, defaultAllocation, params);
  // A default that cannot seat the party (low stock on the standard session, a group minimum) must not grey a
  // start time whose other sessions can: the picker opens there, on the default, and the cashier moves off it.
  const isSelectable =
    defaultAllocationFits ||
    (needsSessionChoice &&
      isEveryMemberServed &&
      isAllocationSelectable(
        timeslot,
        allocate(memberSessionOptions, (member: PartyMemberSessionOptions) => sessionWithMostPlacesLeft(member.sessions, params)),
        params,
      ));
  const resolved = [...defaultAllocation.entries()];

  return {
    fit: {
      additionsBySessionId: quantitiesBySessionId(resolved, () => 0),
      isSelectable,
      needsSessionChoice,
      nextQuantitiesBySessionId: quantitiesBySessionId(resolved, (session: Session) => selectedQuantityOf(session, params)),
      startTime: timeslot.datetime,
      stock:
        resolved.length === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                sharedPlacesLeftOf(candidates, params),
                ...resolved.map(([session]: [Session, number]) => remainingTicketsOf(session, params)),
              ),
            ),
    },
    memberSessionOptions,
    timeslot,
  };
}

export function fitPartySessionAllocation(
  timeslot: TimeslotSummary,
  additionsBySessionId: SessionQuantities,
  params: PartyFitParams,
): PartySessionAllocationFit {
  const allocation: SessionAllocation = new Map(
    timeslot.sessions
      .map((session: Session): [Session, number] => [session, additionsBySessionId[session.id] ?? 0])
      .filter(([, addition]: [Session, number]) => addition > 0),
  );
  const resolved = [...allocation.entries()];
  const violations = sharedAvailabilityViolations(timeslot, allocation, params);
  const requestedCount = Object.values(additionsBySessionId).filter((addition: number) => addition > 0).length;

  return {
    isSelectable:
      resolved.length > 0 &&
      resolved.length === requestedCount &&
      resolved.every(([session]: [Session, number]) => !isSessionDisabled(session, disabledParamsOf(params))) &&
      fitsSessionsAndCapacity(timeslot, allocation, params) &&
      violations.length === 0,
    nextQuantitiesBySessionId: quantitiesBySessionId(resolved, (session: Session) => selectedQuantityOf(session, params)),
    violationMessage: violations.at(0)?.message ?? null,
  };
}

export function nextAllowedSessionAddition(
  { current, direction, session, timeslot }: SessionAdditionStep,
  params: PartyFitParams,
): number | null {
  const selected = selectedQuantityOf(session, params);
  const ceiling = remainingTicketsOf(session, params);
  const placesLeft = Math.max(ceiling, 0);
  const start = direction === 1 ? current + 1 : Math.min(current - 1, placesLeft);
  const highest = direction === 1 ? ceiling : start;

  for (let addition = start; addition >= 0 && addition <= highest; addition += direction) {
    if (addition === 0 || isSelectableQuantity(session, selected + addition, timeslot, params)) {
      return addition;
    }
  }

  return null;
}

export function remainingTicketsOf(session: Session, params: PartyFitParams): number {
  return getEffectiveAvailableTickets(session, params.canOverrideCapacity) - selectedQuantityOf(session, params);
}

// The ticket types of a tile at one start time (Adult, Kids...) usually share one capacity pool and each reports
// it whole, so the cart of every one of them draws on the places the tile has left.
function sharedPlacesLeftOf(sessions: readonly Session[], params: PartyFitParams): number {
  const placesLeft = Math.max(...sessions.map((session: Session) => getEffectiveAvailableTickets(session, params.canOverrideCapacity)));

  return sessions.reduce((left: number, session: Session) => left - selectedQuantityOf(session, params), placesLeft);
}

export function fitPartyAtLeaf(
  timeslots: readonly TimeslotSummary[],
  leafKey: string,
  party: PartyQuantities,
  params: PartyFitParams,
): readonly PartyFit[] {
  return timeslots
    .map((timeslot: TimeslotSummary) => fitPartyAtTimeslot(timeslot, leafKey, party, params))
    .filter((fit: PartyFit | null): fit is PartyFit => fit !== null);
}

function sessionsForMember(sessions: readonly Session[], memberKey: string): readonly Session[] {
  return sessions
    .filter((session: Session) => partyMemberKeysOfSession(session).includes(memberKey))
    .sort((first: Session, second: Session) => ticketTypeSortingOf(first) - ticketTypeSortingOf(second));
}

function ticketTypeSortingOf(session: Session): number {
  return session.sessionType?.sorting ?? 0;
}

function sessionWithMostPlacesLeft(sessions: readonly Session[], params: PartyFitParams): Session | undefined {
  return sessions.reduce<Session | undefined>(
    (best: Session | undefined, session: Session) =>
      best === undefined || remainingTicketsOf(session, params) > remainingTicketsOf(best, params) ? session : best,
    undefined,
  );
}

function allocate(
  memberSessionOptions: readonly PartyMemberSessionOptions[],
  sessionOf: (member: PartyMemberSessionOptions) => Session | undefined,
): SessionAllocation {
  const allocation = new Map<Session, number>();

  for (const member of memberSessionOptions) {
    const session = sessionOf(member);

    if (session !== undefined) {
      allocation.set(session, (allocation.get(session) ?? 0) + member.quantity);
    }
  }

  return allocation;
}

function quantitiesBySessionId(resolved: readonly (readonly [Session, number])[], baseOf: (session: Session) => number): SessionQuantities {
  return Object.fromEntries(resolved.map(([session, addition]: readonly [Session, number]) => [session.id, baseOf(session) + addition]));
}

function isAllocationSelectable(timeslot: TimeslotSummary, allocation: SessionAllocation, params: PartyFitParams): boolean {
  return fitsSessionsAndCapacity(timeslot, allocation, params) && sharedAvailabilityViolations(timeslot, allocation, params).length === 0;
}

function fitsSessionsAndCapacity(timeslot: TimeslotSummary, allocation: SessionAllocation, params: PartyFitParams): boolean {
  return (
    [...allocation.entries()].every(([session, addition]: [Session, number]) =>
      isSelectableQuantity(session, selectedQuantityOf(session, params) + addition, timeslot, params),
    ) && fitsTimeslotCapacity(timeslot, allocation, params)
  );
}

function disabledParamsOf(params: PartyFitParams): SessionDisabledParams {
  return {
    canOverrideCapacity: params.canOverrideCapacity,
    minutesBeforeToExpire: params.minutesBeforeToExpire,
    now: params.now,
    skipBookingLimitsValidation: false,
  };
}

function isSelectableQuantity(session: Session, quantity: number, timeslot: TimeslotSummary, params: PartyFitParams): boolean {
  const minimum = Math.max(session.ticketsAllowedPerBooking.minimum, partySizeMinimumForSession(session, timeslot.sessions));
  const step = safeStepQuantity(session.sessionType?.ticketSelectorStepQuantity);
  const maximum = stepAlignedMax(minimum, getMaximumSelectableTickets(session, params.canOverrideCapacity), step);

  return quantity >= minimum && quantity <= maximum && (quantity - minimum) % step === 0;
}

function fitsTimeslotCapacity(timeslot: TimeslotSummary, allocation: SessionAllocation, params: PartyFitParams): boolean {
  if (!params.includeTimeSlotCapacity || timeslot.capacity === null) {
    return true;
  }

  const effectiveCapacity =
    timeslot.capacity + (params.canOverrideCapacity && timeslot.overrideCapacity !== null ? timeslot.overrideCapacity : 0);
  const alreadySelected = timeslot.sessions
    .filter(countsTowardTimeslotCapacity)
    .reduce((total: number, session: Session) => total + selectedQuantityOf(session, params), 0);
  const added = [...allocation.entries()]
    .filter(([session]: [Session, number]) => countsTowardTimeslotCapacity(session))
    .reduce((total: number, [, addition]: [Session, number]) => total + addition, 0);

  return alreadySelected + added <= effectiveCapacity;
}

function sharedAvailabilityViolations(
  timeslot: TimeslotSummary,
  allocation: SessionAllocation,
  params: PartyFitParams,
): readonly SharedAvailabilityViolation[] {
  const budgets = new Map<string, SharedAvailabilityBudget>();

  for (const session of timeslot.sessions) {
    const quantity = selectedQuantityOf(session, params) + (allocation.get(session) ?? 0);

    for (const item of session.sharedAvailabilityRule?.itemTypesSharingAvailabilityAllOf ?? []) {
      const budget = budgets.get(item.type);
      const max = item.max > 0 ? item.max : Number.POSITIVE_INFINITY;
      // A cart-wide key is one asset-and-instant quantity that several sessions report with maxes differing by
      // staleness, never by rule, so the largest wins (the cart gate's resolveCartWideMaxByKey). It has no minimum.
      const min = item.isCartWide ? 0 : item.min;
      const rawUnits = item.isCartWide ? 0 : quantity;
      const units = quantity * quantityMultiplierOf(item);

      if (budget === undefined) {
        budgets.set(item.type, { max, maxItem: item, min, minItem: item, rawUnits, units });
      } else {
        mergeIntoBudget(budget, item, { max, min, rawUnits, units });
      }
    }
  }

  const touchedTypes = new Set(
    [...allocation.keys()].flatMap((session: Session) =>
      (session.sharedAvailabilityRule?.itemTypesSharingAvailabilityAllOf ?? []).map((item: SharedAvailabilityRuleItemType) => item.type),
    ),
  );

  return [...touchedTypes].flatMap((type: string): SharedAvailabilityViolation[] => {
    const budget = budgets.get(type);

    if (budget === undefined) {
      return [];
    }

    if (budget.units > budget.max) {
      return [{ message: budget.maxItem.messageOnFailure, type }];
    }

    if (budget.min > 1 && budget.rawUnits > 0 && budget.rawUnits < budget.min) {
      return [{ message: budget.minItem.messageOnFailureMin ?? budget.minItem.messageOnFailure, type }];
    }

    return [];
  });
}

function mergeIntoBudget(
  budget: SharedAvailabilityBudget,
  item: SharedAvailabilityRuleItemType,
  { max, min, rawUnits, units }: Pick<SharedAvailabilityBudget, 'max' | 'min' | 'rawUnits' | 'units'>,
): void {
  if (item.isCartWide ? max > budget.max : max < budget.max) {
    budget.max = max;
    budget.maxItem = item;
  }

  if (min > budget.min) {
    budget.min = min;
    budget.minItem = item;
  }

  budget.rawUnits += rawUnits;
  budget.units += units;
}

function quantityMultiplierOf(item: SharedAvailabilityRuleItemType): number {
  const quantityMultiplier = item.quantityMultiplier ?? 1;

  return quantityMultiplier > 0 ? quantityMultiplier : 1;
}

function countsTowardTimeslotCapacity(session: Session): boolean {
  return session.sessionType?.ignoreTimeSlotCapacity !== true;
}

function selectedQuantityOf(session: Session, params: PartyFitParams): number {
  return params.selectedQuantities[session.id] ?? 0;
}
