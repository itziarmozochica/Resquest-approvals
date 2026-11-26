import { BookingQuestion } from '@fz-original/app/shared/models/booking-questions/booking-question.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { Seat } from '@fz-original/app/shared/models/session-availability/seat.model';
import {
  SessionAvailability,
  SessionAvailabilityData,
} from '@fz-original/app/shared/models/session-availability/session-availability.model';
import { SessionType } from '@fz-original/app/shared/models/session-type/session-type.model';

export type OssSessionAvailabilityDto = SessionAvailabilityData;

export class OssSessionAvailability extends SessionAvailability {
  explodePipeLevelSeparator = ' | ';
  isUnavailable = false;

  constructor(
    id: number,
    name: string,
    startsAt: string,
    endsAt: string,
    ticketPrice: Money | null,
    isPurchasable: boolean,
    availableTickets: number,
    minimumTicketsAllowedPerBooking: number,
    maximumTicketsAllowedPerBooking: number,
    purchasableFromDate: string | null,
    purchasableUntilDate: string | null,
    isHidden: boolean,
    surchargePerTicket?: Money,
    seating?: Seat | null,
    bookingQuestions?: BookingQuestion[] | null,
    minutesBeforeToExpire?: number | null,
    sessionType?: SessionType,
    details?: string | null,
    mainPlanId?: number,
    placeId?: number,
  ) {
    super(
      id,
      name,
      startsAt,
      endsAt,
      ticketPrice,
      isPurchasable,
      availableTickets,
      minimumTicketsAllowedPerBooking,
      maximumTicketsAllowedPerBooking,
      purchasableFromDate,
      purchasableUntilDate,
      isHidden,
      surchargePerTicket,
      seating,
      bookingQuestions ?? undefined,
      minutesBeforeToExpire ?? undefined,
      sessionType,
      details ?? undefined,
      mainPlanId,
      undefined,
      placeId,
    );
  }

  clone(): OssSessionAvailability {
    const cloned = new OssSessionAvailability(
      this.id,
      this.name,
      this.startsAt,
      this.endsAt,
      this.ticketPrice,
      this.isPurchasable,
      this.availableTickets,
      this.minimumTicketsAllowedPerBooking,
      this.maximumTicketsAllowedPerBooking,
      this.purchasableFromDate,
      this.purchasableUntilDate,
      this.isHidden,
      this.surchargePerTicket,
      this.seating,
      this.bookingQuestions ?? undefined,
      this.minutesBeforeToExpire ?? undefined,
      this.sessionType,
      this.details ?? undefined,
      this.mainPlanId,
      this.venueId,
    );
    cloned.isUnavailable = this.isUnavailable;
    cloned.explodePipeLevelSeparator = this.explodePipeLevelSeparator;
    return cloned;
  }

  getDisplayName(withExplodePipe: boolean, place: string | null = null): string | undefined {
    // TODO change this to extra info place name to append with the pipe separator
    if (withExplodePipe) {
      return `${this.name} ${this.explodePipeLevelSeparator} ${place ?? ''}`.trim();
    }
    return this.name;
  }
}
