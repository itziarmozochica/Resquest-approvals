import { inject, Injectable } from '@angular/core';

import { AdyenErrorCode } from '@fz-original/app/app/enums/payment-checkout-adyen.enum';
import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { ReceiptPrinterType } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { AdyenLocalDeviceBridgeService } from '@fz-original/app/modules/box-office/shared/services/adyen-local-device/adyen-local-device-bridge.service';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { BoxOfficePaymentMethodsService } from '@fz-original/app/modules/box-office/shared/services/payment-methods/box-office-payment-methods.service';
import { PaymentConfigStorageService } from '@fz-original/app/modules/box-office/shared/services/payment/payment-config-storage.service';
import { TapToPayAvailabilityService } from '@fz-original/app/modules/box-office/shared/services/tap-to-pay/tap-to-pay-availability.service';
import { CHECKOUT_PAYMENT_DRIVER } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-driver.model';
import type {
  CheckoutSessionOpening,
  LocalTerminalCoordinates,
  SettleSplitOfOneParams,
} from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-driver.model';
import { PaymentAlreadyTakenError } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-failure-reason.model';
import type { CheckoutPaymentRequest } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-port.model';
import { SplitCancelState } from '@fz-original/app/modules/checkout/checkout-modal/services/split-payment-observer/models/split-cancel-state.enum';
import type { SplitPaymentCorrelationKeys } from '@fz-original/app/modules/checkout/checkout-modal/services/split-payment-observer/models/split-payment-correlation-keys.model';
import type { UnresolvedOpening } from '@fz-original/app/modules/checkout/checkout-modal/services/split-payment-observer/models/unresolved-opening.model';
import { SplitPaymentObserverService } from '@fz-original/app/modules/checkout/checkout-modal/services/split-payment-observer/split-payment-observer.service';
import { findBookingFailureCode } from '@fz-original/app/modules/checkout/checkout-modal/utils/checkout-payment-failure.util';
import { fromCents, toCents } from '@fz-original/app/modules/checkout/checkout-modal/utils/checkout-split.util';
import { CartPaymentCheckoutError } from '@fz-original/app/payments/models/cart-payment-checkout-error.model';
import { isTapToPayDeviceId, TapToPayUnavailableError } from '@fz-original/app/payments/models/tap-to-pay.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import type { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { isSoldOutSessionError } from '@fz-original/app/shared/models/session/session-error-code';
import { ErrorLoggerService } from '@fz-original/app/shared/services/error-logger/error-logger.service';
import { defer, merge, Observable, of, throwError, TimeoutError } from 'rxjs';
import { catchError, map, mergeMap, switchMap, take, takeUntil, tap, timeout } from 'rxjs/operators';

/** Session coordinates needed to cancel (and refund) the whole split-payment session. */
export interface SessionCancelParams {
  cart: Cart;
  /** Gateway that opened the parent checkout, used for the whole-session cancel. */
  parentGateway: PaymentCheckoutET;
  parentTransactionId: string;
  partnerId: number;
  placeId: number;
  planId: number;
}

/** Everything the leg loop needs from the purchase pipeline that created the parent checkout. */
export interface SplitLegsParams extends SessionCancelParams {
  /** The modal request that started the loop (carries the first leg's method and amount). */
  firstLeg: CheckoutPaymentRequest;
  firstLegDeviceId?: string;
}

export interface SplitLegsOpeningParams extends Omit<SplitLegsParams, 'parentTransactionId'> {
  opening: CheckoutSessionOpening;
}

type LegLoopSession = { opening: CheckoutSessionOpening } | { parentTransactionId: string };

interface LegLoop {
  params: Omit<SplitLegsParams, 'parentTransactionId'>;
  session: LegLoopSession;
  tapToPayDeviceId?: string;
  unresolvedOpening?: UnresolvedOpening;
}

/**
 * Upper bound on the whole-session cancel call (precedent: the bounded settle poll). A hung
 * POST /cancel must surface as a retryable failed cancellation — the modal's cancel-failed step —
 * instead of leaving the user on an infinite cancelling spinner.
 */
export const SESSION_CANCEL_MAX_WAIT_MS = 30_000;

/** Sentinel for a leg aborted by the modal user, distinct from a gateway/backend leg failure. */
class CheckoutLegCancelledError extends Error {
  constructor() {
    super('checkout.payment.legCancelled');
  }
}

