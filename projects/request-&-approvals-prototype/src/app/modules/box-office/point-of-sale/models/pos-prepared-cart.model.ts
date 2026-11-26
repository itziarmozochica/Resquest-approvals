import { Observable } from 'rxjs';

/** The step of the sale a cart prepared ahead of the payment has reached (B2BO-9578). */
export enum PosPreparedCartStep {
  BOOKING_QUESTIONS = 'bookingQuestions',
  CASH_CALCULATOR = 'cashCalculator',
  CHECKOUT_MODAL = 'checkoutModal',
}

/** Why a prepared cart was replaced before its payment started. */
export enum PosPreparedCartReleaseReason {
  BASKET_EXPIRED = 'basketExpired',
  CASH_CALCULATOR_DISMISSED = 'cashCalculatorDismissed',
  CHECKOUT_CANCELLED = 'checkoutCancelled',
  ERROR = 'error',
  QUESTIONS_CLOSED = 'questionsClosed',
}

/** A sale that ends without an error left the prepared cart at the step it had reached. */
export const POS_PREPARED_CART_RELEASE_REASON_BY_STEP: Readonly<Record<PosPreparedCartStep, PosPreparedCartReleaseReason>> = {
  [PosPreparedCartStep.BOOKING_QUESTIONS]: PosPreparedCartReleaseReason.QUESTIONS_CLOSED,
  [PosPreparedCartStep.CASH_CALCULATOR]: PosPreparedCartReleaseReason.CASH_CALCULATOR_DISMISSED,
  [PosPreparedCartStep.CHECKOUT_MODAL]: PosPreparedCartReleaseReason.CHECKOUT_CANCELLED,
};

/** How the prepared cart was replaced by an unprepared one. */
export enum PosPreparedCartReplacement {
  /** Discarded, then created again from the same lines, with its coupons re-applied. */
  DISCARD_AND_RECREATE = 'discardAndRecreate',
  /** Real-time seating: never discarded (that empties the OneBox basket), a new create takes the basket over. */
  SUPERSEDE = 'supersede',
  /** Real-time seating whose basket expired: the selection is forgotten, nothing is created from it. */
  SUPERSEDE_WITHOUT_RECREATE = 'supersedeWithoutRecreate',
}

export interface PosPreparedCartReplaced {
  /** `false` when a coupon of the prepared cart could not be applied to the new one; the coupon error shows it. */
  couponsReapplied: boolean;
  replacement: PosPreparedCartReplacement;
}

/** Replaces the prepared cart; the pay pipeline owns how, since it owns the recreate with coupons. */
export type PosPreparedCartReplacer = (reason: PosPreparedCartReleaseReason) => Observable<PosPreparedCartReplaced>;

/** The booking questions of a cart prepared ahead of the payment could not be read: the sale stops before it is charged. */
export class PreparedCartBookingQuestionsUnreadableError extends Error {
  constructor(messageKey: string) {
    super(messageKey);
    this.name = 'PreparedCartBookingQuestionsUnreadableError';
  }
}
