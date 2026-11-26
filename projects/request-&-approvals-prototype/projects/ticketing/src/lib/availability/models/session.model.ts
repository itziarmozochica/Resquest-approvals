import type { B2bPricing } from '../../core/models/money/b2b-pricing.model';
import type { Money } from '../../core/models/money/money.model';

export interface TicketsAllowed {
  readonly maximum: number;
  readonly minimum: number;
}

export interface Seating {
  readonly category: string;
  readonly poolId: number | null;
  readonly seats: readonly string[];
}

export type ReservationRestriction = 'none' | 'not_allowed';

export interface SessionTypeTag {
  readonly id: number;
  readonly tag: string;
}

export interface SessionType {
  readonly addOnCategory?: string;
  readonly addOnPricingType?: string;
  readonly allowedNumTickets: TicketsAllowed | null;
  // Tag palette token the backend resolves from the session type's tags, or `null`.
  readonly color: string | null;
  readonly id: number;
  readonly ignoreTimeSlotCapacity: boolean;
  readonly imageUrl: string | null;
  readonly isAddOn: boolean;
  readonly isPass: boolean;
  readonly isShopProduct: boolean;
  readonly isTimeless: boolean;
  readonly label: string | null;
  readonly reservationRestriction: ReservationRestriction | null;
  readonly sorting: number;
  readonly tags: readonly SessionTypeTag[];
  readonly ticketReceiptLabel: string | null;
  readonly ticketSelectorStepQuantity: number;
}

export interface BookingQuestion {
  readonly choices: readonly Readonly<Record<string, string>>[];
  readonly id: string;
  readonly label: string;
  readonly message: string;
  readonly type: string;
}

export interface SharedAvailabilityRuleItemType {
  readonly isCartWide: boolean;
  readonly max: number;
  readonly messageOnFailure: string | null;
  readonly messageOnFailureMin: string | null;
  readonly min: number;
  readonly quantityMultiplier: number | null;
  readonly type: string;
}

export interface SharedAvailabilityRule {
  readonly itemTypesSharingAvailabilityAllOf: readonly SharedAvailabilityRuleItemType[];
}

export interface SharedAvailabilityBudget {
  readonly max: number;
  readonly messageOnFailure: string | null;
}

export type SharedAvailabilityBudgets = ReadonlyMap<string, SharedAvailabilityBudget>;

export interface Session {
  readonly availableTickets: number;
  readonly b2bPricing: B2bPricing | null;
  readonly bookingQuestions: readonly BookingQuestion[];
  readonly details: string | null;
  readonly endsAt: string;
  readonly id: number;
  readonly isHidden: boolean;
  readonly isPack?: boolean;
  readonly isPurchasable: boolean;
  readonly mainPlanId: number | null;
  readonly name: string;
  readonly overrideAvailableTickets: number | null;
  readonly placeId: number | null;
  readonly purchasableFromDate: string | null;
  readonly purchasableUntilDate: string | null;
  readonly seating: Seating | null;
  readonly sessionType: SessionType | null;
  readonly sharedAvailabilityRule: SharedAvailabilityRule | null;
  readonly startsAt: string;
  readonly strikethroughPrice: Money | null;
  readonly surchargePerTicket: Money | null;
  readonly ticketPrice: Money | null;
  readonly ticketsAllowedPerBooking: TicketsAllowed;
  readonly ticketsAllowedPerBookingExcludingAvailability: TicketsAllowed | null;
  readonly title: string;
}