type NextLegSignal = { kind: 'leg'; request: CheckoutPaymentRequest } | { kind: 'sessionCancelRequested' } | { kind: 'sessionEnded' };

/** Outcome of one settle attempt, folded into a value so leg errors never escape the leg scope. */
type LegOutcome = { kind: 'settled' } | { error: unknown; kind: 'legError' } | { kind: 'tapToPayUnavailable'; reason: string };

/** Per-leg gateway inputs, resolved from the method the cashier confirmed for that leg. */
interface LegGatewayOptions {
  gateway: string;
  method: string;
  deviceId?: string;
  localTerminal?: LocalTerminalCoordinates;
  paymentConfigurationId?: string;
  settlesOnTrigger?: boolean;
  tapToPay?: boolean;
}

function extractLegFailureReason(error: unknown): string | undefined {
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return undefined;
}

function extractSessionCancelFailureReason(error: unknown): string | undefined {
  if (error instanceof TimeoutError) {
    // Machine vocabulary shared with the payment failure categories; the modal maps it to copy.
    return 'TIMEOUT';
  }
  return extractLegFailureReason(error);
}

function splitPaymentCorrelationKeys(
  params: Omit<SessionCancelParams, 'parentTransactionId'>,
  splitSessionId?: string,
): SplitPaymentCorrelationKeys {
  return {
    cartId: params.cart.id!,
    currency: params.cart.total?.currency,
    partnerId: params.partnerId,
    splitSessionId,
  };
}

function sessionCancelParamsOf(loop: LegLoop): SessionCancelParams | null {
  return 'parentTransactionId' in loop.session ? { ...loop.params, parentTransactionId: loop.session.parentTransactionId } : null;
}

/**
 * Runs a split checkout (split equally / pay by item / custom amount) as a loop of partial legs
 * against one split-payment session.
 *
 * The purchase pipeline creates the parent checkout once (`split_payment_flag: true`) and then
 * delegates here: each modal confirmation (`methodSelected$` with a leg `amount`) settles one leg
 * through the checkout payment driver — delegated legs synchronously on the trigger, Adyen card
 * legs by polling the session. Intermediate successes are reported to the modal (which advances
 * its split loop and re-enters the flow's amount source: split config shares, item selection or
 * amount entry); the returned observable completes only when the running paid amount covers the
 * cart total, so the caller books exactly once, on the last leg.
 *
 * Per-leg failures and cancellations never error the purchase pipeline: they are reported to the
 * modal (payment-failed screen with resend / back to method selection) and the loop waits for the
 * next leg request. The loop errors only when the modal session ends before coverage — after
 * cancelling and refunding the whole session when something was already paid — surfacing the same
 * `CancelledTransaction` error the pay-in-full cancel path produces.
 */
@Injectable({
  providedIn: 'root',
})
export class CheckoutModalSplitLegsService {
  readonly #adyenLocalDeviceBridgeService = inject(AdyenLocalDeviceBridgeService);
  readonly #boxOfficePaymentMethodsService = inject(BoxOfficePaymentMethodsService);
  readonly #checkoutPaymentDriver = inject(CHECKOUT_PAYMENT_DRIVER);
  readonly #errorLogger = inject(ErrorLoggerService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #paymentConfigStorageService = inject(PaymentConfigStorageService);
  readonly #paymentService = inject(PaymentService);
  readonly #splitPaymentObserver = inject(SplitPaymentObserverService);
  readonly #tapToPayAvailabilityService = inject(TapToPayAvailabilityService);

  /**
   * Serves a modal-confirmed cancellation of the whole session (B2BO-7939): cancels and refunds
   * the session and reports the outcome to the modal — success routes it to its Cancel
   * Confirmation step, failure (with the extracted reason) to the retryable cancel-failed step.
   * Never errors; emits whether the session was cancelled.
   *
   * Single serving point for the two moments a session cancel can be requested: while the leg loop
   * awaits the next leg (see `#awaitNextLeg`) and after the loop completed with only the booking
   * failed, when `OneStepPurchaseService.cancelModalSession` serves the request from the modal
   * resend wait.
   */
  cancelSessionForModal(params: SessionCancelParams): Observable<boolean> {
    return this.#cancelSession(params).pipe(
      map(() => true),
      tap(() => this.#checkoutPaymentDriver.reportSessionCancelSucceeded()),
      catchError((error: unknown) => {
        this.#errorLogger.print(error);
        this.#checkoutPaymentDriver.reportSessionCancelFailed(extractSessionCancelFailureReason(error));
        return of(false);
      }),
    );
  }

