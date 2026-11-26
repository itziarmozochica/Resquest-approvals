import { BookingQuestionTypeEnum } from '@fz-original/app/shared/models/booking-questions/booking-question-type.enum';
import { BookingQuestion } from '@fz-original/app/shared/models/booking-questions/booking-question.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { DateAvailability } from '@fz-original/app/shared/models/session-availability/date-availability.model';
import { RegularSessionAvailabilitySummaryByDate } from '@fz-original/app/shared/models/session-availability/regular-session-availability-summary-by-date.model';
import { Seat } from '@fz-original/app/shared/models/session-availability/seat.model';
import { SessionAvailabilitySummaryByDatetime } from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-datetime.model';
import { SessionAvailabilitySummary } from '@fz-original/app/shared/models/session-availability/session-availability-summary.model';
import { SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';
import { SharedAvailabilityRule } from '@fz-original/app/shared/models/session-availability/shared-availability-rule.model';
import { TimeRangeGroupingMode } from '@fz-original/app/shared/models/session-availability/time-range-section.util';
import { ReservationRestrictionEnum } from '@fz-original/app/shared/models/session-type/reservation-restriction.enum';
import { SessionType } from '@fz-original/app/shared/models/session-type/session-type.model';
import { ChannelService } from '@fz-original/app/shared/services/session-availability/channel.service';
import {
  DatesAvailability,
  DatesAvailabilityResponse,
} from '@fz-original/app/shared/services/session-availability/dates-availability.adapter';
import { isAddOnCategory } from '@fz-original/app/shared/services/sessions/add-on-category.enum';
import { sessionTypeTileColor } from '@fz-original/app/shared/tags/utils/session-type-tile-color.util';
import { Channel } from '@fz/channel';
import type {
  BookingQuestion as TicketingBookingQuestion,
  DateAvailability as TicketingDateAvailability,
  DaySummary as TicketingDaySummary,
  Session as TicketingSession,
  SessionAvailabilitySummary as TicketingSessionAvailabilitySummary,
  SharedAvailabilityRule as TicketingSharedAvailabilityRule,
  TimeslotSummary as TicketingTimeslotSummary,
} from '@fz/ticketing';

/**
 * Values the legacy pipeline took from the request/response envelope or from Optimizely, which the
 * library domain models do not carry. See the reverse-adapter section of `point-of-sale/AGENTS.md`.
 */
export interface PosLegacyAvailabilityContext {
  readonly canOverrideCapacity?: boolean;
  readonly channel?: Channel;
  readonly groupingMode?: TimeRangeGroupingMode;
  readonly minutesBeforeToExpire?: number;
  readonly overrideMaximumTickets?: number;
  readonly placeId?: number;
}

export function adaptLegacySessionAvailability(session: TicketingSession, context: PosLegacyAvailabilityContext = {}): SessionAvailability {
  const legacySession = new SessionAvailability(
    session.id,
    session.title,
    session.startsAt,
    session.endsAt,
    session.ticketPrice === null ? null : new Money(Number(session.ticketPrice.amount), session.ticketPrice.currency),
    session.isPurchasable,
    session.availableTickets,
    session.ticketsAllowedPerBooking.minimum,
    resolveMaximumTicketsAllowedPerBooking(session, context),
    session.purchasableFromDate,
    session.purchasableUntilDate,
    session.isHidden,
    session.surchargePerTicket === null
      ? undefined
      : new Money(Number(session.surchargePerTicket.amount), session.surchargePerTicket.currency),
    session.seating === null ? null : new Seat(session.seating.category, [], session.seating.poolId),
    adaptLegacyBookingQuestions(session.bookingQuestions),
    context.minutesBeforeToExpire ? context.minutesBeforeToExpire : undefined,
    adaptLegacySessionType(session),
    session.details ?? undefined,
    session.mainPlanId ?? undefined,
    session.strikethroughPrice === null
      ? undefined
      : new Money(Number(session.strikethroughPrice.amount), session.strikethroughPrice.currency),
    context.placeId,
    session.overrideAvailableTickets ?? undefined,
    session.ticketsAllowedPerBookingExcludingAvailability?.maximum,
    session.ticketsAllowedPerBookingExcludingAvailability?.minimum,
    session.isPack,
  );

  legacySession.sharedAvailabilityRule = adaptLegacySharedAvailabilityRule(session.sharedAvailabilityRule);

  return legacySession;
}

export function adaptLegacyTimeslot(
  timeslot: TicketingTimeslotSummary,
  context: PosLegacyAvailabilityContext = {},
): SessionAvailabilitySummaryByDatetime {
  return new SessionAvailabilitySummaryByDatetime(
    timeslot.datetime,
    timeslot.sessions.map(session => adaptLegacySessionAvailability(session, context)),
    timeslot.capacity ?? undefined,
    timeslot.overrideCapacity ?? undefined,
    context.canOverrideCapacity ?? false,
  );
}

export function adaptLegacyDaySummary(
  daySummary: TicketingDaySummary,
  timezone: string,
  context: PosLegacyAvailabilityContext = {},
): RegularSessionAvailabilitySummaryByDate {
  return new RegularSessionAvailabilitySummaryByDate(
    daySummary.date,
    timezone,
    daySummary.timeslots.map(timeslot => adaptLegacyTimeslot(timeslot, context)),
    context.placeId ?? null,
    context.groupingMode ?? 'legacy',
  );
}

/**
 * `daySummaries` is passed separately and always as an ordered array: the store keeps day summaries
 * in a record, whose key order must never decide what the operator sees.
 */
export function adaptLegacySummary(
  summary: TicketingSessionAvailabilitySummary,
  daySummaries: readonly TicketingDaySummary[],
  context: PosLegacyAvailabilityContext = {},
): SessionAvailabilitySummary {
  return new SessionAvailabilitySummary(
    summary.timezone,
    summary.allowMultiSessionPurchase && !hasSessionsWithSeating(daySummaries),
    summary.hasExplodePipe,
    daySummaries.map(daySummary => adaptLegacyDaySummary(daySummary, summary.timezone, context)),
    // Legacy declares both fields as `string` while the wire — and every legacy reader — tolerates nullish.
    summary.nextAvailableDate as unknown as string,
    summary.sessionSelectorType as unknown as string,
    summary.productSummaries.map(session => adaptLegacySessionAvailability(session, context)),
  );
}

/** Ordered array for the same reason as `adaptLegacySummary`: the legacy `Map` keeps payload order. */
export function adaptLegacyDates(dates: readonly TicketingDateAvailability[], nextAvailableDate: string | null): DatesAvailabilityResponse {
  const legacyDates: DatesAvailability = new Map();

  for (const date of dates) {
    legacyDates.set(date.date, new DateAvailability(date.date, date.isPurchasable));
  }

  return { dates: legacyDates, nextAvailableDate: nextAvailableDate as unknown as string };
}

function adaptLegacyBookingQuestions(bookingQuestions: readonly TicketingBookingQuestion[]): BookingQuestion[] | undefined {
  if (bookingQuestions.length === 0) {
    return undefined;
  }

  return bookingQuestions.map(
    bookingQuestion =>
      new BookingQuestion(
        bookingQuestion.id,
        bookingQuestion.label,
        bookingQuestion.message,
        bookingQuestion.type as BookingQuestionTypeEnum,
        bookingQuestion.choices.length === 0 ? undefined : [...bookingQuestion.choices],
      ),
  );
}

function adaptLegacySessionType(session: TicketingSession): SessionType | undefined {
  const sessionType = session.sessionType;

  if (sessionType === null) {
    return undefined;
  }

  const legacySessionType = new SessionType(
    sessionType.id,
    sessionType.label ?? undefined,
    sessionType.isPass,
    sessionType.isAddOn,
    (sessionType.reservationRestriction ?? undefined) as ReservationRestrictionEnum | undefined,
    sessionType.ticketReceiptLabel ?? undefined,
    sessionType.ignoreTimeSlotCapacity,
    sessionType.allowedNumTickets?.minimum,
    sessionType.allowedNumTickets?.maximum,
    sessionType.isShopProduct,
    undefined,
    sessionType.ticketSelectorStepQuantity,
    sessionType.isTimeless,
    sessionType.imageUrl ?? undefined,
    sessionTypeTileColor(sessionType.color) ?? undefined,
  );
  if (sessionType.addOnPricingType !== undefined) {
    legacySessionType.addOnConfiguration = {
      category: isAddOnCategory(sessionType.addOnCategory) ? sessionType.addOnCategory : undefined,
      pricingType: sessionType.addOnPricingType,
    };
  }

  return legacySessionType;
}

function adaptLegacySharedAvailabilityRule(rule: TicketingSharedAvailabilityRule | null): SharedAvailabilityRule | undefined {
  if (rule === null) {
    return undefined;
  }

  return {
    itemTypesSharingAvailabilityAllOf: rule.itemTypesSharingAvailabilityAllOf.map(itemType => ({
      isCartWide: itemType.isCartWide,
      max: itemType.max,
      messageOnFailure: itemType.messageOnFailure,
      messageOnFailureMin: itemType.messageOnFailureMin,
      min: itemType.min,
      quantityMultiplier: itemType.quantityMultiplier ?? undefined,
      type: itemType.type,
    })),
  };
}

function hasSessionsWithSeating(daySummaries: readonly TicketingDaySummary[]): boolean {
  return daySummaries.some(daySummary =>
    daySummary.timeslots.some(timeslot => timeslot.sessions.some(session => session.seating !== null)),
  );
}

function resolveMaximumTicketsAllowedPerBooking(session: TicketingSession, context: PosLegacyAvailabilityContext): number {
  const { maximum, minimum } = session.ticketsAllowedPerBooking;
  const overrideMaximumTickets = context.overrideMaximumTickets;

  if (maximum === minimum) {
    return maximum;
  }

  if (overrideMaximumTickets === undefined) {
    return maximum;
  }

  // Only invitations may exceed the maximum; the backend rejects the rest at checkout (B2BO-8294).
  if (context.channel !== undefined && ChannelService.isInvitation(context.channel)) {
    return overrideMaximumTickets;
  }

  return Math.min(overrideMaximumTickets, maximum);
}
