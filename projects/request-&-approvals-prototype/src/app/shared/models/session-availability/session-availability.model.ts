import moment from 'moment-timezone';

import { BookingQuestion } from '../booking-questions/booking-question.model';
import { NameData, TitleData } from '../data/data.model';
import { Money } from '../money.model';
import { SessionType, SessionTypeData } from '../session-type/session-type.model';
import { Seat, SeatData } from './seat.model';
import { SharedAvailabilityRule, SharedAvailabilityRuleData } from './shared-availability-rule.model';

export interface SessionAvailabilityData extends NameData<number>, TitleData {
  available_tickets: number;
  end_date: string;
  is_hidden: boolean;
  price: Money;
  purchasable_from_date: string | null;
  purchasable_until_date: string | null;
  sellable: boolean;
  start_date: string;
  tickets_allowed_per_booking: {
    maximum: number;
    minimum: number;
  };
  tickets_allowed_per_booking_excluding_availability?: {
    maximum: number;
    minimum: number;
  };
  booking_questions?: BookingQuestion[];
  details?: string;
  is_pack?: boolean;
  main_plan_id?: number;
  override_available_tickets?: number | null;
  shared_availability_footprint?: string[] | null;
  shared_availability_rule?: SharedAvailabilityRuleData | null;
  place_id?: number;
  seating?: SeatData;
  session_type?: SessionTypeData;
  strikethrough_price?: Money | null;
  surcharge_per_ticket?: Money;
}

export class SessionAvailability {
  constructor(
    public id: number,
    public name: string,
    public startsAt: string,
    public endsAt: string,
    public ticketPrice: Money | null,
    public isPurchasable: boolean,
    public availableTickets: number,
    public minimumTicketsAllowedPerBooking: number,
    public maximumTicketsAllowedPerBooking: number,
    public purchasableFromDate: string | null,
    public purchasableUntilDate: string | null,
    public isHidden: boolean,
    public surchargePerTicket?: Money,
    public seating?: Seat | null,
    public bookingQuestions?: BookingQuestion[],
    public minutesBeforeToExpire?: number,
    public sessionType?: SessionType,
    public details?: string,
    public mainPlanId?: number,
    public strikethroughPrice?: Money,
    public venueId?: number,
    public overrideAvailableTickets?: number,
    public ruleMaximumTicketsAllowedPerBooking?: number,
    public ruleMinimumTicketsAllowedPerBooking?: number,
    public isPack?: boolean,
  ) {}

  sharedAvailabilityRule?: SharedAvailabilityRule;

  static partySizeMinimumForSession(target: SessionAvailability, timeslotSessions: SessionAvailability[]): number {
    const rule = target.sharedAvailabilityRule;
    if (!rule) {
      return 0;
    }
    let minimum = 0;
    for (const itemType of rule.itemTypesSharingAvailabilityAllOf) {
      if (itemType.min <= 1) {
        continue;
      }
      const contributors = timeslotSessions.filter(session =>
        session.sharedAvailabilityRule?.itemTypesSharingAvailabilityAllOf.some(other => other.type === itemType.type),
      );
      if (contributors.length <= 1) {
        minimum = Math.max(minimum, itemType.min);
      }
    }
    return minimum;
  }

  getEffectiveAvailableTickets(canOverrideCapacity: boolean = false): number {
    if (!canOverrideCapacity || this.overrideAvailableTickets == null || this.overrideAvailableTickets <= 0) {
      return this.availableTickets;
    }

    return this.availableTickets + this.overrideAvailableTickets;
  }

  getMaximumSelectableTickets(canOverrideCapacity: boolean): number {
    const effectiveAvailableTickets = this.getEffectiveAvailableTickets(canOverrideCapacity);
    const shouldIgnoreMaximumPerBooking =
      canOverrideCapacity && !this.seating && this.overrideAvailableTickets != null && this.overrideAvailableTickets > 0;

    if (shouldIgnoreMaximumPerBooking) {
      return effectiveAvailableTickets;
    }
    if (this.seating) {
      return this.maximumTicketsAllowedPerBooking;
    }
    return Math.min(effectiveAvailableTickets, this.maximumTicketsAllowedPerBooking);
  }

  isDisabled(canOverrideCapacity: boolean = false, skipBookingLimitsValidation: boolean = false): boolean {
    if (this.seating) {
      return !this.isPurchasable || this.isSessionAboutToExpire();
    }

    const effectiveAvailableTickets = this.getEffectiveAvailableTickets(canOverrideCapacity);

    const value =
      !this.isPurchasable ||
      this.isSessionAboutToExpire() ||
      effectiveAvailableTickets === 0 ||
      (!skipBookingLimitsValidation && this.minimumTicketsAllowedPerBooking > effectiveAvailableTickets);

    return value;
  }

  isSessionAboutToExpire(): boolean {
    if (!this.purchasableUntilDate) {
      return false;
    }

    const maximumPurchaseDurationDate = moment().add(this.minutesBeforeToExpire ?? 0, 'minutes');
    return maximumPurchaseDurationDate.isAfter(moment(new Date(this.purchasableUntilDate)));
  }
}
