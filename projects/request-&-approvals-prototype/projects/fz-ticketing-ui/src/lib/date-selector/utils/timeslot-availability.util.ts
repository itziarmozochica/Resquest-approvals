import {
  getEffectiveAvailableTickets,
  getMaximumSelectableTickets,
  isSessionAboutToExpire,
  isSessionDisabled,
  MaxLimitTicketField,
  type DaySummary,
  type Session,
  type TimeslotSummary,
} from '@fz/ticketing';

export { getEffectiveAvailableTickets, getMaximumSelectableTickets, isSessionAboutToExpire, isSessionDisabled };

export interface FztAvailabilityParams {
  /** Legacy `allowMultiTimeSlot`, which feeds the model parameter `skipCapacityValidation` — one value, two names. */
  readonly allowMultiTimeSlot: boolean;
  readonly canOverrideCapacity: boolean;
  readonly maxLimitField: MaxLimitTicketField;
  readonly minutesBeforeToExpire: number;
  readonly ongoingTicketTypeNames: ReadonlySet<string>;
  readonly skipBookingLimitsValidation: boolean;
  readonly ticketTypes: ReadonlyMap<string, number>;
  readonly now?: number;
}

/** Every session of the slot reached its `purchasable_until_date`, so the backend would no longer return it. */
export function isTimeslotExpired(timeslot: TimeslotSummary, params: FztAvailabilityParams): boolean {
  const now = params.now ?? Date.now();

  return (
    timeslot.sessions.length > 0 && timeslot.sessions.every(session => isSessionAboutToExpire(session, params.minutesBeforeToExpire, now))
  );
}

// A name shared by several sessions takes the highest maximum: a sold-out twin never caps it (see AGENTS.md, availability quirks).
export function buildMaxAvailabilityByTicketType(sessions: readonly Session[], canOverrideCapacity: boolean): ReadonlyMap<string, number> {
  return buildAvailabilityByTicketType(sessions, session => getMaximumSelectableTickets(session, canOverrideCapacity), Math.max);
}

export function buildMinAvailabilityByTicketType(sessions: readonly Session[]): ReadonlyMap<string, number> {
  return buildAvailabilityByTicketType(sessions, session => session.ticketsAllowedPerBooking.minimum, Math.min);
}

export function isTicketTypePresentInTimeslot(timeslot: TimeslotSummary, ticketTypes: ReadonlyMap<string, number>): boolean {
  return timeslot.sessions.some(session =>
    ticketTypeKeys(session).some(key => {
      const quantity = ticketTypes.get(key);

      return quantity !== undefined && quantity !== 0;
    }),
  );
}

export function isTimeslotAvailable(timeslot: TimeslotSummary, params: FztAvailabilityParams): boolean {
  if (!hasSelectableEntrySession(timeslot, params)) {
    return false;
  }

  if (params.allowMultiTimeSlot) {
    return true;
  }

  if (params.ticketTypes.size === 0) {
    return true;
  }

  const check: TicketTypeCheck = {
    maxAvailabilityByTicketType: buildMaxAvailabilityByTicketType(timeslot.sessions, params.canOverrideCapacity),
    minAvailabilityByTicketType: buildMinAvailabilityByTicketType(timeslot.sessions),
    params,
    timeslot,
  };

  return [...params.ticketTypes].every(([ticketTypeName, quantity]) => isTicketTypeSatisfied(check, ticketTypeName, quantity));
}

/** What makes an hour tile clickable: available for the cart, or carrying none of the selected ticket types at all. */
export function isTimeslotSelectable(timeslot: TimeslotSummary, params: FztAvailabilityParams): boolean {
  return isTimeslotAvailable(timeslot, params) || !isTicketTypePresentInTimeslot(timeslot, params.ticketTypes);
}

export function isDaySummaryAvailable(daySummary: DaySummary, params: FztAvailabilityParams): boolean {
  return daySummary.timeslots.some(timeslot => isTimeslotAvailable(timeslot, params));
}

