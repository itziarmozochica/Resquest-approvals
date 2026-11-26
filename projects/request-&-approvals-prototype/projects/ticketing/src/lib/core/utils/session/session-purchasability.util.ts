const MILLISECONDS_PER_MINUTE = 60 * 1000;

export interface SessionCapacity {
  readonly availableTickets: number;
  readonly overrideAvailableTickets: number | null;
  readonly seating: unknown;
  readonly ticketsAllowedPerBooking: { readonly maximum: number; readonly minimum: number };
}

export interface SessionPurchasability extends SessionCapacity {
  readonly isPurchasable: boolean;
  readonly purchasableUntilDate: string | null;
}

export interface SessionDisabledParams {
  readonly canOverrideCapacity: boolean;
  readonly minutesBeforeToExpire: number;
  readonly skipBookingLimitsValidation: boolean;
  readonly now?: number;
}

export function getEffectiveAvailableTickets(session: SessionCapacity, canOverrideCapacity: boolean): number {
  const override = session.overrideAvailableTickets;

  if (!canOverrideCapacity || override === null || override <= 0) {
    return session.availableTickets;
  }

  return session.availableTickets + override;
}

export function getMaximumSelectableTickets(session: SessionCapacity, canOverrideCapacity: boolean): number {
  const effectiveAvailableTickets = getEffectiveAvailableTickets(session, canOverrideCapacity);
  const override = session.overrideAvailableTickets;
  const shouldIgnoreMaximumPerBooking = canOverrideCapacity && session.seating === null && override !== null && override > 0;

  if (shouldIgnoreMaximumPerBooking) {
    return effectiveAvailableTickets;
  }

  if (session.seating !== null) {
    return session.ticketsAllowedPerBooking.maximum;
  }

  return Math.min(effectiveAvailableTickets, session.ticketsAllowedPerBooking.maximum);
}

export function isSessionAboutToExpire(
  session: Pick<SessionPurchasability, 'purchasableUntilDate'>,
  minutesBeforeToExpire: number,
  now: number,
): boolean {
  const purchasableUntilDate = session.purchasableUntilDate;

  if (purchasableUntilDate === null || purchasableUntilDate.length === 0) {
    return false;
  }

  const purchasableUntilMs = Date.parse(purchasableUntilDate);

  if (Number.isNaN(purchasableUntilMs)) {
    return false;
  }

  return now + minutesBeforeToExpire * MILLISECONDS_PER_MINUTE > purchasableUntilMs;
}

export function isSessionDisabled(session: SessionPurchasability, params: SessionDisabledParams): boolean {
  const aboutToExpire = isSessionAboutToExpire(session, params.minutesBeforeToExpire, params.now ?? Date.now());

  if (session.seating !== null) {
    return !session.isPurchasable || aboutToExpire;
  }

  const effectiveAvailableTickets = getEffectiveAvailableTickets(session, params.canOverrideCapacity);

  return (
    !session.isPurchasable ||
    aboutToExpire ||
    effectiveAvailableTickets === 0 ||
    (!params.skipBookingLimitsValidation && session.ticketsAllowedPerBooking.minimum > effectiveAvailableTickets)
  );
}