  openSessionAndSettleLegs(params: SplitLegsOpeningParams): Observable<void> {
    return defer(() => {
      const { opening, ...loopParams } = params;
      return this.#settleLeg(
        { params: loopParams, session: { opening }, tapToPayDeviceId: params.firstLegDeviceId },
        params.firstLeg,
        0,
        false,
      );
    });
  }

  /**
   * The modal session ended before the cart was covered. A session holding money — a settled leg, or
   * a payment the terminal already took that the loop never counted (B2BO-9074) — must not be left
   * dangling: cancel and refund it as a whole. Always unwinds with the same cancellation error the
   * pay-in-full cancel produces, so the purchase pipeline reports a cancel, not a failure.
   */
  #abandonSession(loop: LegLoop, holdsPayment: boolean): Observable<never> {
    const session = sessionCancelParamsOf(loop);
    if (session === null && loop.unresolvedOpening !== undefined) {
      this.#splitPaymentObserver.sessionCancelUnresolved(splitPaymentCorrelationKeys(loop.params), loop.unresolvedOpening);
      return throwError(() => this.#cancelledTransactionError());
    }
    if (!holdsPayment || session === null) {
      // Operator abandoned before any leg was paid — a quick cancel the backend never sees (B2BO-7616).
      this.#splitPaymentObserver.sessionCancelRequested(
        splitPaymentCorrelationKeys(loop.params, session?.parentTransactionId),
        SplitCancelState.Quick,
      );
      return throwError(() => this.#cancelledTransactionError());
    }
    return this.#cancelSession(session).pipe(
      catchError((error: unknown) => {
        // The refund could not be delivered; nothing more can be done client-side, but the
        // failed session cancel must not disappear silently.
        this.#errorLogger.print(error);
        return of(undefined);
      }),
      mergeMap(() => throwError(() => this.#cancelledTransactionError())),
    );
  }

  /** `paymentTaken` records a payment the terminal already took that `paidCents` never counted. */
  #awaitNextLeg(loop: LegLoop, paidCents: number, paymentTaken: boolean): Observable<void> {
    const nextLeg$: Observable<NextLegSignal> = this.#checkoutPaymentDriver.methodSelected$.pipe(
      map(request => ({ kind: 'leg', request })),
    );
    const sessionCancelRequested$: Observable<NextLegSignal> = this.#checkoutPaymentDriver.sessionCancelRequested$.pipe(
      map(() => ({ kind: 'sessionCancelRequested' })),
    );
    const sessionEnded$: Observable<NextLegSignal> = this.#checkoutPaymentDriver.sessionEnded$.pipe(map(() => ({ kind: 'sessionEnded' })));
    return merge(nextLeg$, sessionCancelRequested$, sessionEnded$).pipe(
      take(1),
      mergeMap(signal => {
        if (signal.kind === 'sessionEnded') {
          return this.#abandonSession(loop, paidCents > 0 || paymentTaken);
        }
        if (signal.kind === 'sessionCancelRequested') {
          return this.#serveSessionCancelRequest(loop, paidCents, paymentTaken);
        }
        return this.#settleLeg(loop, signal.request, paidCents, paymentTaken);
      }),
    );
  }

  #cancelledTransactionError(): BaseResponse<null> {
    return new BaseResponse(null, {
      errorCode: AdyenErrorCode.CancelledTransaction,
      message: `errors.adyen.${AdyenErrorCode.CancelledTransaction}`,
    });
  }

  /**
   * Posts the whole-session cancel-and-refund (the legacy cancel endpoint routes a session id in
   * `transactionId` to the session cancel-and-refund), bounded so a hung request surfaces as an
   * error instead of a stuck stream. Single owner of the cancel payload: every session-cancel path
   * (abandon, in-loop modal cancel, post-loop modal cancel) must go through here so they cannot
   * drift apart.
   */
  #cancelSession(params: SessionCancelParams): Observable<void> {
    // Every money-moved cancel funnels through here — the operator's cancel-after-payment decision (B2BO-7616).
    this.#splitPaymentObserver.sessionCancelRequested(
      splitPaymentCorrelationKeys(params, params.parentTransactionId),
      SplitCancelState.AfterPayment,
    );
    return this.#paymentService
      .cancelPayment({
        currency: params.cart.total?.currency ?? 'EUR',
        partnerId: params.partnerId,
        paymentCheckout: this.#sessionCancelGateway(params.parentGateway),
        placeId: params.placeId,
        planId: params.planId,
        transactionId: params.parentTransactionId,
      })
      .pipe(
        timeout(SESSION_CANCEL_MAX_WAIT_MS),
        map((): undefined => void 0),
      );
  }

  /**
   * The modal user confirmed the cancellation of the whole checkout once the modal recorded money
   * on the session (B2BO-7939): a settled leg, or a payment the terminal already took that this loop
   * never counted (B2BO-9074). The modal is the authority here, so the /cancel is always sent while
   * the loop was awaiting the next leg: cancel and refund the session while the
   * modal stays open on its cancelling step (see {@link cancelSessionForModal}). On success the
   * loop unwinds with the shared `CancelledTransaction` error — the purchase pipeline observes the
   * cancel while the modal session is still active, so no legacy popup ever surfaces. On failure
   * the loop keeps waiting, so a retry can request the cancellation again; the loop never lets a
   * failed cancellation through as a settled outcome.
   */
  #serveSessionCancelRequest(loop: LegLoop, paidCents: number, paymentTaken: boolean): Observable<void> {
    const session = sessionCancelParamsOf(loop);
    if (session === null) {
      if (loop.unresolvedOpening !== undefined) {
        this.#splitPaymentObserver.sessionCancelUnresolved(splitPaymentCorrelationKeys(loop.params), loop.unresolvedOpening);
      } else {
        this.#splitPaymentObserver.sessionCancelRequested(splitPaymentCorrelationKeys(loop.params), SplitCancelState.Quick);
      }
      this.#checkoutPaymentDriver.reportSessionCancelSucceeded();
      return throwError(() => this.#cancelledTransactionError());
    }
    return this.cancelSessionForModal(session).pipe(
      mergeMap(cancelled =>
        cancelled ? throwError(() => this.#cancelledTransactionError()) : this.#awaitNextLeg(loop, paidCents, paymentTaken),
      ),
    );
  }

  /** Escalates the modal user's cancel into an error so the in-flight settle unwinds (see catch in `#settleLeg`). */
  #legCancellation(): Observable<never> {
    return this.#checkoutPaymentDriver.cancelRequested$.pipe(
      take(1),
      mergeMap(() => throwError(() => new CheckoutLegCancelledError())),
    );
  }

  /**
   * The whole-session cancel route only accepts terminal gateways in its path
   * (`adyen | payhere | razorpay | globalpayments | square`, split-payment API reference §9) —
   * `delegated` and `adyen_local` are not among them. The session is routed by its UUID
   * `transactionId` regardless of the path gateway, so those sessions are cancelled through the
   * `adyen` route.
   */
  #sessionCancelGateway(parentGateway: PaymentCheckoutET): PaymentCheckoutET {
    if (
      parentGateway === (PaymentCheckout[PaymentCheckout.delegated] as PaymentCheckoutET) ||
      parentGateway === (PaymentCheckout[PaymentCheckout.adyen_local] as PaymentCheckoutET)
    ) {
      return PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET;
    }
    return parentGateway;
  }

  #reportLegFailure(error: unknown): void {
    if (error instanceof PaymentAlreadyTakenError) {
      this.#checkoutPaymentDriver.reportPaymentAlreadyTaken(error.sessionPaidAmount);
      return;
    }
    if (isSoldOutSessionError(error)) {
      this.#checkoutPaymentDriver.reportSoldOut();
      return;
    }
    this.#checkoutPaymentDriver.reportFailure(findBookingFailureCode(error) ?? extractLegFailureReason(error));
  }

  #resolveIntegratedLegOptions(request: CheckoutPaymentRequest): LegGatewayOptions | null {
    // The stored configuration outlives a change of gateway, so the setup decides the route.
    const storedDeviceId = this.#paymentConfigStorageService.getConfiguration()?.deviceId;
    const paymentConfig = this.#boxOfficePaymentMethodsService.buildPaymentConfiguration(
      this.#onsiteSetupsStorageService.getConfiguration(),
      storedDeviceId,
    );
    const adyenLocal = paymentConfig.adyenLocalConfiguration;
    if (adyenLocal != null) {
      const poiId = paymentConfig.deviceId;
      if (isTapToPayDeviceId(poiId)) {
        return {
          gateway: PaymentCheckout[PaymentCheckout.adyen_local] as PaymentCheckoutET,
          method: request.paymentType,
          paymentConfigurationId: adyenLocal.paymentConfigurationId,
          tapToPay: true,
        };
      }
      if (!this.#adyenLocalDeviceBridgeService.supportsConnectDevice()) {
        return null;
      }
      const ipAddress = poiId !== undefined ? adyenLocal.ipAddresses[poiId] : undefined;
      return {
        deviceId: poiId,
        gateway: PaymentCheckout[PaymentCheckout.adyen_local] as PaymentCheckoutET,
        paymentConfigurationId: adyenLocal.paymentConfigurationId,
        method: request.paymentType,
        ...(poiId !== undefined && ipAddress !== undefined && { localTerminal: { ipAddress, poiId } }),
      };
    }
    return {
      deviceId: paymentConfig.deviceId,
      gateway: PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET,
      method: request.paymentType,
    };
  }

  #resolveLegDeviceId(loop: LegLoop, legOptions: LegGatewayOptions): Observable<string | undefined> {
    if (legOptions.tapToPay !== true) {
      return of(legOptions.deviceId);
    }
    if (loop.tapToPayDeviceId !== undefined) {
      return of(loop.tapToPayDeviceId);
    }
    return this.#tapToPayAvailabilityService.requestDeviceId().pipe(
      tap(deviceId => {
        loop.tapToPayDeviceId = deviceId;
      }),
    );
  }

  #resolveLegOptions(request: CheckoutPaymentRequest): LegGatewayOptions | null {
    // The payment path follows the selected option's classification, carried on the request by the
    // modal (the same type can be offered integrated AND delegated — e.g. two `card` options — so
    // it cannot be re-derived from the type alone). Requests without the flag fall back to the
    // setup-level classification (legacy hardcoded rules included), so any configured delegated
    // method (cash, checks, delegated cards, custom codes) settles through the delegated APIs.
    const delegated =
      request.delegated ??
      this.#boxOfficePaymentMethodsService.isDelegatedMethod(this.#onsiteSetupsStorageService.getConfiguration(), request.paymentType);
    if (delegated) {
      // Delegated legs are operator-recorded: the delegated gateway settles synchronously on the
      // trigger and exposes no pollable transaction. Still carry the station's Adyen terminal so the
      // consolidated refund receipt prints even when the session is opened by a cash leg (the receipt
      // printer is an onsite attribute, independent of how the customer pays). Omitted for Epson
      // receipt printers, which fever2 serves through the client-pulled thermal path.
      const isEpsonReceiptPrinter = this.#onsiteSetupsStorageService.getConfiguration()?.receipt_printer_type === ReceiptPrinterType.epson;
      const storedDeviceId = this.#paymentConfigStorageService.getConfiguration()?.deviceId;
      return {
        gateway: PaymentCheckout[PaymentCheckout.delegated] as PaymentCheckoutET,
        method: request.paymentType,
        settlesOnTrigger: true,
        ...(isEpsonReceiptPrinter || isTapToPayDeviceId(storedDeviceId) ? {} : { deviceId: storedDeviceId }),
      };
    }
    return this.#resolveIntegratedLegOptions(request);
  }

  #settleLeg(loop: LegLoop, request: CheckoutPaymentRequest, paidCents: number, paymentTaken: boolean): Observable<void> {
    const legCents = toCents(request.amount ?? 0);
    if (legCents <= 0) {
      // The modal guards against empty amounts; if one slips through, charge nothing and let the
      // cashier retry instead of triggering a leg the backend would reject.
      this.#checkoutPaymentDriver.reportFailure('checkout.payment.failed');
      return this.#awaitNextLeg(loop, paidCents, paymentTaken);
    }
    const legOptions = this.#resolveLegOptions(request);
    if (legOptions === null) {
      this.#checkoutPaymentDriver.reportFailure('checkout.payment.gatewayNotSupported');
      return this.#awaitNextLeg(loop, paidCents, paymentTaken);
    }
    const { params } = loop;
    const legParams: Omit<SettleSplitOfOneParams, 'parentTransactionId'> = {
      cartId: params.cart.id!,
      currency: params.cart.total?.currency,
      deviceId: legOptions.deviceId,
      expectedPaidAmount: fromCents(paidCents + legCents),
      gateway: legOptions.gateway,
      localTerminal: legOptions.localTerminal,
      paymentConfigurationId: legOptions.paymentConfigurationId,
      method: legOptions.method,
      partnerId: params.partnerId,
      settlesOnTrigger: legOptions.settlesOnTrigger,
      tapToPay: legOptions.tapToPay,
      targetAmount: fromCents(legCents),
      ...(request.cashReceived !== undefined &&
        request.cashReceived > 0 && {
          cashLegAmount: request.cashLegAmount,
          cashReceived: request.cashReceived,
          splitLegIndex: request.splitLegIndex,
        }),
    };
    // The error handling is scoped to the settle itself (folded into an outcome value) so that
    // errors of the continuation — most importantly the session-abandon cancellation raised deeper
    // in the loop — propagate to the purchase pipeline instead of being mistaken for a leg failure.
    const settled$: Observable<LegOutcome> = this.#resolveLegDeviceId(loop, legOptions).pipe(
      switchMap(deviceId => this.#settleLegPayment(loop, { ...legParams, deviceId })),
      takeUntil(this.#legCancellation()),
      map(() => ({ kind: 'settled' }) as LegOutcome),
      catchError((error: unknown) =>
        of<LegOutcome>(
          error instanceof TapToPayUnavailableError ? { kind: 'tapToPayUnavailable', reason: error.reason } : { error, kind: 'legError' },
        ),
      ),
    );
    return settled$.pipe(
      mergeMap(outcome => {
        if (outcome.kind === 'tapToPayUnavailable') {
          if (paidCents > 0 || paymentTaken) {
            this.#checkoutPaymentDriver.reportFailure(outcome.reason);
          } else {
            this.#checkoutPaymentDriver.reportCheckoutFailed(outcome.reason);
          }
          return this.#awaitNextLeg(loop, paidCents, paymentTaken);
        }
        if (outcome.kind === 'legError') {
          if (outcome.error instanceof CartPaymentCheckoutError) {
            return throwError(() => outcome.error);
          }
          if (outcome.error instanceof CheckoutLegCancelledError) {
            // The driver already aborted the in-progress leg on the terminal; the modal decides
            // whether to unwind (first leg) or return to method selection (history preserved).
            this.#checkoutPaymentDriver.reportCancelled();
          } else {
            if ('opening' in loop.session) {
              loop.unresolvedOpening = {
                amount: legParams.targetAmount,
                gateway: legParams.gateway,
                method: legParams.method,
                source: 'split_legs',
              };
            }
            this.#reportLegFailure(outcome.error);
          }
          return this.#awaitNextLeg(loop, paidCents, paymentTaken || outcome.error instanceof PaymentAlreadyTakenError);
        }
        const newPaidCents = paidCents + legCents;
        if (newPaidCents >= toCents(params.cart.total?.amount ?? 0)) {
          // Session covered: complete without reporting — the caller books the order first and
          // reports the final success itself, exactly like the pay-in-full flow.
          return of(void 0);
        }
        this.#checkoutPaymentDriver.reportSuccess();
        return this.#awaitNextLeg(loop, newPaidCents, paymentTaken);
      }),
    );
  }

  #settleLegPayment(loop: LegLoop, legParams: Omit<SettleSplitOfOneParams, 'parentTransactionId'>): Observable<void> {
    return defer(() => {
      const { session } = loop;
      if ('parentTransactionId' in session) {
        return this.#checkoutPaymentDriver.settleSplitOfOne({
          ...legParams,
          parentTransactionId: session.parentTransactionId,
        });
      }
      return this.#checkoutPaymentDriver.openSessionAndSettle({
        ...legParams,
        opening: {
          ...session.opening,
          onOpened: opened => {
            loop.session = { parentTransactionId: opened.transactionId };
            session.opening.onOpened(opened);
          },
        },
      });
    });
  }
}