interface TicketTypeCheck {
  readonly maxAvailabilityByTicketType: ReadonlyMap<string, number>;
  readonly minAvailabilityByTicketType: ReadonlyMap<string, number>;
  readonly params: FztAvailabilityParams;
  readonly timeslot: TimeslotSummary;
}

function isTicketTypeSatisfied(check: TicketTypeCheck, ticketTypeName: string, quantity: number): boolean {
  if (quantity === 0) {
    return true;
  }

  const { params } = check;
  const session = findSessionByTicketType(check.timeslot, ticketTypeName, params.canOverrideCapacity);

  // A ticket type that is not sold in this slot but is an ongoing multi-day selection must not grey the slot out.
  if (session === undefined && params.ongoingTicketTypeNames.has(ticketTypeName)) {
    return true;
  }

  const hasSeating = session !== undefined && session.seating !== null;

  if (params.skipBookingLimitsValidation) {
    const stockAvailable = session === undefined ? 0 : getEffectiveAvailableTickets(session, params.canOverrideCapacity);

    return hasSeating || stockAvailable >= quantity;
  }

  const maxLimit = resolveMaxLimit(ticketTypeName, session, params, check.maxAvailabilityByTicketType);

  if (maxLimit === 0 || maxLimit < quantity) {
    return false;
  }

  if (hasSeating) {
    return true;
  }

  const minAvailability = check.minAvailabilityByTicketType.get(ticketTypeName);

  return minAvailability === undefined || minAvailability <= quantity;
}

function buildAvailabilityByTicketType(
  sessions: readonly Session[],
  valueOf: (session: Session) => number,
  pick: (current: number, value: number) => number,
): ReadonlyMap<string, number> {
  const byTicketType = new Map<string, number>();

  for (const session of sessions) {
    const value = valueOf(session);

    for (const key of ticketTypeKeys(session)) {
      const current = byTicketType.get(key);

      byTicketType.set(key, current === undefined ? value : pick(current, value));
    }
  }

  return byTicketType;
}

// Same-name sessions resolve to the best-stocked one, never to a sold-out twin that comes first (see AGENTS.md, availability quirks).
function findSessionByTicketType(timeslot: TimeslotSummary, ticketTypeName: string, canOverrideCapacity: boolean): Session | undefined {
  const candidates = timeslot.sessions.filter(session => sessionMatchesTicketType(session, ticketTypeName));

  return candidates.reduce<Session | undefined>(
    (best, session) =>
      best === undefined ||
      getEffectiveAvailableTickets(session, canOverrideCapacity) > getEffectiveAvailableTickets(best, canOverrideCapacity)
        ? session
        : best,
    undefined,
  );
}

function hasSelectableEntrySession(timeslot: TimeslotSummary, params: FztAvailabilityParams): boolean {
  const entrySessions = timeslot.sessions.filter(session => session.sessionType?.isAddOn !== true);
  const sessionsToCheck = entrySessions.length > 0 ? entrySessions : timeslot.sessions;

  return sessionsToCheck.some(session => !isSessionDisabled(session, params));
}

function resolveMaxLimit(
  ticketTypeName: string,
  session: Session | undefined,
  params: FztAvailabilityParams,
  maxAvailabilityByTicketType: ReadonlyMap<string, number>,
): number {
  if (params.maxLimitField === MaxLimitTicketField.Maximum) {
    return maxAvailabilityByTicketType.get(ticketTypeName) ?? 0;
  }

  return session === undefined ? 0 : getEffectiveAvailableTickets(session, params.canOverrideCapacity);
}

/** Legacy `SessionAvailability.name` is the wire `title`; `@fz/ticketing` keeps both, so ticket types key off `title`. */
function ticketTypeKeys(session: Session): readonly string[] {
  const label = session.sessionType?.label;

  if (label === null || label === undefined || label.length === 0) {
    return [session.title];
  }

  return [session.title, label];
}

function sessionMatchesTicketType(session: Session, ticketTypeName: string): boolean {
  return ticketTypeKeys(session).includes(ticketTypeName);
}
