import { DestroyRef, inject, Injectable } from '@angular/core';
import { outputToObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdyenErrorCode } from '@fz-original/app/app/enums/payment-checkout-adyen.enum';
import { RazorpayErrorCode } from '@fz-original/app/app/enums/payment-checkout-razorpay.enum';
import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { AdyenCheckout, AdyenCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import { RazorpayCheckout } from '@fz-original/app/app/models/payment-checkout-razorpay.model';
import { SquareCheckout, SquareCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-square.model';
import { PaymentCheckoutTransaction } from '@fz-original/app/app/models/payment.model';
import { PaymentCheckoutSquareService } from '@fz-original/app/app/services/payment-checkout-square/payment-checkout-square.service';
import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { PaymentMethod } from '@fz-original/app/modules/box-office/checkout/models/payment-method.model';
import { AdyenLocalDeviceBridgeService } from '@fz-original/app/modules/box-office/shared/services/adyen-local-device/adyen-local-device-bridge.service';
import { TapToPayAvailabilityService } from '@fz-original/app/modules/box-office/shared/services/tap-to-pay/tap-to-pay-availability.service';
import { CartPaymentCheckoutError } from '@fz-original/app/payments/models/cart-payment-checkout-error.model';
import { AdyenLocalConfiguration } from '@fz-original/app/payments/models/local-terminal-payment.model';
import type { CartPaymentCheckout } from '@fz-original/app/payments/models/payments.model';
import { PurchaseAlreadyConfirmedError } from '@fz-original/app/payments/models/purchase-already-confirmed-error.model';
import { isTapToPayDeviceId } from '@fz-original/app/payments/models/tap-to-pay.model';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { EMPTY, merge, Observable, of, OperatorFunction, pipe, Subject, throwError } from 'rxjs';
import {
  catchError,
  concatMap,
  defaultIfEmpty,
  finalize,
  map,
  mergeMap,
  shareReplay,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import { CreateCheckoutEvent } from '../../../../../core/tracking/core/events/create-checkout';
import { SplitPaymentStartedEvent } from '../../../../../core/tracking/core/events/split-payment-started';
import { TrackingService } from '../../../../../core/tracking/tracking.service';
import { SpinnerService } from '../../../../../shared/layout/spinner/spinner.service';
import { BaseResponse } from '../../../../../shared/models/base-response';
import { invalidCartStatusConfirmedErrorCode } from '../../../../../shared/models/cart/cart-error-code';
import { Cart } from '../../../../../shared/models/cart/cart.model';
import { PreparedCartBookingQuestions } from '../../../../../shared/models/cart/prepare-cart-for-customer-data.model';
import { Customer } from '../../../../../shared/models/customer/customer.model';
import { Order } from '../../../../../shared/models/order/order.model';
import { isSoldOutSessionError } from '../../../../../shared/models/session/session-error-code';
import { CartTimingService } from '../../../../../shared/services/cart-timing/cart-timing.service';
import { CartService } from '../../../../../shared/services/cart/cart.service';
import { PrepareCartQuery } from '../../../../../shared/services/cart/prepare-cart-query';
import { CustomerService } from '../../../../../shared/services/customer/customer.service';
import { findFiscalComplianceBlockCode } from '../../../../../shared/services/fiscal-compliance-block/fiscal-compliance-block-code';
import { FiscalComplianceBlockPrepareError } from '../../../../../shared/services/fiscal-compliance-block/fiscal-compliance-block-prepare.error';
import { BookResultService } from '../../../../../shared/services/payment-gateways/book-resut/book-result.service';
import { BookResult } from '../../../../../shared/services/payment-gateways/book-resut/models/book-result-status.model';
import { Channel } from '../../../../../shared/services/session-availability/channel.enum';
import { CHECKOUT_PAYMENT_DRIVER, SettleSplitOfOneParams } from '../../../../checkout/checkout-modal/models/checkout-payment-driver.model';
import type {
  CheckoutSessionOpening,
  LocalTerminalCoordinates,
} from '../../../../checkout/checkout-modal/models/checkout-payment-driver.model';
import {
  CHECKOUT_SHIFT_REQUIRED_REASON,
  PaymentAlreadyTakenError,
} from '../../../../checkout/checkout-modal/models/checkout-payment-failure-reason.model';
import { CheckoutPaymentRequest } from '../../../../checkout/checkout-modal/models/checkout-payment-port.model';
import { CheckoutModalFlowService } from '../../../../checkout/checkout-modal/services/checkout-modal-flow.service';
import { SplitPaymentObserverService } from '../../../../checkout/checkout-modal/services/split-payment-observer/split-payment-observer.service';
import { findBookingFailureCode, isShiftRequiredError } from '../../../../checkout/checkout-modal/utils/checkout-payment-failure.util';
import { PaymentProvider } from '../../../checkout/models/payment-provider.enum';
import { PaymentType } from '../../../checkout/models/payment-type.enum';
import { WaitingForPaymentModalComponent } from '../../../shared/components/waiting-payment-modal/waiting-payment-modal.component';
import { ReceiptPrinterType } from '../../../shared/models/onsite-setup';
import { EfrUserMessageModalService } from '../../../shared/services/efsta-fiscal/efr-user-message-modal.service';
import { shouldWatchAsyncFiscalFailure } from '../../../shared/services/efsta-fiscal/efsta-fiscal.util';
import { FranceAsyncFiscalFailureService } from '../../../shared/services/france-async-fiscal/france-async-fiscal-failure.service';
import { readFreeCheckoutFiscalWatch } from '../../../shared/services/france-async-fiscal/free-checkout-fiscal-watch.util';
import { OnsiteSetupRequiredApiErrorService } from '../../../shared/services/onsite-setup-required-api-error.service';
import { OnsiteSetupsStorageService } from '../../../shared/services/onsite-setups/onsite-setups-storage.service';
import { PaymentConfiguration } from '../../../shared/services/payment-configuration.model';
import { BoxOfficePaymentMethodsService } from '../../../shared/services/payment-methods/box-office-payment-methods.service';
import { PaymentConfigStorageService } from '../../../shared/services/payment/payment-config-storage.service';
import {
  SplitPaymentProgressParams,
  SplitPaymentProgressService,
} from '../../../shared/services/split-payment-progress/split-payment-progress.service';
import { ChargeMismatchError, ExpectedCharge } from '../../models/expected-charge.model';
import { isCancelledTransactionError } from '../../utils/cancelled-transaction-error.util';
import { findChargeMismatch } from '../../utils/expected-charge.util';
import { CheckoutModalSplitLegsService } from '../checkout-modal-split-legs/checkout-modal-split-legs.service';

/**
 * Selects how the payment is driven. `modal` routes the single payment through the new
 * payments endpoints (single = split of 1) and the checkout modal channel; `legacy` keeps the
 * pre-existing behaviour. Defaults to legacy when unset.
 */
export type CheckoutFlow = 'legacy' | 'modal';

export interface PayOneStepQuery extends PrepareCartQuery {
  channel: Channel | string;
  cityId: number;
  paymentConfiguration: PaymentConfiguration;
  paymentType: PaymentType;
  additionalGiftCardCodes?: string[];
  cashReceived?: number;
  cashLegAmount?: number;
  splitLegIndex?: number;
  checkoutFlow?: CheckoutFlow;
  couponCode?: string;
  customer?: Customer;
  /** When set, the pipeline refuses to charge a prepared cart whose total or coupon differs from it. */
  expectedCharge?: ExpectedCharge;
  /**
   * The cart {@link OneStepPurchaseService.prepareCartWithBookingQuestions} already prepared (B2BO-9578): the payment
   * starts from it instead of preparing again. Ignored unless its id is `cartId`.
   */
  preparedCart?: Cart;
  overrideCapacity?: boolean;
}

/** A cart prepared ahead of the payment, with the booking questions that came with its prepare. */
export interface PreparedCartForPayment {
  bookingQuestions: PreparedCartBookingQuestions;
  cart: Cart;
}

export interface PayOneStepResponse {
  order: Order;
  /** The cart the pipeline checked and charged, read from the server after the member benefits, coupon and gift cards. */
  cart?: Cart;
  cartId?: string;
  paymentProvider?: PaymentCheckoutET;
  paymentTransactionId?: string;
}

/** Gateway-specific inputs for settling a modal payment as a split of 1 (see `#settleModalSplitOfOne`). */
interface ModalSettleOptions {
  /** Checkout payload forwarded to the book-result poller (adyen checkout / delegated response). */
  bookResultCheckout: Record<string, unknown> | null;
  /** Backend provider used for the book-result poll (`adyen` or `delegated`). */
  paymentProvider: PaymentCheckoutET;
  /** Split session id used for payments status / sync fiscal hydrate (never the cart id). */
  parentTransactionId: string;
  /** Terminal device id, forwarded to the trigger only for the adyen gateway. */
  deviceId?: string;
  /** Backend gateway that fulfils the split (`adyen` for card, `delegated` for cash). */
  gateway?: string;
  localTerminal?: LocalTerminalCoordinates;
  paymentConfigurationId?: string;
  tapToPay?: boolean;
  /** Payment method the split is triggered with (`card`, `cash`). */
  method?: string;
  /**
   * True when the gateway settles synchronously on the trigger (delegated/cash): the settlement
   * resolves as soon as the trigger succeeds, without polling the payment status. Left false/unset
   * for the adyen (card) gateway, which polls the terminal until paid.
   */
  settlesOnTrigger?: boolean;
}

interface ModalOpeningOptions extends Omit<ModalSettleOptions, 'parentTransactionId'> {
  checkout: CartPaymentCheckout;
  checkoutDeviceId?: string;
}

interface ModalOpeningRetryContext {
  cart: Cart;
  opening: ModalOpeningOptions;
  outcomeUnknown?: boolean;
  query: PayOneStepQuery;
}

interface ModalSessionOpening {
  cart: Cart;
  opening: ModalOpeningOptions;
  options: ModalSettleOptions | null;
  query: PayOneStepQuery;
}

/** Everything needed to resend a failed modal payment without re-creating the parent checkout. */
interface ModalSettleContext {
  cart: Cart;
  options: ModalSettleOptions;
  query: PayOneStepQuery;
  /**
   * `splitBooking` marks a session whose money is fully collected — every leg of a split settled,
   * or the pay-in-full split-of-one settle succeeded — with only the booking left: a resend
   * re-attempts the booking instead of replaying a settle, and a payment failure reports the
   * captured amount so the modal keeps offering the whole-session cancel.
   */
  kind?: 'splitBooking';
}

@Injectable({
  providedIn: 'root',
})
export class OneStepPurchaseService {
  readonly #adyenLocalDeviceBridgeService = inject(AdyenLocalDeviceBridgeService);
  readonly #tapToPayAvailabilityService = inject(TapToPayAvailabilityService);
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #checkoutModalFlowService = inject(CheckoutModalFlowService);
  readonly #checkoutModalSplitLegsService = inject(CheckoutModalSplitLegsService);
  readonly #checkoutPaymentDriver = inject(CHECKOUT_PAYMENT_DRIVER);
  readonly #efrUserMessageModalService = inject(EfrUserMessageModalService);
  readonly #franceAsyncFiscalFailureService = inject(FranceAsyncFiscalFailureService);
  readonly #boxOfficePaymentMethodsService = inject(BoxOfficePaymentMethodsService);
  readonly #splitPaymentObserver = inject(SplitPaymentObserverService);
  readonly #cartTimingService = inject(CartTimingService);
  readonly #paymentService = inject(PaymentService);
  readonly #splitPaymentProgressService = inject(SplitPaymentProgressService);
  private query!: PayOneStepQuery;
  private paymentTransactionId: string | null = null;
  private paymentTransactionCartId: string | null = null;
  private waitingForPaymentModal: NgbModalRef | null = null;
  private isCancellingPayment!: boolean;
  readonly #franceAsyncFiscalFailureSubject = new Subject<void>();
  readonly franceAsyncFiscalFailure$ = this.#franceAsyncFiscalFailureSubject.asObservable();
  readonly #franceAsyncFiscalSettleAbort$ = new Subject<void>();
  #franceAsyncFiscalWatchCartId: string | null = null;
  #preparedCartId: string | null = null;
  #bookingFailureLeftToFiscalWatch: { cartId: string; error: unknown } | null = null;
  #hostDestroyRef!: DestroyRef;
  #modalSettleContext: ModalSettleContext | null = null;
  #modalOpeningRetry: ModalOpeningRetryContext | null = null;
  /** Latest modal payment request; a leg `amount` on it routes the settle through the split-legs loop. */
  #modalLegRequest: CheckoutPaymentRequest | null = null;

  constructor(
    private cartService: CartService,
    private paymentConfigStorageService: PaymentConfigStorageService,
    private bookResultService: BookResultService,
    private customerService: CustomerService,
    private trackingService: TrackingService,
    private onsiteSetupsStorageService: OnsiteSetupsStorageService,
    private onsiteSetupRequiredApiErrorService: OnsiteSetupRequiredApiErrorService,
    private spinnerService: SpinnerService,
    private modalService: NgbModal,
  ) {
    // The settle context is only meaningful while its modal session lives: once the modal closes,
    // a later resend must never replay a previous purchase's settle against a stale cart.
    this.#checkoutPaymentDriver.sessionEnded$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#reportUnresolvedOpening(this.#modalOpeningRetry);
      this.#modalLegRequest = null;
      this.#modalOpeningRetry = null;
      this.#modalSettleContext = null;
    });
    this.#checkoutPaymentDriver.methodSelected$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(request => {
      this.#modalLegRequest = request;
    });
  }

  createFreeOrderRequest(query: PayOneStepQuery, cart: Cart): Observable<PayOneStepResponse> {
    const paymentGateway = PaymentCheckout[PaymentCheckout.free] as PaymentCheckoutET;
    const createCheckoutParams = this.createFreeCheckoutParams(cart, query);

    return this.#paymentService.createCheckout(createCheckoutParams).pipe(
      tap(response => {
        this.sendCreateCheckoutMixpanelEvent(cart.id!, paymentGateway, query.paymentType);
        this.#applyFreeCheckoutResponse(response, query, cart, paymentGateway);
      }),
      switchMap(response => this.processBookResult(response, paymentGateway, query, cart, PaymentProvider.FREE)),
      tap(() => this.#stopFranceAsyncFiscalWatchOnCompletedSale()),
    );
  }

  /**
   * Serves the modal's whole-session cancel once the leg loop is no longer listening (B2BO-7939):
   * the session is fully paid — or the pay-in-full settle succeeded — and only the booking failed,
   * so the pipeline errored out of the loop, but the modal's cancelling step still needs the
   * /cancel to be issued and its outcome reported. Uses the remembered settle context; never
   * errors, emits whether the session was cancelled. Called by `CheckoutModalResendService`, which
   * observes `sessionCancelRequested$` while awaiting a resend.
   */
  cancelModalSession(): Observable<boolean> {
    const context = this.#modalSettleContext;
    if (context === null) {
      // No live settle context to cancel against: report the failure so the modal lands on its
      // retryable cancel-failed step instead of hanging on the cancelling spinner.
      this.#checkoutPaymentDriver.reportSessionCancelFailed();
      return of(false);
    }
    return this.#checkoutModalSplitLegsService
      .cancelSessionForModal({
        cart: context.cart,
        parentGateway: context.options.paymentProvider,
        parentTransactionId: context.options.parentTransactionId,
        partnerId: context.query.partnerId,
        placeId: context.query.placeId,
        planId: context.query.planId!,
      })
      .pipe(
        tap(cancelled => {
          if (cancelled) {
            // Mirrors the in-loop cancel: downstream error handling must treat the session as
            // user-cancelled, never as a payment failure.
            this.isCancellingPayment = true;
          }
        }),
      );
  }

  getIsCancellingPayment(): boolean {
    return this.isCancellingPayment;
  }

  /** True once a modal split session has been opened and a settle context was remembered for resend. */
  hasModalSettleContext(): boolean {
    return this.#modalSettleContext !== null || this.#modalOpeningRetry !== null;
  }

  getLastPaymentTransactionId(cartId: string | undefined): string | null {
    if (this.paymentTransactionCartId === null || this.paymentTransactionCartId !== cartId) {
      return null;
    }
    return this.paymentTransactionId;
  }

  isCartPrepared(cartId: string | undefined): boolean {
    return cartId !== undefined && this.#preparedCartId === cartId;
  }

  reportModalFailureBeforePay(reason?: string): void {
    this.#reportModalFailureByChargeBoundary(reason);
  }

  #extractPaymentFailureReason(error: unknown): string | undefined {
    const bookingFailureCode = findBookingFailureCode(error);
    if (bookingFailureCode !== undefined) {
      return bookingFailureCode;
    }
    if (isShiftRequiredError(error)) {
      return CHECKOUT_SHIFT_REQUIRED_REASON;
    }
    if (typeof error === 'string') {
      return error.length > 0 ? error : undefined;
    }
    if (error !== null && typeof error === 'object') {
      const candidate = error as { message?: unknown; userError?: unknown };
      if (typeof candidate.userError === 'string' && candidate.userError.length > 0) {
        return candidate.userError;
      }
      if (typeof candidate.message === 'string' && candidate.message.length > 0) {
        return candidate.message;
      }
    }
    return undefined;
  }

  #findChargeMismatch(query: PayOneStepQuery, cart: Cart): ChargeMismatchError | null {
    if (query.expectedCharge === undefined) {
      return null;
    }
    const charged = findChargeMismatch(cart, query.expectedCharge);
    return charged === null ? null : new ChargeMismatchError(query.expectedCharge, charged, cart);
  }

  #isCheckoutModalFlow(): boolean {
    return this.query?.checkoutFlow === 'modal';
  }

  #isCancellationError(error: unknown): boolean {
    return isCancelledTransactionError(error);
  }

  /**
   * True for purchase errors that no resend can ever recover from — the cart itself is invalid and
   * must be discarded and recreated, or the prepared cart no longer charges what the till shows.
   * Offering the payment-failed retry for these would loop forever, so the modal is unwound instead
   * and the legacy error handling (cart recovery, the charge-mismatch banner) takes over.
   */
  #isUnrecoverableCartError(error: unknown): boolean {
    if (error instanceof ChargeMismatchError) {
      return true;
    }
    if (error === null || typeof error !== 'object') {
      return false;
    }
    const code = (error as { error?: { code?: unknown } }).error?.code;
    return code === invalidCartStatusConfirmedErrorCode;
  }

  /**
   * With the session fully paid and only the booking failed, the modal's own leg accounting
   * lags behind: the final split leg is never reported as an intermediate success, and the
   * pay-in-full settle records no leg at all. Report the amount actually captured so the
   * modal still offers the whole-session cancel.
   */
  #modalSessionPaidAmount(): number | undefined {
    return this.#modalSettleContext?.kind === 'splitBooking' ? this.#modalSettleContext.cart.total?.amount : undefined;
  }

  #reportModalFailureByChargeBoundary(reason?: string): void {
    if (!this.hasModalSettleContext()) {
      this.#checkoutPaymentDriver.reportCheckoutFailed(reason);
      return;
    }
    this.#checkoutPaymentDriver.reportFailure(reason, this.#modalSessionPaidAmount());
  }

  #reportModalPaymentAlreadyTaken(sessionPaidAmount: number): void {
    if (this.#isCheckoutModalFlow()) {
      this.#checkoutPaymentDriver.reportPaymentAlreadyTaken(sessionPaidAmount);
    }
  }

  #reportModalPaymentCancelled(): void {
    if (this.#isCheckoutModalFlow()) {
      this.#checkoutPaymentDriver.reportCancelled();
    }
  }

  /**
   * Reports the outcome of a failed modal purchase, split five ways by recoverability:
   *
   * - a lost booking on a cart watched for async fiscalization is terminal and already owned by that
   *   watch, which closes the progress modal and states the outcome, so no screen is reported here —
   *   a resend would settle a session fever2 is refunding. If the watch ends without handling it, the
   *   failure is reported then, so the cashier is never left on the processing screen;
   * - a user-initiated cancellation (`CancelledTransaction`), or an unrecoverable cart (confirmed
   *   and needing a discard-and-recreate), unwinds the modal so the legacy cart recovery can run —
   *   any in-modal retry there would loop forever;
   * - a SOLD_OUT booking once a payment was sent is final: no resend or method change can book seats
   *   that are gone, so the modal states it and offers only the cancellation of the sale;
   * - a failure raised before any charge — no settle context, so `createCheckout` never succeeded
   *   (a rejected coupon or gift card, a cart-preparation error) — is a checkout failure, not a
   *   payment failure: resending re-runs the same doomed pipeline, so the modal returns the operator
   *   to the payment methods and records no payment attempt (B2BO-8855);
   * - any other failure happened once the payment was sent to the terminal, where a resend is
   *   meaningful, so the modal offers the retryable payment-failed screen with its resend.
   *
   * The charge boundary is read from `hasModalSettleContext()` — the same signal the resend loop
   * uses — so every future pre-charge backend call is classified without a new special-cased code.
   */
  #reportModalPaymentOutcome(error: unknown): void {
    if (this.#markBookingFailureFromPurchaseError(error)) {
      return;
    }
    this.#reportModalPaymentOutcomeScreen(error);
  }

  #reportModalPaymentOutcomeScreen(error: unknown): void {
    if (this.#isCancellationError(error) || this.#isUnrecoverableCartError(error)) {
      this.#reportModalPaymentCancelled();
      return;
    }
    if (error instanceof PaymentAlreadyTakenError && this.hasModalSettleContext()) {
      this.#reportModalPaymentAlreadyTaken(error.sessionPaidAmount);
      return;
    }
    if (isSoldOutSessionError(error) && this.hasModalSettleContext()) {
      this.#reportModalSoldOut();
      return;
    }
    if (this.#isCheckoutModalFlow()) {
      this.#reportModalFailureByChargeBoundary(this.#extractPaymentFailureReason(error));
    }
  }

  /**
   * book-result returns the stored outcome, so a resend after SOLD_OUT would read the same answer and
   * keep the cashier looping on the payment-failed screen; the modal is told the sale cannot be
   * completed and only its cancellation is offered.
   */
  #reportModalSoldOut(): void {
    if (this.#isCheckoutModalFlow()) {
      this.#checkoutPaymentDriver.reportSoldOut(this.#modalSessionPaidAmount());
    }
  }

  #reportModalPaymentSuccess(): void {
    if (this.#isCheckoutModalFlow()) {
      this.#checkoutPaymentDriver.reportSuccess();
    }
  }

  payOneStep(query: PayOneStepQuery, hostDestroyRef: DestroyRef): Observable<PayOneStepResponse> {
    const modalSettleContext = this.#modalSettleContext;
    if (modalSettleContext?.kind === 'splitBooking') {
      // Every leg of the split session is already settled; only the booking failed. This
      // guards the method-change path on the payment-failed screen (which re-runs the purchase
      // pipeline instead of resending): re-running it would create a new checkout and charge the
      // customer again, so re-attempt the booking against the paid session instead.
      return this.#resolveModalBooking(modalSettleContext);
    }
    this.isCancellingPayment = false;
    this.query = query;
    this.#hostDestroyRef = hostDestroyRef;
    const customer: Customer = query.customer ?? {};
    const isSinglePrepareCall = this.cartService.canPrepareInOneCall();
    this.#cartTimingService.recordSalePrepareCall(isSinglePrepareCall);
    const alreadyPreparedCart = query.preparedCart?.id === query.cartId ? query.preparedCart : undefined;
    const preparedCart$: Observable<BaseResponse<Cart | null>> = alreadyPreparedCart
      ? of(new BaseResponse<Cart | null>(alreadyPreparedCart, null))
      : isSinglePrepareCall
        ? this.cartService.prepareAndGetCartForCustomer({ ...query, customer })
        : this.customerService.create(query.partnerId, customer, query.channel).pipe(
            concatMap((response: BaseResponse<Customer>) => {
              if (response?.data) {
                query = { ...query, userId: response.data.id };
                this.query = query;
                return this.cartService.prepareAndGetCart(query);
              }
              return throwError(response.error);
            }),
          );
    return preparedCart$.pipe(
      tap(prepareResponse =>
        this.onsiteSetupRequiredApiErrorService.logPrepareCartResponseIfOnsiteSetupIdRequired(
          'one_step_purchase_prepare_and_get_cart',
          prepareResponse,
          {
            cartId: query.cartId,
            channel: query.channel,
            partnerId: query.partnerId,
            placeId: query.placeId,
            planId: query.planId,
            userId: query.userId,
          },
        ),
      ),
      mergeMap((response: BaseResponse<Cart | null>) => this.checkResponseData(response)),
      catchError((error: unknown) => {
        const fiscalComplianceBlockCode = findFiscalComplianceBlockCode(error);
        return throwError(() =>
          fiscalComplianceBlockCode === undefined ? error : new FiscalComplianceBlockPrepareError(fiscalComplianceBlockCode, error),
        );
      }),
      tap((cartResponse: BaseResponse<Cart>) => {
        this.#preparedCartId = query.cartId ?? null;
        if (isSinglePrepareCall) {
          query = { ...query, userId: cartResponse.data?.userId ?? query.userId };
          this.query = query;
        }
      }),
      concatMap((cartResponse: BaseResponse<Cart>) => {
        if (query.couponCode) {
          return this.applyCoupon(query, cartResponse.data!.id!, cartResponse.data!.userId ?? query.userId!);
        } else {
          return of(cartResponse);
        }
      }),
      concatMap((cartResponse: BaseResponse<Cart>) => {
        if (cartResponse.error || !query.additionalGiftCardCodes?.length) {
          return of(cartResponse);
        }
        return this.addGiftCardCombination(query, cartResponse.data!.id!, cartResponse.data!.userId ?? query.userId!);
      }),
      concatMap((response: BaseResponse<Cart>) => {
        if (response?.data) {
          const chargeMismatch = this.#findChargeMismatch(query, response.data);
          const chargedCart: Cart = response.data;
          return chargeMismatch === null
            ? this.getPurchaseRequest(query, chargedCart).pipe(map((paid: PayOneStepResponse) => ({ ...paid, cart: chargedCart })))
            : throwError(() => chargeMismatch);
        }
        return throwError(() => response.error);
      }),
      tap(() => this.#stopFranceAsyncFiscalWatchOnCompletedSale()),
      catchError(error => {
        // The compliance block is rejected before any money is collected, so the session has nothing to
        // report or unwind: the caller owns closing the modal and showing the compliance dialog.
        if (error instanceof FiscalComplianceBlockPrepareError) {
          return throwError(() => error);
        }
        this.#reportModalPaymentOutcome(error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * The 2.1 prepare {@link payOneStep} sends, run ahead of the payment so the booking questions come with it
   * (B2BO-9578). It fails as that prepare does: a rejected customer errors with its `BaseErrorResponse`, a failed
   * prepare or cart read with its `BaseResponse`, a fiscal block with `FiscalComplianceBlockPrepareError`. The caller
   * pays the cart it answers with `query.preparedCart`, so the payment prepares nothing again.
   */
  prepareCartWithBookingQuestions(query: PayOneStepQuery): Observable<PreparedCartForPayment> {
    return this.cartService.prepareAndGetCartWithBookingQuestionsForCustomer({ ...query, customer: query.customer ?? {} }).pipe(
      tap(prepared =>
        this.onsiteSetupRequiredApiErrorService.logPrepareCartResponseIfOnsiteSetupIdRequired(
          'one_step_purchase_prepare_and_get_cart',
          prepared.cart,
          {
            cartId: query.cartId,
            channel: query.channel,
            partnerId: query.partnerId,
            placeId: query.placeId,
            planId: query.planId,
            userId: query.userId,
          },
        ),
      ),
      mergeMap(prepared =>
        this.checkResponseData(prepared.cart).pipe(
          map((cartResponse: BaseResponse<Cart>) => ({ bookingQuestions: prepared.bookingQuestions, cart: cartResponse.data! })),
        ),
      ),
      catchError((error: unknown) => {
        const fiscalComplianceBlockCode = findFiscalComplianceBlockCode(error);
        return throwError(() =>
          fiscalComplianceBlockCode === undefined ? error : new FiscalComplianceBlockPrepareError(fiscalComplianceBlockCode, error),
        );
      }),
    );
  }

  isHandlingFranceAsyncFiscalFailure(): boolean {
    return this.#franceAsyncFiscalFailureService.isHandlingAnyFiscalFailure();
  }

  /**
   * A €0 cart is settled without a payment, so the only handle on its async fiscalization outcome is
   * the split session fever2 creates for it, returned as `split_session_id`. Until that id is in the
   * response there is nothing to watch: `cart.id` is not a session and every poll would 404.
   *
   * `createFreeOrderRequest` is also a public entry point (reschedule, POS token) reached without a
   * `payOneStep` run behind it. Those callers are watched too, but only the query `payOneStep` is
   * currently running gets the host destroy ref: this service is a root singleton, so a stale
   * `#hostDestroyRef` from an earlier run points at a destroyed view and `takeUntilDestroyed` would
   * throw `NG0911` on subscribe. Any other caller is torn down with the root injector ref.
   */
  #applyFreeCheckoutResponse(response: unknown, query: PayOneStepQuery, cart: Cart, paymentCheckout: PaymentCheckoutET): void {
    const { blockBooker, blocksPurchaseOnFailure, splitSessionId } = readFreeCheckoutFiscalWatch(response);
    if (splitSessionId === undefined) {
      if (shouldWatchAsyncFiscalFailure(paymentCheckout, blockBooker, blocksPurchaseOnFailure)) {
        this.#datadogLogService.logWarn('[BoxOffice] FR async fiscal watch skipped: free checkout returned no split session id', {
          cartId: cart.id,
        });
      }
      return;
    }
    this.#setPaymentTransactionId(splitSessionId, cart);
    this.#startFranceAsyncFiscalWatch(cart, paymentCheckout, blockBooker, blocksPurchaseOnFailure, query);
  }

  #cancelCancellablePayment(cart: Cart, paymentCheckout: PaymentCheckoutET): Observable<undefined> {
    this.isCancellingPayment = true;
    if (cart.id !== undefined) {
      this.#franceAsyncFiscalFailureService.stopWatchingCart(cart.id);
    }
    const currency: string = cart.total?.currency ?? '';
    const cancel$ = this.#paymentService
      .cancelPayment({
        currency,
        partnerId: this.query.partnerId,
        paymentCheckout,
        placeId: this.query.placeId,
        planId: this.query.planId!,
        transactionId: this.paymentTransactionId!,
      })
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));

    cancel$
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        catchError(() => EMPTY),
        finalize(() => this.#closeWaitingForPaymentModal()),
      )
      .subscribe();

    return cancel$.pipe(takeUntilDestroyed(this.#destroyRef));
  }

  #closeWaitingForPaymentModal(): void {
    if (this.waitingForPaymentModal !== null) {
      this.waitingForPaymentModal.close();
    }
  }

  #setPaymentTransactionId(transactionId: string, cart: Cart): void {
    this.paymentTransactionId = transactionId;
    this.paymentTransactionCartId = cart.id ?? null;
  }

  #startFranceAsyncFiscalWatch(
    cart: Cart,
    paymentCheckout: PaymentCheckoutET,
    blockBooker?: boolean,
    blocksPurchaseOnFailure?: boolean,
    query: PayOneStepQuery = this.query,
  ): void {
    if (!shouldWatchAsyncFiscalFailure(paymentCheckout, blockBooker, blocksPurchaseOnFailure)) {
      return;
    }
    this.#franceAsyncFiscalWatchCartId = cart.id ?? null;
    this.#franceAsyncFiscalFailureService
      .watchForFiscalCancellation({
        cartId: cart.id!,
        parentTransactionId: this.paymentTransactionId!,
        partnerId: query.partnerId,
        paymentCheckout,
        blockBooker,
        blocksPurchaseOnFailure,
        ...(this.#isCheckoutModalFlow() && {
          onFiscalFailureDetected: () => this.#abortModalSettleOnFiscalFailure(),
        }),
      })
      .pipe(
        catchError(() => EMPTY),
        defaultIfEmpty(false),
        takeUntilDestroyed(this.query === query ? (this.#hostDestroyRef ?? this.#destroyRef) : this.#destroyRef),
      )
      .subscribe(fiscalFailureHandled => {
        if (!fiscalFailureHandled) {
          this.#reportBookingFailureTheWatchLeftUnhandled(cart.id!);
          return;
        }
        if (this.#bookingFailureLeftToFiscalWatch?.cartId === cart.id) {
          this.#bookingFailureLeftToFiscalWatch = null;
        }
        if (this.waitingForPaymentModal !== null) {
          this.waitingForPaymentModal.close();
        }
        this.#franceAsyncFiscalFailureSubject.next();
      });
  }

  /**
   * The watch has no terminal success status of its own — the session is already `completed` when the
   * booker is blocked — so a sale that books fine has to stop it explicitly, or the poller keeps
   * hitting the status endpoint for its whole 5-minute budget on a till that never leaves the screen.
   * A no-op while a failure is being handled, so it cannot cut the modal short.
   */
  #stopFranceAsyncFiscalWatchOnCompletedSale(): void {
    const cartId = this.#franceAsyncFiscalWatchCartId;
    if (cartId === null) {
      return;
    }
    this.#franceAsyncFiscalWatchCartId = null;
    this.#franceAsyncFiscalFailureService.stopWatchingCart(cartId);
  }

  #abortModalSettleOnFiscalFailure(): void {
    this.#franceAsyncFiscalSettleAbort$.next();
    this.#checkoutModalFlowService.dismissActiveModal();
  }

  #getWaitingObservable(cart: Cart, paymentProvider: PaymentCheckoutET): Observable<undefined | never> {
    if (this.#isCheckoutModalFlow()) {
      return merge(
        this.#checkoutPaymentDriver.cancelRequested$.pipe(
          take(1),
          mergeMap(() => {
            // The orchestrator already aborted the in-progress leg via the payments cancel endpoint
            // (§8, `POST /payments/{childTransactionId}/cancel`); here we only unwind the pending
            // book-result wait. The cancellation is surfaced to the modal as a cancelled result (not a
            // failure) by the settle error handler (see `#reportModalPaymentOutcome`).
            this.isCancellingPayment = true;
            if (
              paymentProvider === (PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET) ||
              paymentProvider === (PaymentCheckout[PaymentCheckout.adyen_local] as PaymentCheckoutET)
            ) {
              return throwError(
                () =>
                  new BaseResponse(null, {
                    errorCode: AdyenErrorCode.CancelledTransaction,
                    message: `errors.adyen.${AdyenErrorCode.CancelledTransaction}`,
                  }),
              );
            }
            return of(undefined as undefined);
          }),
        ),
        this.#franceAsyncFiscalSettleAbort$.pipe(map((): undefined => undefined)),
      ).pipe(take(1), takeUntilDestroyed(this.#destroyRef));
    }
    return this.showWaitingForPaymentModal(cart, paymentProvider);
  }

  #createPayhereOrderRequest(query: PayOneStepQuery, cart: Cart): Observable<PayOneStepResponse> {
    const paymentProvider = PaymentCheckout[PaymentCheckout.payhere] as PaymentCheckoutET;
    const onsiteSetup = this.onsiteSetupsStorageService.getConfiguration();
    const paymentConfiguration = this.paymentConfigStorageService.getConfiguration();
    return this.#paymentService
      .createCheckout({
        cartId: cart.id!,
        partnerId: query.partnerId,
        payhereCreateCheckoutBody: {
          channelId: query.channel ?? Channel.BoxOffice,
          device_identifier: paymentConfiguration!.deviceId!,
          onsite_setup_id: onsiteSetup?.id as string,
          payment_device_id: paymentConfiguration!.deviceId!,
          payment_method_type: query.paymentType,
        },
        paymentCheckout: 'payhere',
        userId: cart.userId ?? query.userId!,
      })
      .pipe(
        tap(() => {
          this.sendCreateCheckoutMixpanelEvent(cart.id!, PaymentCheckout[PaymentCheckout.payhere] as PaymentCheckoutET, query.paymentType);
        }),
        switchMap((response: PaymentCheckoutTransaction) => {
          this.#setPaymentTransactionId(response.transactionId, cart);
          this.spinnerService.hide();
          return this.bookResultService
            .getBookResult(paymentProvider, query.partnerId, query.planId!, query.placeId, cart, response, cart.userId ?? query.userId)
            .pipe(takeUntil(this.#getWaitingObservable(cart, paymentProvider)));
        }),
        this.#toPayOneStepResponse(paymentProvider),
        tap(() => this.waitingForPaymentModal?.close()),
        catchError(error => {
          if (this.waitingForPaymentModal) {
            this.waitingForPaymentModal.close();
          }
          return throwError(() => error);
        }),
      );
  }

  #createRazorpayOrderRequest(query: PayOneStepQuery, cart: Cart): Observable<PayOneStepResponse> {
    const paymentProvider = PaymentCheckout[PaymentCheckout.razorpay] as PaymentCheckoutET;
    return this.#paymentService
      .createCheckout({
        cartId: cart.id!,
        partnerId: query.partnerId,
        paymentCheckout: 'razorpay',
        razorpayCreateCheckoutBody: {
          channelId: query.channel,
          paymentMethodType: query.paymentType,
        },
        userId: cart.userId ?? query.userId!,
      })
      .pipe(
        tap(() => {
          this.sendCreateCheckoutMixpanelEvent(cart.id!, PaymentCheckout[PaymentCheckout.razorpay] as PaymentCheckoutET, query.paymentType);
        }),
        switchMap((response: RazorpayCheckout) => {
          const getBookResult$: Observable<BaseResponse<BookResult>> = this.bookResultService.getBookResult(
            paymentProvider,
            query.partnerId,
            query.planId!,
            query.placeId,
            cart,
            response,
            cart.userId ?? query.userId,
          );
          this.#setPaymentTransactionId(response.transactionId, cart);
          this.spinnerService.hide();
          return getBookResult$.pipe(takeUntil(this.#getWaitingObservable(cart, paymentProvider)));
        }),
        this.#toPayOneStepResponse(paymentProvider),
        tap(() => this.waitingForPaymentModal?.close()),
        catchError(error => {
          if (this.waitingForPaymentModal) {
            this.waitingForPaymentModal.close();
          }
          if (error.error?.errorCode === RazorpayErrorCode.ErrorToConnect) {
            return throwError(() => ({
              errorCode: RazorpayErrorCode.ErrorToConnect,
              message: `errors.razorpay.${RazorpayErrorCode.ErrorToConnect}`,
            }));
          }
          if (error.error?.errorCode === RazorpayErrorCode.FailedTransaction) {
            return throwError(() => ({
              errorCode: RazorpayErrorCode.CancelledTransaction,
              message: `errors.razorpay.${RazorpayErrorCode.CancelledTransaction}`,
            }));
          }
          return throwError(() => error);
        }),
      );
  }

  #showSplitPaymentProgressModal(cart: Cart, checkoutResponse: AdyenCheckout): Observable<BaseResponse<BookResult>> {
    const params: SplitPaymentProgressParams = {
      cartId: cart.id!,
      currency: cart.total?.currency ?? 'EUR',
      deviceId: checkoutResponse.deviceId,
      partnerId: this.query!.partnerId!,
      paymentGateway: 'adyen',
      placeId: this.query!.placeId!,
      planId: this.query!.planId!,
      seed: Math.floor(Math.random() * 10000000 + 1),
      totalAmount: cart.total?.amount,
      transactionId: checkoutResponse.transactionId,
      userId: cart.userId ?? this.query!.userId!,
    };
    this.#trackSplitPaymentStarted(cart, checkoutResponse.transactionId, checkoutResponse.deviceId, 'progress_modal');
    return this.#splitPaymentProgressService.openSplitPaymentProgressModal(params).pipe(
      catchError(error => {
        if (error instanceof BaseResponse && error.error?.errorCode === AdyenErrorCode.CancelledTransaction) {
          this.isCancellingPayment = true;
          if (cart.id !== undefined) {
            this.#franceAsyncFiscalFailureService.stopWatchingCart(cart.id);
          }
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * Settles the modal single payment as a split of 1: trigger + poll the new payments
   * endpoints (via the dedicated orchestrator) and then resolve the order with the existing
   * book-result flow, preserving order-resolution behaviour. Works for both the adyen (card) and
   * delegated (cash) gateways; the caller supplies the gateway-specific settle options. The context
   * is remembered so a failed payment can be resent by re-triggering only (see
   * {@link retryModalSettleSplitOfOne}). Cancellation is handled by the shared waiting observable.
   */
  #settleModalSplitOfOne(query: PayOneStepQuery, cart: Cart, options: ModalSettleOptions): Observable<BaseResponse<BookResult>> {
    this.#modalSettleContext = { cart, options, query };
    return this.#checkoutPaymentDriver
      .settleSplitOfOne({
        cartId: cart.id!,
        currency: cart.total?.currency,
        deviceId: options.deviceId,
        gateway: options.gateway,
        localTerminal: options.localTerminal,
        paymentConfigurationId: options.paymentConfigurationId,
        tapToPay: options.tapToPay,
        method: options.method,
        parentTransactionId: options.parentTransactionId,
        partnerId: query.partnerId,
        settlesOnTrigger: options.settlesOnTrigger,
        targetAmount: cart.total?.amount ?? 0,
        ...this.#resolveFranceCashTriggerParams(),
      })
      .pipe(
        tap(() => {
          // The settle collected the money; only the booking remains (mirrors the split-legs
          // flow). A failed booking must resend the booking only — never re-trigger the settled
          // payment — and report the captured amount so the modal keeps offering the cancel.
          this.#modalSettleContext = { cart, kind: 'splitBooking', options, query };
        }),
        switchMap(() =>
          this.bookResultService.getBookResult(
            options.paymentProvider,
            query.partnerId,
            query.planId!,
            query.placeId,
            cart,
            { ...(options.bookResultCheckout ?? {}), transactionId: options.parentTransactionId },
            cart.userId ?? query.userId,
          ),
        ),
        takeUntil(this.#getWaitingObservable(cart, options.paymentProvider)),
      );
  }

  /**
   * Resends a failed modal payment by re-running the settle (trigger again, then poll if the trigger
   * is in progress) against the existing parent checkout — no checkout is re-created. Reports the
   * outcome to the modal and re-throws so the caller's retry loop can await another resend.
   *
   * A resend is only valid for the method the settle was prepared for. If the requested method does
   * not match the remembered context (defence in depth — the modal clears its resend intent on any
   * method change), the whole purchase pipeline is re-run with the requested method instead of
   * replaying a settle prepared for a different gateway.
   */
  retryModalSettleSplitOfOne(requestedPaymentType?: PaymentType): Observable<PayOneStepResponse> {
    const openingRetry = this.#modalOpeningRetry;
    if (openingRetry !== null) {
      return requestedPaymentType !== undefined && requestedPaymentType !== openingRetry.query.paymentType
        ? this.payOneStep({ ...openingRetry.query, paymentType: requestedPaymentType }, this.#hostDestroyRef)
        : this.#retryModalOpening(openingRetry);
    }
    const context = this.#modalSettleContext;
    if (context === null) {
      return throwError(() => new Error('checkout.payment.retryUnavailable'));
    }
    if (context.kind === 'splitBooking') {
      // The split session is already fully paid; only the booking failed. The requested
      // method is irrelevant at this point — re-attempt the booking against the same checkout.
      return this.#resolveModalBooking(context);
    }
    if (requestedPaymentType !== undefined && requestedPaymentType !== context.query.paymentType) {
      return this.payOneStep({ ...context.query, paymentType: requestedPaymentType }, this.#hostDestroyRef);
    }
    return this.#resolveRetryOptions(context.options).pipe(
      switchMap(options =>
        this.#settleModalSplitOfOne(context.query, context.cart, options).pipe(
          this.#toPayOneStepResponse(options.paymentProvider),
          catchError((error: unknown) => {
            this.#reportModalPaymentOutcome(error);
            return throwError(() => error);
          }),
        ),
      ),
    );
  }

  #resolveRetryOptions<T extends Pick<ModalSettleOptions, 'deviceId' | 'tapToPay'>>(options: T): Observable<T> {
    if (options.tapToPay !== true) {
      return of(options);
    }
    return this.#tapToPayAvailabilityService.requestDeviceId().pipe(
      map(deviceId => ({ ...options, deviceId })),
      catchError((error: unknown) => {
        if (this.#isCheckoutModalFlow()) {
          this.#checkoutPaymentDriver.reportCheckoutFailed(this.#extractPaymentFailureReason(error));
        }
        return throwError(() => error);
      }),
    );
  }

  /** Re-attempts the booking of a fully paid split session (no payment is triggered). */
  #resolveModalBooking(context: ModalSettleContext): Observable<PayOneStepResponse> {
    return this.bookResultService
      .getBookResult(
        context.options.paymentProvider,
        context.query.partnerId,
        context.query.planId!,
        context.query.placeId,
        context.cart,
        { ...(context.options.bookResultCheckout ?? {}), transactionId: context.options.parentTransactionId },
        context.cart.userId ?? context.query.userId,
      )
      .pipe(
        this.#toPayOneStepResponse(context.options.paymentProvider),
        catchError((error: unknown) => {
          this.#reportModalPaymentOutcome(error);
          return throwError(() => error);
        }),
      );
  }

  #openModalPayment(query: PayOneStepQuery, cart: Cart, opening: ModalOpeningOptions): Observable<BaseResponse<BookResult>> {
    this.spinnerService.hide();
    if (this.#modalOpeningRetry?.outcomeUnknown !== true) {
      this.#modalOpeningRetry = null;
    }
    this.#modalSettleContext = null;
    const sessionOpening: ModalSessionOpening = { cart, opening, options: null, query };
    const firstLeg = this.#modalLegRequest;
    if (firstLeg?.amount != null && firstLeg.amount > 0) {
      return this.#openModalSplitLegs(sessionOpening, firstLeg);
    }
    return this.#openModalSplitOfOne(sessionOpening);
  }

  #openModalSplitLegs(sessionOpening: ModalSessionOpening, firstLeg: CheckoutPaymentRequest): Observable<BaseResponse<BookResult>> {
    const { cart, opening, query } = sessionOpening;
    return this.#checkoutModalSplitLegsService
      .openSessionAndSettleLegs({
        cart,
        firstLeg,
        ...(opening.tapToPay === true && { firstLegDeviceId: opening.deviceId }),
        opening: this.#toCheckoutSessionOpening(sessionOpening, false),
        parentGateway: opening.paymentProvider,
        partnerId: query.partnerId,
        placeId: query.placeId,
        planId: query.planId!,
      })
      .pipe(
        switchMap(() => {
          const options = this.#openedSettleOptions(sessionOpening);
          this.#modalSettleContext = { cart, kind: 'splitBooking', options, query };
          return this.#getModalBookResult(query, cart, options).pipe(takeUntil(this.#getWaitingObservable(cart, options.paymentProvider)));
        }),
        catchError((error: unknown) =>
          this.#recoverModalOpeningFailure(sessionOpening, error, false).pipe(
            takeUntil(this.#getWaitingObservable(cart, opening.paymentProvider)),
          ),
        ),
        catchError((error: unknown) => {
          if (this.#isCancellationError(error)) {
            this.isCancellingPayment = true;
          }
          return throwError(() => error);
        }),
      );
  }

  #openModalSplitOfOne(sessionOpening: ModalSessionOpening): Observable<BaseResponse<BookResult>> {
    const { cart, opening, query } = sessionOpening;
    return this.#checkoutPaymentDriver
      .openSessionAndSettle({
        cartId: cart.id!,
        currency: cart.total?.currency,
        deviceId: opening.deviceId,
        gateway: opening.gateway,
        localTerminal: opening.localTerminal,
        method: opening.method,
        opening: this.#toCheckoutSessionOpening(sessionOpening, true),
        partnerId: query.partnerId,
        paymentConfigurationId: opening.paymentConfigurationId,
        settlesOnTrigger: opening.settlesOnTrigger,
        tapToPay: opening.tapToPay,
        targetAmount: cart.total?.amount ?? 0,
        ...this.#resolveFranceCashTriggerParams(),
      })
      .pipe(
        switchMap(() => {
          const options = this.#openedSettleOptions(sessionOpening);
          this.#modalSettleContext = { cart, kind: 'splitBooking', options, query };
          return this.#getModalBookResult(query, cart, options);
        }),
        catchError((error: unknown) => this.#recoverModalOpeningFailure(sessionOpening, error, true)),
        takeUntil(this.#getWaitingObservable(cart, opening.paymentProvider)),
      );
  }

  #toCheckoutSessionOpening(sessionOpening: ModalSessionOpening, rememberForResend: boolean): CheckoutSessionOpening {
    const { cart, opening, query } = sessionOpening;
    return {
      checkout: opening.checkout,
      checkoutDeviceId: opening.checkoutDeviceId,
      onOpened: session => {
        const options = this.#toOpenedSettleOptions(opening, session.transactionId);
        sessionOpening.options = options;
        this.#modalOpeningRetry = null;
        this.#setPaymentTransactionId(session.transactionId, cart);
        this.sendCreateCheckoutMixpanelEvent(cart.id!, opening.paymentProvider, query.paymentType);
        this.#startFranceAsyncFiscalWatch(cart, opening.paymentProvider, session.blockBooker, session.blocksPurchaseOnFailure);
        if (rememberForResend) {
          this.#modalSettleContext = { cart, options, query };
        }
      },
    };
  }

  #toOpenedSettleOptions(opening: ModalOpeningOptions, parentTransactionId: string): ModalSettleOptions {
    return { ...opening, parentTransactionId };
  }

  #openedSettleOptions(sessionOpening: ModalSessionOpening): ModalSettleOptions {
    if (sessionOpening.options === null) {
      throw new Error('checkout.payment.missingSplitSessionId');
    }
    return sessionOpening.options;
  }

  #getModalBookResult(query: PayOneStepQuery, cart: Cart, options: ModalSettleOptions): Observable<BaseResponse<BookResult>> {
    return this.bookResultService.getBookResult(
      options.paymentProvider,
      query.partnerId,
      query.planId!,
      query.placeId,
      cart,
      { ...(options.bookResultCheckout ?? {}), transactionId: options.parentTransactionId },
      cart.userId ?? query.userId,
    );
  }

  #retryModalOpening({ cart, opening, query }: ModalOpeningRetryContext): Observable<PayOneStepResponse> {
    // The lost first call stays unresolved until the resend opens the session (`onOpened` clears it)
    // or fails again (`#recoverModalOpeningFailure` re-remembers it, or drops it on a checkout-step
    // refusal), so a close in between still reports the cancel as unresolved.
    return this.#resolveRetryOptions(opening).pipe(
      map(retryOpening =>
        retryOpening.tapToPay === true
          ? { ...retryOpening, bookResultCheckout: { deviceId: retryOpening.deviceId }, checkoutDeviceId: retryOpening.deviceId }
          : retryOpening,
      ),
      switchMap(retryOpening =>
        this.#openModalSplitOfOne({ cart, opening: retryOpening, options: null, query }).pipe(
          this.#toPayOneStepResponse(retryOpening.paymentProvider),
          catchError((error: unknown) => {
            // A checkout-step refusal is remapped as the pay-in-full routes do, so it carries its reason.
            const outcome =
              error instanceof BaseResponse && error.error?.errorCode !== AdyenErrorCode.CancelledTransaction
                ? {
                    errorCode: error.error?.errorCode,
                    message: `errors.adyen.${error.error?.errorCode}`,
                    userError: error.error?.userError,
                  }
                : error;
            this.#reportModalPaymentOutcome(outcome);
            return throwError(() => outcome);
          }),
        ),
      ),
    );
  }

  #recoverModalOpeningFailure(
    sessionOpening: ModalSessionOpening,
    error: unknown,
    rememberForResend: boolean,
  ): Observable<BaseResponse<BookResult>> {
    const { cart, opening, query } = sessionOpening;
    if (error instanceof PurchaseAlreadyConfirmedError) {
      this.#rememberOpeningForResend(sessionOpening);
      return this.bookResultService.getBookResult(
        opening.paymentProvider,
        query.partnerId,
        query.planId!,
        query.placeId,
        cart,
        opening.bookResultCheckout ?? null,
        cart.userId ?? query.userId,
      );
    }
    if (error instanceof CartPaymentCheckoutError) {
      // A checkout-step refusal is a known outcome with nothing charged: a resend of a lost first
      // call that ends here leaves no opening to retry or to report as unresolved.
      this.#modalOpeningRetry = null;
      return throwError(() => this.#toCheckoutStepError(error));
    }
    if (rememberForResend && sessionOpening.options === null) {
      this.#rememberOpeningForResend(sessionOpening, true);
    }
    return throwError(() => error);
  }

  #rememberOpeningForResend({ cart, opening, query }: ModalSessionOpening, outcomeUnknown = false): void {
    this.#modalSettleContext = null;
    this.#modalOpeningRetry = { cart, opening, query, ...(outcomeUnknown && { outcomeUnknown }) };
  }

  #reportUnresolvedOpening(openingRetry: ModalOpeningRetryContext | null): void {
    if (openingRetry?.outcomeUnknown !== true) {
      return;
    }
    const { cart, opening, query } = openingRetry;
    this.#splitPaymentObserver.sessionCancelUnresolved(
      { cartId: cart.id!, currency: cart.total?.currency, partnerId: query.partnerId },
      { amount: cart.total?.amount, gateway: opening.gateway, method: opening.method, source: 'pay_in_full' },
    );
  }

  #toCheckoutStepError(error: unknown): unknown {
    if (!(error instanceof CartPaymentCheckoutError)) {
      return error;
    }
    const { checkoutError } = error;
    return checkoutError instanceof Error ? checkoutError : ErrorResponseUtils.getErrorResponseFromGroup(checkoutError, 'adyen');
  }

  #trackSplitPaymentStarted(
    cart: Cart,
    transactionId: string,
    deviceId?: string,
    flowType: 'progress_modal' | 'waiting_modal' = 'progress_modal',
  ): void {
    this.trackingService.track(
      new SplitPaymentStartedEvent({
        cart_id: cart.id!,
        currency: cart.total?.currency ?? 'EUR',
        device_id: deviceId,
        flow_type: flowType,
        obo_flow_type: this.onsiteSetupsStorageService.getConfiguration()?.obo_flow_type,
        partner_id: this.query!.partnerId!,
        payment_gateway: 'adyen',
        place_id: this.query!.placeId!,
        plan_id: this.query!.planId!,
        total_amount: cart.total?.amount,
        transaction_id: transactionId,
        user_id: cart.userId ?? this.query!.userId!,
      }),
    );
  }

  private applyCoupon(query: PayOneStepQuery, cartId: string, userId: number): Observable<BaseResponse<Cart>> {
    return this.cartService
      .applyCouponToCart({
        cartId,
        couponCode: query.couponCode,
        partnerId: query.partnerId,
        userId,
      })
      .pipe(
        tap({
          error: () => {
            this.sendApplyCouponMixpanelEvent(query.couponCode!, false);
          },
          next: (applyCouponResponse: BaseResponse<Cart | null>) => {
            const success = !applyCouponResponse.error;
            this.sendApplyCouponMixpanelEvent(query.couponCode!, success);
          },
        }),
        mergeMap((applyCouponResponse: BaseResponse<Cart | null>) => this.checkResponseData(applyCouponResponse)),
      );
  }

  private addGiftCardCombination(query: PayOneStepQuery, cartId: string, userId: number): Observable<BaseResponse<Cart>> {
    return this.cartService
      .addGiftCardCombination({
        cartId,
        couponCodes: query.additionalGiftCardCodes!,
        partnerId: query.partnerId,
        userId,
      })
      .pipe(mergeMap((response: BaseResponse<Cart | null>) => this.checkResponseData(response)));
  }

  private checkResponseData<T>(response: BaseResponse<T | null>): Observable<BaseResponse<T>> {
    return response?.data != null ? of(response as BaseResponse<T>) : throwError(() => response);
  }

  #toPayOneStepResponse(
    paymentProvider: PayOneStepResponse['paymentProvider'],
  ): OperatorFunction<BaseResponse<BookResult>, PayOneStepResponse> {
    return pipe(
      mergeMap((response: BaseResponse<BookResult>) => this.#passThroughBookResult(response)),
      map((response: BaseResponse<BookResult>) => {
        this.#reportModalPaymentSuccess();
        return {
          order: new Order({ id: response.data!.orderId }),
          paymentProvider,
          paymentTransactionId: response.data!.transactionId,
        };
      }),
    );
  }

  #passThroughBookResult(response: BaseResponse<BookResult>): Observable<BaseResponse<BookResult>> {
    this.#efrUserMessageModalService.captureFromBookResult(response.data);
    return this.checkResponseData(response);
  }

  #markBookingFailureFromPurchaseError(error: unknown): boolean {
    if (this.#franceAsyncFiscalWatchCartId === null || !isSoldOutSessionError(error)) {
      return false;
    }
    const cartId = this.#franceAsyncFiscalWatchCartId;
    if (!this.#franceAsyncFiscalFailureService.isWatchingCart(cartId)) {
      return false;
    }
    this.#franceAsyncFiscalFailureService.markBookingFailure(cartId);
    this.#bookingFailureLeftToFiscalWatch = { cartId, error };
    return true;
  }

  #reportBookingFailureTheWatchLeftUnhandled(cartId: string): void {
    const bookingFailure = this.#bookingFailureLeftToFiscalWatch;
    if (bookingFailure?.cartId !== cartId) {
      return;
    }
    this.#bookingFailureLeftToFiscalWatch = null;
    this.#reportModalPaymentOutcomeScreen(bookingFailure.error);
  }

  #createAdyenLocalOrderRequest(query: PayOneStepQuery, cart: Cart, paymentConfig: PaymentConfiguration): Observable<PayOneStepResponse> {
    const adyenLocal = paymentConfig.adyenLocalConfiguration;
    const terminalId = paymentConfig.deviceId;
    const terminalIpAddress = terminalId !== undefined ? adyenLocal?.ipAddresses[terminalId] : undefined;
    if (terminalId === undefined || adyenLocal == null || terminalIpAddress === undefined) {
      this.spinnerService.hide();
      return throwError(() => new BaseResponse(null, { code: 400, message: 'errors.adyen.noDeviceSetting' }));
    }
    return this.#openAdyenLocalCheckout(query, cart, adyenLocal, terminalId, {
      localTerminal: { ipAddress: terminalIpAddress, poiId: terminalId },
    });
  }

  #createTapToPayOrderRequest(query: PayOneStepQuery, cart: Cart, adyenLocal: AdyenLocalConfiguration): Observable<PayOneStepResponse> {
    return this.#tapToPayAvailabilityService.requestDeviceId().pipe(
      catchError((error: unknown) => {
        this.spinnerService.hide();
        return throwError(() => error);
      }),
      switchMap(installationId => this.#openAdyenLocalCheckout(query, cart, adyenLocal, installationId, { tapToPay: true })),
    );
  }

  #openAdyenLocalCheckout(
    query: PayOneStepQuery,
    cart: Cart,
    adyenLocal: AdyenLocalConfiguration,
    deviceId: string,
    target: Pick<ModalSettleOptions, 'localTerminal' | 'tapToPay'>,
  ): Observable<PayOneStepResponse> {
    const paymentProvider = PaymentCheckout[PaymentCheckout.adyen_local] as PaymentCheckoutET;
    const { paymentConfigurationId } = adyenLocal;

    return this.#openModalPayment(query, cart, {
      bookResultCheckout: { deviceId },
      checkout: {
        channelId: query.channel,
        paymentMethodType: PaymentType.CARD,
        placeId: query.placeId,
        userId: cart.userId ?? query.userId!,
      },
      checkoutDeviceId: deviceId,
      deviceId,
      gateway: paymentProvider,
      method: query.paymentType,
      paymentConfigurationId,
      paymentProvider,
      ...target,
    }).pipe(
      this.#toPayOneStepResponse(paymentProvider),
      catchError((error: unknown) => {
        // Only the parent checkout's refusal is remapped; later failures already speak the modal's vocabulary.
        if (error instanceof BaseResponse && error.error?.errorCode !== AdyenErrorCode.CancelledTransaction) {
          return throwError(() => ({
            errorCode: error.error?.errorCode,
            message: `errors.adyen.${error.error?.errorCode}`,
            userError: error.error?.userError,
          }));
        }
        return throwError(() => error);
      }),
    );
  }

  private createAdyenOrderRequest(query: PayOneStepQuery, cart: Cart): Observable<PayOneStepResponse> {
    const paymentProvider = PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET;
    const request: AdyenCreateCheckoutBody = {
      channelId: query.channel,
      placeId: query.placeId,
    };
    const paymentType: PaymentType = query.paymentType;
    if (paymentType === PaymentType.CREDIT_CARD || paymentType === PaymentType.DEBIT_CARD) {
      request['paymentType'] = PaymentType.CARD;
      request['paymentCardType'] = paymentType == PaymentType.CREDIT_CARD ? 'credit' : 'debit';
    } else if (paymentType === PaymentType.CARD_SPLIT) {
      request['paymentType'] = PaymentType.CARD;
      request['splitPaymentFlag'] = true;
    } else {
      request['paymentType'] = paymentType;
    }

    const checkoutAndSettle$: Observable<BaseResponse<BookResult>> = this.#isCheckoutModalFlow()
      ? this.#openAdyenModalPayment(query, cart, request)
      : this.#paymentService
          .createCheckout({
            adyenCreateCheckoutBody: request,
            cartId: cart.id!,
            partnerId: query.partnerId,
            paymentCheckout: 'adyen',
            userId: cart.userId ?? query.userId!,
          })
          .pipe(
            tap(() =>
              this.sendCreateCheckoutMixpanelEvent(
                cart.id!,
                PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET,
                query.paymentType,
              ),
            ),
            switchMap((response: AdyenCheckout) => {
              this.#setPaymentTransactionId(response.transactionId, cart);
              this.#startFranceAsyncFiscalWatch(cart, paymentProvider, response.blockBooker, response.blocksPurchaseOnFailure);
              this.spinnerService.hide();
              if (query.paymentType === PaymentType.CARD_SPLIT) {
                return this.#showSplitPaymentProgressModal(cart, response);
              }
              return this.bookResultService
                .getBookResult(paymentProvider, query.partnerId, query.planId!, query.placeId, cart, response, cart.userId ?? query.userId)
                .pipe(takeUntil(this.#getWaitingObservable(cart, paymentProvider)));
            }),
          );

    return checkoutAndSettle$.pipe(
      this.#toPayOneStepResponse(paymentProvider),
      tap(() => this.waitingForPaymentModal?.close()),
      catchError((error: unknown) => {
        if (this.waitingForPaymentModal && !this.isCancellingPayment) {
          this.waitingForPaymentModal.close();
        }

        if (error instanceof BaseResponse) {
          if (error.error?.errorCode === AdyenErrorCode.CancelledTransaction) {
            return throwError(() => error);
          }

          return throwError(() => ({
            errorCode: error.error?.errorCode,
            message: `errors.adyen.${error.error?.errorCode}`,
            userError: error.error?.userError,
          }));
        }

        if (error instanceof PaymentAlreadyTakenError || findBookingFailureCode(error) !== undefined || isSoldOutSessionError(error)) {
          return throwError(() => error);
        }

        return throwError(() => ({
          message: error instanceof Error ? error.message : 'checkout.payment.failed',
        }));
      }),
    );
  }

  #openAdyenModalPayment(query: PayOneStepQuery, cart: Cart, request: AdyenCreateCheckoutBody): Observable<BaseResponse<BookResult>> {
    const deviceId = this.paymentConfigStorageService.getConfiguration()?.deviceId;
    const paymentProvider = PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET;
    return this.#openModalPayment(query, cart, {
      bookResultCheckout: deviceId !== undefined ? { deviceId } : {},
      checkout: {
        channelId: request.channelId,
        paymentCardType: request.paymentCardType,
        paymentMethodType: request.paymentType,
        placeId: request.placeId,
        userId: cart.userId ?? query.userId!,
      },
      checkoutDeviceId: deviceId,
      deviceId,
      gateway: paymentProvider,
      method: query.paymentType,
      paymentProvider,
    });
  }

  #resolveFranceCashTriggerParams(
    modalRequest: CheckoutPaymentRequest | null = this.#modalLegRequest,
  ): Pick<SettleSplitOfOneParams, 'cashLegAmount' | 'cashReceived' | 'splitLegIndex'> {
    if (modalRequest?.cashReceived === undefined || modalRequest.cashReceived <= 0) {
      return {};
    }
    return {
      cashLegAmount: modalRequest.cashLegAmount,
      cashReceived: modalRequest.cashReceived,
      ...(modalRequest.splitLegIndex !== undefined && { splitLegIndex: modalRequest.splitLegIndex }),
    };
  }

  private createDelegatedCheckoutParams(
    cart: Cart,
    query: PayOneStepQuery,
  ): {
    cartId: string;
    partnerId: number;
    paymentCheckout: 'delegated';
    paymentMethod: PaymentMethod;
    userId: number;
    cashReceived?: number;
    cashLegAmount?: number;
    channel?: string;
    deviceId?: string;
    overrideCapacity?: boolean;
    splitLegIndex?: number;
  } {
    const modalRequest = this.#modalLegRequest;
    const cashReceived = modalRequest?.cashReceived ?? query.cashReceived;
    const cashLegAmount = modalRequest?.cashLegAmount ?? query.cashLegAmount;
    const splitLegIndex = modalRequest?.splitLegIndex ?? query.splitLegIndex;
    // Delegated methods are not gateway-managed (some cards are delegated), but the modal checkout
    // still carries the station's Adyen terminal: the split session binds its receipt printer at open time
    // (`SplitSession.device_id`), so a session opened by a cash leg must name the terminal or the
    // consolidated refund receipt cannot print. Omitted for Epson receipt printers, which fever2
    // serves through the client-pulled thermal path.
    const isModalFlow = this.#isCheckoutModalFlow();
    const isEpsonReceiptPrinter = this.onsiteSetupsStorageService.getConfiguration()?.receipt_printer_type === ReceiptPrinterType.epson;
    const deviceId = this.paymentConfigStorageService.getConfiguration()?.deviceId;
    return {
      cartId: cart.id!,
      channel: query.channel,
      ...(query.overrideCapacity === true && { overrideCapacity: true }),
      partnerId: query.partnerId,
      paymentCheckout: 'delegated',
      paymentMethod: {
        paymentTransactionId: cart.id,
        paymentType: query.paymentType,
      },
      ...(query.paymentType === PaymentType.CASH &&
        !isModalFlow &&
        cashReceived !== undefined &&
        cashReceived > 0 && {
          cashLegAmount,
          cashReceived,
          ...(splitLegIndex !== undefined && { splitLegIndex }),
        }),
      ...(isModalFlow && !isEpsonReceiptPrinter && deviceId !== undefined && !isTapToPayDeviceId(deviceId) && { deviceId }),
      userId: cart.userId ?? query.userId!,
    };
  }

  private createDelegatedOrderRequest(query: PayOneStepQuery, cart: Cart): Observable<PayOneStepResponse> {
    const paymentGateway = PaymentCheckout[PaymentCheckout.delegated] as PaymentCheckoutET;
    const createCheckoutParams = this.createDelegatedCheckoutParams(cart, query);

    if (this.#isCheckoutModalFlow()) {
      return this.#openModalPayment(query, cart, {
        bookResultCheckout: null,
        checkout: {
          channelId: createCheckoutParams.channel,
          overrideCapacity: createCheckoutParams.overrideCapacity,
          paymentMethodType: query.paymentType,
          userId: createCheckoutParams.userId,
        },
        checkoutDeviceId: createCheckoutParams.deviceId,
        gateway: paymentGateway,
        method: query.paymentType,
        paymentProvider: paymentGateway,
        settlesOnTrigger: true,
      }).pipe(this.#toPayOneStepResponse(PaymentProvider.DELEGATED));
    }

    return this.#paymentService.createCheckout(createCheckoutParams).pipe(
      tap(() => {
        this.sendCreateCheckoutMixpanelEvent(cart.id!, paymentGateway, query.paymentType);
      }),
      switchMap(response => this.processBookResult(response, paymentGateway, query, cart, PaymentProvider.DELEGATED)),
    );
  }

  private createFreeCheckoutParams(
    cart: Cart,
    query: PayOneStepQuery,
  ): {
    cartId: string;
    partnerId: number;
    paymentCheckout: 'free';
    userId: number;
    channel?: string;
    overrideCapacity?: boolean;
  } {
    return {
      cartId: cart.id!,
      channel: query.channel,
      ...(query.overrideCapacity === true && { overrideCapacity: true }),
      partnerId: query.partnerId,
      paymentCheckout: 'free',
      userId: cart.userId ?? query.userId!,
    };
  }

  private createSquareAsyncOrder(query: PayOneStepQuery, cart: Cart, paymentConfig?: PaymentConfiguration): Observable<PayOneStepResponse> {
    const paymentProvider = PaymentCheckout[PaymentCheckout.square] as PaymentCheckoutET;
    const idempotencyKey = uuidv4().split('-');
    idempotencyKey[0] = PaymentCheckoutSquareService.idempotencyKeyAsyncPrefix;
    const checkout: SquareCreateCheckoutBody = {
      applicationId: paymentConfig!.squareConfiguration!.applicationId,
      channelId: query.channel,
      deviceId: paymentConfig!.deviceId!,
      idempotencyKey: idempotencyKey.join('-'),
      locationId: paymentConfig!.squareConfiguration!.locationId,
      paymentMethodType: query.paymentType,
    };
    return this.#paymentService
      .createCheckout({
        cartId: cart.id!,
        partnerId: query.partnerId,
        paymentCheckout: 'square',
        squareCreateCheckoutBody: checkout,
        userId: cart.userId ?? query.userId!,
      })
      .pipe(
        tap(() => this.sendCreateCheckoutMixpanelEvent(cart.id!, paymentProvider, query.paymentType)),
        switchMap((response: SquareCheckout) => {
          this.#setPaymentTransactionId(response.transactionId, cart);
          this.spinnerService.hide();
          return this.bookResultService
            .getBookResult(paymentProvider, query.partnerId, query.planId!, query.placeId, cart, checkout, cart.userId ?? query.userId)
            .pipe(takeUntil(this.#getWaitingObservable(cart, paymentProvider)));
        }),
        this.#toPayOneStepResponse(PaymentProvider.SQUARE),
        tap(() => this.#closeWaitingForPaymentModal()),
        catchError(error => {
          this.#closeWaitingForPaymentModal();
          return throwError(() => error);
        }),
      );
  }

  private getPurchaseRequest(query: PayOneStepQuery, cart: Cart): Observable<PayOneStepResponse> {
    this.paymentTransactionId = null;
    this.paymentTransactionCartId = null;
    const storedPaymentConfig = this.paymentConfigStorageService.getConfiguration();
    const modalDelegated = this.#isCheckoutModalFlow() ? this.#modalLegRequest?.delegated : undefined;
    const isDelegatedMethod =
      modalDelegated ??
      this.#boxOfficePaymentMethodsService.isDelegatedMethod(this.onsiteSetupsStorageService.getConfiguration(), query.paymentType);
    // A legacy split is charged leg by leg on the integrated gateway's terminal, so it must never
    // take a delegated route — neither by method nor by an inapplicable stored configuration. That
    // route sends the `card_split` sentinel as the payment method, which the backend rejects, and
    // which would otherwise book a single non-split order carrying the sentinel (B2BO-8885).
    const isSplitPayment = query.paymentType === PaymentType.CARD_SPLIT;

    if (cart.total!.amount === 0) {
      return this.createFreeOrderRequest(query, cart);
    }

    if (isDelegatedMethod && !isSplitPayment) {
      return this.createDelegatedOrderRequest(query, cart);
    }

    if (!isSplitPayment && modalDelegated !== false && storedPaymentConfig?.isConfigApplicable() !== true) {
      return this.createDelegatedOrderRequest(query, cart);
    }

    // Modal integrated confirms can run with empty storage: `basePaymentConfiguration` is only
    // persisted on terminal selection, and stale clearing wipes storage when no terminals remain.
    // Prefer storage, then the query's source-aware configuration built by the opener.
    const paymentConfig = storedPaymentConfig ?? (modalDelegated === false ? query.paymentConfiguration : undefined);

    // The stored configuration outlives a change of gateway, so the setup decides the route when there is one.
    const setup = this.onsiteSetupsStorageService.getConfiguration();
    const routingPaymentConfig =
      setup != null ? this.#boxOfficePaymentMethodsService.buildPaymentConfiguration(setup, paymentConfig?.deviceId) : paymentConfig;

    // Refuse rather than fall through to a gateway that cannot take a split. The option is already
    // withheld unless a chargeable integrated gateway carries a card method, so this guards a state
    // only stale stored configuration can reach.
    if (isSplitPayment && !routingPaymentConfig?.adyenConfiguration && !routingPaymentConfig?.adyenLocalConfiguration) {
      return throwError(() => ({ message: 'errors.checkout.splitRequiresIntegratedGateway' }));
    }

    if (this.#isCheckoutModalFlow() && routingPaymentConfig?.adyenLocalConfiguration && isTapToPayDeviceId(routingPaymentConfig.deviceId)) {
      return this.#createTapToPayOrderRequest(query, cart, routingPaymentConfig.adyenLocalConfiguration);
    }
    if (
      this.#isCheckoutModalFlow() &&
      routingPaymentConfig?.adyenLocalConfiguration &&
      this.#adyenLocalDeviceBridgeService.supportsConnectDevice()
    ) {
      return this.#createAdyenLocalOrderRequest(query, cart, routingPaymentConfig);
    }
    if (routingPaymentConfig?.adyenConfiguration) {
      return this.createAdyenOrderRequest(query, cart);
    }
    if (paymentConfig?.razorpayConfiguration) {
      return this.#createRazorpayOrderRequest(query, cart);
    }
    if (paymentConfig?.payhereConfiguration) {
      return this.#createPayhereOrderRequest(query, cart);
    }
    if (paymentConfig?.squareConfiguration) {
      return this.createSquareAsyncOrder(query, cart, paymentConfig);
    }
    this.#datadogLogService.logWarn('[BoxOffice] Purchase request with no routable payment gateway', {
      cartId: cart.id,
      gatewayProvider: this.#boxOfficePaymentMethodsService.getGatewayProvider(this.onsiteSetupsStorageService.getConfiguration()),
      hasPaymentConfiguration: paymentConfig != null,
      partnerId: query.partnerId,
    });
    return throwError(() => new Error('checkout.payment.gatewayNotSupported'));
  }

  private processBookResult(
    checkoutResponse: unknown,
    paymentGateway: PaymentCheckoutET,
    query: PayOneStepQuery,
    cart: Cart,
    provider: PaymentProvider,
  ): Observable<PayOneStepResponse> {
    return this.bookResultService
      .getBookResult(paymentGateway, query.partnerId, query.planId!, query.placeId, cart, checkoutResponse, cart.userId ?? query.userId)
      .pipe(this.#toPayOneStepResponse(provider));
  }

  private sendApplyCouponMixpanelEvent(code: string, success: boolean): void {
    this.trackingService.track({
      data: {
        coupon_code: code,
        success: success,
      },
      id: 'apply.couponOneStep',
    });
  }

  private sendCreateCheckoutMixpanelEvent(cartId: string, paymentGateway: PaymentCheckoutET, paymentMethod?: string): void {
    this.trackingService.track(
      new CreateCheckoutEvent({
        cart_id: cartId,
        obo_flow_type: this.onsiteSetupsStorageService.getConfiguration()?.obo_flow_type,
        payment_gateway: paymentGateway,
        payment_method: paymentMethod,
      }),
    );
  }

  private showWaitingForPaymentModal(cart: Cart, paymentProvider: PaymentCheckoutET): Observable<undefined | never> {
    this.waitingForPaymentModal = this.modalService.open(WaitingForPaymentModalComponent, {
      backdrop: 'static',
      keyboard: false,
    });

    const modalInstance = this.waitingForPaymentModal.componentInstance as WaitingForPaymentModalComponent;
    return outputToObservable(modalInstance.response).pipe(
      switchMap((response: boolean) => {
        if (cart.id !== undefined && this.#franceAsyncFiscalFailureService.isHandlingFiscalFailure(cart.id)) {
          return EMPTY;
        }
        if (response) {
          return this.#cancelCancellablePayment(cart, paymentProvider).pipe(
            mergeMap(() => {
              if (paymentProvider === (PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET)) {
                return throwError(
                  () =>
                    new BaseResponse(null, {
                      errorCode: AdyenErrorCode.CancelledTransaction,
                      message: `errors.adyen.${AdyenErrorCode.CancelledTransaction}`,
                    }),
                );
              }
              return of(void 0);
            }),
          );
        }
        return EMPTY;
      }),
      takeUntilDestroyed(this.#destroyRef),
    );
  }
}
