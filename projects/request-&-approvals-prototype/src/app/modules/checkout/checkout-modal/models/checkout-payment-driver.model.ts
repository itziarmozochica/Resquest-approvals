import { InjectionToken } from '@angular/core';

import type { CartPaymentCheckout, CartPaymentSession } from '@fz-original/app/payments/models/payments.model';
import type { Observable } from 'rxjs';

import type { CheckoutPaymentLinkRequest, CheckoutPaymentLinkResult } from './checkout-payment-link.model';
import type { CheckoutPaymentRequest } from './checkout-payment-port.model';

export interface LocalTerminalCoordinates {
  ipAddress: string;
  poiId: string;
}

export interface SettleSplitOfOneParams {
  cartId: string;
  parentTransactionId: string;
  partnerId: number;
  /** Amount charged by this leg's trigger, in major units. */
  targetAmount: number;
  /**
   * Cumulative session paid amount the poll must reach for this leg to count as settled
   * (paid-before-this-leg + `targetAmount`). Defaults to `targetAmount`, which is only correct for
   * a session's first leg (a single payment as a split of 1): with prior successful legs, comparing
   * the session's running `splitPaidAmount` against the bare leg amount would resolve "paid" before
   * the terminal answers.
   */
  expectedPaidAmount?: number;
  gateway?: string;
  /** Payment method the split is triggered with (e.g. `card`, `cash`). */
  method?: string;
  currency?: string;
  /** Terminal device id, forwarded only for gateways that settle on a device (adyen). */
  deviceId?: string;
  localTerminal?: LocalTerminalCoordinates;
  paymentConfigurationId?: string;
  /**
   * True for gateways that settle synchronously on the trigger (e.g. `delegated`/cash): a successful
   * trigger already means the split — and, as a split of 1, the whole checkout — is paid, so the
   * orchestrator resolves without polling the payment status. These gateways expose no pollable
   * transaction under `parentTransactionId`, so polling them would just 404. Defaults to `false` for
   * gateways that settle asynchronously on a device (e.g. `adyen`/card), which poll until paid.
   */
  settlesOnTrigger?: boolean;
  /** Actual cash tendered by the customer for this split leg (EFSTA France). */
  cashReceived?: number;
  /** Cash amount owed for this split leg (EFSTA France). */
  cashLegAmount?: number;
  /** Zero-based index of the cash split leg for fiscal accumulation. */
  splitLegIndex?: number;
  tapToPay?: boolean;
}

export interface CheckoutSessionOpening {
  checkout: CartPaymentCheckout;
  checkoutDeviceId?: string;
  onOpened(session: CartPaymentSession): void;
}

export interface OpenSessionAndSettleParams extends Omit<SettleSplitOfOneParams, 'parentTransactionId'> {
  opening: CheckoutSessionOpening;
}

/**
 * Contract for the purchase pipeline (box-office) that drives a modal payment session. It is the
 * driver-facing counterpart of {@link CheckoutPaymentPort} (the modal-facing channel): the driver
 * settles the payment and reports outcomes; the modal requests payments and consumes results.
 *
 * Both contracts are implemented by the checkout orchestrator, but box-office must depend on this
 * token — never on the concrete checkout service — so the checkout domain stays extractable and the
 * two roles of the orchestrator remain explicit.
 *
 * One session at a time: the orchestrator owns a single modal payment session; the checkout flow
 * service begins/resets it when the modal opens/closes.
 */
export interface CheckoutPaymentDriver {
  /** Emits when the modal user asked to cancel the in-flight payment (unwind the pending settlement). */
  readonly cancelRequested$: Observable<void>;
  /** Emits when the modal user confirmed a payment method (first attempt or resend). */
  readonly methodSelected$: Observable<CheckoutPaymentRequest>;
  /** Emits when the modal closed after completing, to drive post-payment navigation. */
  readonly modalClosed$: Observable<void>;
  /**
   * Emits when the modal user chose to send a payment link. The driver creates it and answers with
   * {@link reportPaymentLinkResult}; no payment is taken.
   */
  readonly paymentLinkRequested$: Observable<CheckoutPaymentLinkRequest>;
  /**
   * Emits when the modal user confirmed the cancellation of the whole checkout session with legs
   * already recorded. The driver must cancel-and-refund the session and report the outcome through
   * {@link reportSessionCancelSucceeded} / {@link reportSessionCancelFailed} while the modal stays
   * open on its cancelling step.
   */
  readonly sessionCancelRequested$: Observable<void>;
  /** Emits when the modal session ends (any close), so drivers waiting for a resend can stop. */
  readonly sessionEnded$: Observable<void>;
  /** True while a modal payment session is active (between modal open and close). */
  isActive(): boolean;
  openSessionAndSettle(params: OpenSessionAndSettleParams): Observable<void>;
  reportCancelled(): void;
  /**
   * Reports a failure raised before any charge (rejected coupon or gift card, cart-preparation
   * error, a checkout that never opened): the payment never reached the terminal, so the modal
   * offers a return to the payment methods instead of a resend, and records no payment attempt
   * (B2BO-8855). Distinct from {@link reportFailure}, which keeps the resend for a terminal decline.
   */
  reportCheckoutFailed(reason?: string): void;
  /**
   * Reports a failed payment attempt. `sessionPaidAmount` (major units) carries the amount already
   * captured on the session when the failure happened after the money was collected (booking
   * failure on a fully paid session), so the modal keeps offering the whole-session cancel.
   */
  reportFailure(reason?: string, sessionPaidAmount?: number): void;
  reportPaymentAlreadyTaken(sessionPaidAmount: number): void;
  reportPaymentLinkResult(result: CheckoutPaymentLinkResult): void;
  /** Reports a failed session cancel-and-refund; the modal offers a retry of the cancellation. */
  reportSessionCancelFailed(reason?: string): void;
  /** Reports a completed session cancel-and-refund; the modal shows the cancel-confirmation step. */
  reportSessionCancelSucceeded(): void;
  /**
   * Reports the backend SOLD_OUT answer: no capacity is left and a resend would get the same answer.
   * `sessionPaidAmount` (major units) carries the amount already captured.
   */
  reportSoldOut(sessionPaidAmount?: number): void;
  reportSuccess(): void;
  /** Settles a single payment as a split of 1 (trigger, then poll until paid unless the gateway settles on trigger). */
  settleSplitOfOne(params: SettleSplitOfOneParams): Observable<void>;
}

export const CHECKOUT_PAYMENT_DRIVER = new InjectionToken<CheckoutPaymentDriver>('CHECKOUT_PAYMENT_DRIVER');
