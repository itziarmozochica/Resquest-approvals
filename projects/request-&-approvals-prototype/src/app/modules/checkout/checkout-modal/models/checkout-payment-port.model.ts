import { InjectionToken } from '@angular/core';

import type { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import type { Observable } from 'rxjs';

import type { CheckoutPaymentLinkRequest, CheckoutPaymentLinkResult } from './checkout-payment-link.model';

/**
 * Everything the checkout modal needs to say to the payment layer when the user confirms a method.
 * Kept intentionally small: the purchase side already owns cart/query context, so the modal only
 * declares the chosen method (single payment is driven as a split of 1 on the purchase side).
 */
export interface CheckoutPaymentRequest {
  paymentType: PaymentType;
  /**
   * Leg amount in major units for partial payments (split equally / pay by item / custom amount).
   * Absent for pay-in-full, where the purchase side settles the whole cart as a split of 1. The
   * purchase side infers "partial leg" from its presence, so the modal's flow type never crosses
   * the port.
   */
  amount?: number;
  /**
   * Cash tendered by the customer for France EFSTA compliance (this leg only).
   */
  cashReceived?: number;
  /**
   * Leg amount in major units that the tendered cash must cover.
   */
  cashLegAmount?: number;
  /**
   * Zero-based index of this cash leg among cash legs in the session.
   */
  splitLegIndex?: number;
  /**
   * Payment path of the selected method option, as classified by the payment configuration. The
   * same `paymentType` can be offered both integrated and delegated, so the purchase side must
   * route by this flag when present instead of re-deriving the path from the type (re-deriving
   * cannot tell the two `card` options apart).
   */
  delegated?: boolean;
  /**
   * True when the user resent a previously failed payment. The purchase side reuses the existing
   * parent checkout and only triggers the payment again (then polls), instead of re-creating it.
   */
  retry?: boolean;
}

/**
 * Outcome of a modal-driven payment, modelled as a discriminated union so the processing step can
 * branch exhaustively instead of juggling a bare boolean plus a side channel.
 *
 * `sessionPaidAmount` (major units) is the amount actually captured on the backend session when
 * the attempt failed. The driver reports it when the failure happened after the money was
 * collected (a booking failure on a fully paid session): the modal's own leg accounting lags
 * behind there — the final leg is never reported as an intermediate success — and the in-modal
 * cancel must be offered whenever money has actually been captured (B2BO-7939).
 *
 * `checkoutFailed` is a failure raised before any charge (a rejected coupon or gift card, a
 * cart-preparation error, a checkout that never opened): the payment was never sent to the
 * terminal, so resending it can only re-fail identically. It is a distinct outcome from `failed`
 * (B2BO-8855) so the modal offers a return to the payment methods instead of a dead-end resend,
 * and records no failed payment attempt.
 */
export type CheckoutPaymentResult =
  | { kind: 'succeeded'; paymentId?: string }
  | { kind: 'failed'; paymentId?: string; reason?: string; resendBlocked?: boolean; sessionPaidAmount?: number }
  | { kind: 'checkoutFailed'; reason?: string }
  | { kind: 'cancelled' };

/**
 * Outcome of a modal-requested whole-session cancellation (cancel and refund every recorded leg).
 * It is a separate channel from {@link CheckoutPaymentResult}: a session cancel is not a payment
 * attempt, and mixing the two would force every payment listener to filter out cancel outcomes.
 */
export type CheckoutSessionCancelResult = { kind: 'succeeded' } | { kind: 'failed'; reason?: string };

/**
 * The single, typed channel the checkout modal depends on to run a payment. It replaces the loose
 * set of subjects previously threaded through the flow service, the store and the purchase service.
 *
 * The modal (store + processing step) depends only on this contract via {@link CHECKOUT_PAYMENT_PORT};
 * the concrete implementation lives in the box-office purchase layer, which keeps the modal free of
 * ticketing imports and extractable as a micro-frontend.
 */
export interface CheckoutPaymentPort {
  /** Emits once per payment-link request when the opener reports its outcome. */
  readonly paymentLinkResult$: Observable<CheckoutPaymentLinkResult>;
  /** Emits once per payment attempt when the settlement resolves. */
  readonly result$: Observable<CheckoutPaymentResult>;
  /** Emits once per requested session cancellation when the cancel-and-refund resolves. */
  readonly sessionCancelResult$: Observable<CheckoutSessionCancelResult>;
  /** Cancels the in-flight payment (terminal/backend) and unblocks the modal. */
  cancel(): void;
  cancelLeg(): void;
  /**
   * Requests the cancellation (and refund) of the whole checkout session while the modal stays
   * open on its cancelling step. Only meaningful once at least one leg has been recorded; the
   * outcome arrives on {@link sessionCancelResult$}.
   */
  cancelSession(): void;
  /** True when a purchase driver is wired to actually execute the payment (false for standalone/tests). */
  isDriven(): boolean;
  /** Signals that the user confirmed a method and the payment should start. */
  requestPayment(request: CheckoutPaymentRequest): void;
  /** Signals that the user chose to send a payment link instead of paying at the desk; nothing is charged. */
  requestPaymentLink(request: CheckoutPaymentLinkRequest): void;
}

export const CHECKOUT_PAYMENT_PORT = new InjectionToken<CheckoutPaymentPort>('CHECKOUT_PAYMENT_PORT');
