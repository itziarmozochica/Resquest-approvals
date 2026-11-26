import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PaymentCheckout } from '@fz-original/app/app/enums/payment.enum';
import { CartPaymentCheckoutError } from '@fz-original/app/payments/models/cart-payment-checkout-error.model';
import { CartPaymentTriggerError } from '@fz-original/app/payments/models/cart-payment-trigger-error.model';
import { ChargeInProgressError } from '@fz-original/app/payments/models/charge-in-progress-error.model';
import type {
  LocalTerminalPaymentRequest,
  LocalTerminalPaymentResult,
} from '@fz-original/app/payments/models/local-terminal-payment.model';
import type {
  CartPaymentSession,
  ConfirmPaymentParams,
  CreateCartPaymentResponse,
  PaymentFailureCategory,
  PaymentSplit,
  PaymentsStatus,
  TriggerPaymentResponse,
} from '@fz-original/app/payments/models/payments.model';
import { SessionHasPaymentsError } from '@fz-original/app/payments/models/session-has-payments-error.model';
import { LocalTerminalPaymentService } from '@fz-original/app/payments/services/local-terminal-payment.service';
import { getLatestSplit, getPaymentFailure, isLatestSplitPaid } from '@fz-original/app/payments/services/payments.adapter';
import { PaymentsService } from '@fz-original/app/payments/services/payments.service';
import { CartTimingService } from '@fz-original/app/shared/services/cart-timing/cart-timing.service';
import { ErrorLoggerService } from '@fz-original/app/shared/services/error-logger/error-logger.service';
import { BehaviorSubject, defer, EMPTY, merge, NEVER, Observable, of, Subject, throwError, TimeoutError, timer } from 'rxjs';
import {
  catchError,
  exhaustMap,
  filter,
  finalize,
  first,
  map,
  shareReplay,
  switchMap,
  take,
  takeUntil,
  tap,
  timeout,
} from 'rxjs/operators';

import type { CheckoutPaymentDriver, OpenSessionAndSettleParams, SettleSplitOfOneParams } from '../../models/checkout-payment-driver.model';
import {
  CHECKOUT_BOOKING_SOLD_OUT_REASON,
  CHECKOUT_PAYMENT_ALREADY_TAKEN_REASON,
  PaymentAlreadyTakenError,
} from '../../models/checkout-payment-failure-reason.model';
import type { CheckoutPaymentLinkRequest, CheckoutPaymentLinkResult } from '../../models/checkout-payment-link.model';
import type {
  CheckoutPaymentPort,
  CheckoutPaymentRequest,
  CheckoutPaymentResult,
  CheckoutSessionCancelResult,
} from '../../models/checkout-payment-port.model';
import { toCents } from '../../utils/checkout-split.util';
import type { BlockingLegRecoveryOutcome } from '../checkout-blocking-leg-recovery/checkout-blocking-leg-recovery.service';
import { CheckoutBlockingLegRecoveryService } from '../checkout-blocking-leg-recovery/checkout-blocking-leg-recovery.service';
import { SplitPaymentObserverService } from '../split-payment-observer/split-payment-observer.service';

export type { SettleSplitOfOneParams } from '../../models/checkout-payment-driver.model';

/** Session coordinates needed to cancel the in-progress leg via the payments endpoint (§8). */
interface ActiveSession {
  cartId: string;
  parentTransactionId: string;
  partnerId: number;
  /** False for gateways that settle on the trigger (delegated): they expose no pollable transaction. */
  pollable: boolean;
  settlesOnDevice: boolean;
}

const POLL_INTERVAL_MS = 5000;
/** Upper bound so a stalled backend surfaces as a failure instead of an infinite processing spinner. */
const MAX_POLL_DURATION_MS = 120_000;
/** Cadence of the cancel-race poll: short, because the user is staring at an unwinding modal. */
const PENDING_CANCEL_POLL_INTERVAL_MS = 2000;
/** How long a cancel keeps looking for the not-yet-visible leg before giving up. */
const PENDING_CANCEL_MAX_WAIT_MS = 30_000;
const LEG_CANCEL_MAX_WAIT_MS = 30_000;
const PAID_LEG_SETTLE_MAX_WAIT_MS = 30_000;

/** Outcome of a single status poll while the split is settling (a terminal failure throws instead). */
type PollState = { kind: 'paid' } | { kind: 'pending' };

type LegCancelState = 'none' | 'pending' | 'paid' | 'unpaid';

interface PendingOpening {
  cancelRequested: boolean;
}

type SessionOpeningOutcome =
  | { chargeId: string | undefined; kind: 'charged'; session: CartPaymentSession; sessionParams: SettleSplitOfOneParams }
  | { error: unknown; kind: 'checkoutFailed' }
  | { error: unknown; kind: 'outcomeUnknown' }
  | { kind: 'sessionHeld'; session: CartPaymentSession; sessionParams: SettleSplitOfOneParams }
  | { error: unknown; kind: 'triggerRejected'; session: CartPaymentSession; sessionParams: SettleSplitOfOneParams };

function settlesOnDevice(params: Pick<SettleSplitOfOneParams, 'gateway'>): boolean {
  return params.gateway === PaymentCheckout[PaymentCheckout.adyen_local];
}

function deviceTerminalOf(
  params: Pick<SettleSplitOfOneParams, 'cartId' | 'localTerminal' | 'tapToPay'>,
): LocalTerminalPaymentRequest['terminal'] | null {
  if (params.tapToPay === true) {
    return { saleId: params.cartId, tapToPay: true };
  }
  return params.localTerminal === undefined ? null : { ...params.localTerminal, saleId: params.cartId };
}

function toTriggerRejection(response: TriggerPaymentResponse): Error {
  return new Error(response.failureCategory ?? response.error ?? 'checkout.payment.triggerFailed');
}

function toSessionParams(params: OpenSessionAndSettleParams, parentTransactionId: string): SettleSplitOfOneParams {
  return { ...params, parentTransactionId };
}

class ConfirmationRejectedError extends Error {}

const DEVICE_OUTCOME_FAILURE_CATEGORIES: Record<'cancelled' | 'declined', PaymentFailureCategory> = {
  cancelled: 'USER_CANCELLED',
  declined: 'CARD_DECLINED',
};

/** Only a reply that never arrived (timeout, dropped connection, 5xx) leaves the capture in doubt. */
function isDefiniteRefusal(error: unknown): boolean {
  if (error instanceof ConfirmationRejectedError) {
    return true;
  }
  const status: unknown = (error as { error?: { status?: unknown } } | null)?.error?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/**
 * Single owner of a modal-driven checkout payment: it is both the typed channel the checkout modal
 * talks to ({@link CheckoutPaymentPort}) and the driver contract the purchase pipeline settles
 * through ({@link CheckoutPaymentDriver}) — a single payment as a split of 1. It replaces the loose
 * subjects previously threaded through the flow service, the store and `OneStepPurchaseService`.
 *
 * This service belongs to the checkout domain: it depends on the payments domain
 * ({@link PaymentsService}) but not on box-office. Box-office drives it through the
 * `CHECKOUT_PAYMENT_DRIVER` token (cart preparation and the parent checkout create/book-result
 * still run in the purchase pipeline for behaviour parity); this service only adds the trigger/poll
 * settlement and consolidates the result/cancel channel, so retiring the legacy path later is a
 * localised change.
 *
 * It owns **one modal payment session at a time**: `beginSession`/`reset` are driven by the checkout
 * flow service when the modal opens/closes, and all per-session state is scoped to that window.
 */
@Injectable({
  providedIn: 'root',
})
export class CheckoutPaymentOrchestratorService implements CheckoutPaymentPort, CheckoutPaymentDriver {
  readonly #cartTimingService = inject(CartTimingService);
  readonly #localTerminalPaymentService = inject(LocalTerminalPaymentService);
  readonly #paymentsService = inject(PaymentsService);
  readonly #errorLogger = inject(ErrorLoggerService);
  readonly #blockingLegRecovery = inject(CheckoutBlockingLegRecoveryService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #splitPaymentObserver = inject(SplitPaymentObserverService);

  readonly #result = new Subject<CheckoutPaymentResult>();
  readonly #methodSelected = new Subject<CheckoutPaymentRequest>();
  readonly #cancelRequested = new Subject<void>();
  readonly #modalClosed = new Subject<void>();
  readonly #paymentLinkRequested = new Subject<CheckoutPaymentLinkRequest>();
  readonly #paymentLinkResult = new Subject<CheckoutPaymentLinkResult>();
  readonly #sessionCancelRequested = new Subject<void>();
  readonly #sessionCancelResult = new Subject<CheckoutSessionCancelResult>();
  readonly #sessionEnded = new Subject<void>();
  readonly #settleStarted = new Subject<void>();
  readonly #settleEnded = new Subject<void>();
  readonly #legCancel = new BehaviorSubject<LegCancelState>('none');
  #active = false;
  /** Id of the leg currently `in_progress` (from the latest poll), used to cancel it (§8). */
  #activeChildTransactionId: string | null = null;
  #activeSession: ActiveSession | null = null;
  #lastSeenChildTransactionId: string | null = null;
  #pendingOpening: PendingOpening | null = null;
  #sessionGeneration = 0;
  #settleSequence = 0;
  #tapToPayInFlight = false;
  #cancelRequestedForLeg = false;

  readonly result$: Observable<CheckoutPaymentResult> = this.#result.asObservable();
  readonly methodSelected$: Observable<CheckoutPaymentRequest> = this.#methodSelected.asObservable();
  readonly cancelRequested$: Observable<void> = this.#cancelRequested.asObservable();
  readonly modalClosed$: Observable<void> = this.#modalClosed.asObservable();
  readonly paymentLinkRequested$: Observable<CheckoutPaymentLinkRequest> = this.#paymentLinkRequested.asObservable();
  readonly paymentLinkResult$: Observable<CheckoutPaymentLinkResult> = this.#paymentLinkResult.asObservable();
  /** Emits when the modal user confirmed the cancellation of the whole session (recorded legs). */
  readonly sessionCancelRequested$: Observable<void> = this.#sessionCancelRequested.asObservable();
  /** Emits once per requested session cancellation when the driver reports its outcome. */
  readonly sessionCancelResult$: Observable<CheckoutSessionCancelResult> = this.#sessionCancelResult.asObservable();
  /** Emits once the modal session ends (modal closed/cancelled), so callers waiting for a retry can stop. */
  readonly sessionEnded$: Observable<void> = this.#sessionEnded.asObservable();

  beginSession(): void {
    if (this.#active) {
      // One session at a time: a second modal opening over a live session points at a missing reset.
      this.#errorLogger.print(new Error('CheckoutPaymentOrchestratorService: beginSession called while a session is already active'));
    }
    this.#active = true;
  }

  cancel(): void {
    if (this.#tapToPayInFlight) {
      this.#cancelTapToPay();
      return;
    }
    this.#cancelRequestedForLeg = true;
    this.cancelActiveLeg();
    this.#cancelRequested.next();
  }

  /**
   * Cancels the leg currently on the terminal via the payments endpoint (§8,
   * `POST /payments/{childTransactionId}/cancel`). Fire-and-forget by contract: the terminal only
   * ACKs and the final `canceled` state arrives on a later poll.
   *
   * A cancel can race the first status poll (the trigger fired but no poll has revealed the leg id
   * yet). In that case the leg is not left live on the terminal: the status is polled until the
   * in-progress leg shows up and the abort is sent then (see `#cancelLegOnceKnown`).
   */
  cancelActiveLeg(): void {
    const session = this.#activeSession;
    if (this.#tapToPayInFlight) {
      this.#cancelTapToPay();
      return;
    }
    if (session === null) {
      if (this.#pendingOpening !== null) {
        this.#pendingOpening.cancelRequested = true;
      }
      return;
    }
    if (session.settlesOnDevice) {
      this.#abortOnDevice();
    }
    if (this.#activeChildTransactionId !== null) {
      this.#postLegCancel(session, this.#activeChildTransactionId);
      return;
    }
    if (!session.pollable) {
      return;
    }
    this.#cancelLegOnceKnown(session);
  }

  cancelLeg(): void {
    if (this.#tapToPayInFlight) {
      this.#cancelTapToPay();
      return;
    }
    if (this.#legCancel.value === 'pending') {
      return;
    }
    const session = this.#activeSession;
    const childTransactionId = this.#activeChildTransactionId;
    if (session === null || childTransactionId === null || !session.pollable || session.settlesOnDevice) {
      this.cancel();
      return;
    }
    this.#legCancel.next('pending');
    this.#paymentsService
      .cancelPayment({ cartId: session.cartId, childTransactionId, partnerId: session.partnerId, skipRetry: true })
      .pipe(
        take(1),
        timeout(LEG_CANCEL_MAX_WAIT_MS),
        map(response => response.status === 'success'),
        catchError((error: unknown) => {
          this.#errorLogger.print(error);
          this.#postLegCancel(session, childTransactionId);
          return of(false);
        }),
        takeUntil(merge(this.#settleEnded, this.#settleStarted)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(legPaid => {
        this.#legCancel.next(legPaid ? 'paid' : 'unpaid');
        if (!legPaid) {
          this.#cancelRequested.next();
        }
      });
  }

  /**
   * Modal-side request to cancel (and refund) the whole session while the modal stays open. The
   * driver observing {@link sessionCancelRequested$} performs the backend cancel and reports back
   * through {@link reportSessionCancelSucceeded} / {@link reportSessionCancelFailed}.
   */
  cancelSession(): void {
    this.#sessionCancelRequested.next();
  }

  isActive(): boolean {
    return this.#active;
  }

  isDriven(): boolean {
    return this.#active;
  }

  notifyModalClosed(): void {
    this.#modalClosed.next();
  }

  openSessionAndSettle(params: OpenSessionAndSettleParams): Observable<void> {
    return this.#settleLeg(params, () => this.#openSessionAndSettle(params));
  }

  reportCancelled(): void {
    this.#result.next({ kind: 'cancelled' });
  }

  reportCheckoutFailed(reason?: string): void {
    this.#result.next({ kind: 'checkoutFailed', reason });
  }

  reportFailure(reason?: string, sessionPaidAmount?: number): void {
    this.#result.next({
      kind: 'failed',
      paymentId: this.#lastSeenChildTransactionId ?? undefined,
      reason,
      sessionPaidAmount: sessionPaidAmount ?? this.#blockingLegRecovery.heldSessionPaidAmount() ?? undefined,
    });
  }

  reportPaymentAlreadyTaken(sessionPaidAmount: number): void {
    this.#result.next({
      kind: 'failed',
      paymentId: this.#lastSeenChildTransactionId ?? undefined,
      reason: CHECKOUT_PAYMENT_ALREADY_TAKEN_REASON,
      resendBlocked: true,
      sessionPaidAmount,
    });
  }

  reportPaymentLinkResult(result: CheckoutPaymentLinkResult): void {
    this.#paymentLinkResult.next(result);
  }

  reportSessionCancelFailed(reason?: string): void {
    this.#sessionCancelResult.next({ kind: 'failed', reason });
  }

  reportSessionCancelSucceeded(): void {
    this.#sessionCancelResult.next({ kind: 'succeeded' });
  }

  reportSoldOut(sessionPaidAmount?: number): void {
    this.#result.next({
      kind: 'failed',
      paymentId: this.#lastSeenChildTransactionId ?? undefined,
      reason: CHECKOUT_BOOKING_SOLD_OUT_REASON,
      resendBlocked: true,
      sessionPaidAmount: sessionPaidAmount ?? this.#blockingLegRecovery.heldSessionPaidAmount() ?? undefined,
    });
  }

  reportSuccess(): void {
    this.#result.next({ kind: 'succeeded', paymentId: this.#lastSeenChildTransactionId ?? undefined });
  }

  requestPayment(request: CheckoutPaymentRequest): void {
    this.#cancelRequestedForLeg = false;
    this.#methodSelected.next(request);
  }

  requestPaymentLink(request: CheckoutPaymentLinkRequest): void {
    this.#paymentLinkRequested.next(request);
  }

  reset(): void {
    this.#active = false;
    this.#activeChildTransactionId = null;
    this.#activeSession = null;
    this.#tapToPayInFlight = false;
    this.#cancelRequestedForLeg = false;
    this.#blockingLegRecovery.reset();
    this.#lastSeenChildTransactionId = null;
    this.#legCancel.next('none');
    this.#sessionGeneration += 1;
    this.#settleSequence += 1;
    this.#sessionEnded.next();
  }

  /**
   * Settles a single payment as a split of 1 against the payments endpoints: trigger the
   * payment, then poll the payment status until the latest split covers the target. Completes on
   * success and errors on an unsuccessful trigger, a hard split failure or a poll timeout.
   *
   * Gateways that settle synchronously on the trigger ({@link SettleSplitOfOneParams.settlesOnTrigger},
   * e.g. `delegated`/cash) resolve as soon as the trigger succeeds — no polling, since completing the
   * single payment completes the whole checkout and there is no pollable transaction to query.
   *
   * The current transaction status is always read from the **latest split** in the history (a retry
   * appends a new leg, which then drives the poll): the latest split reaching `success` (or the paid
   * amount covering the target) settles, while a terminal `failed`/`canceled` latest split surfaces
   * the backend `failureCategory` as a retryable failure and stops polling. The caller reports it to
   * the modal, which shows the payment-failed screen and lets the cashier resend (a resend re-runs
   * this same method against the same parent checkout). Cancellation of the whole modal is handled by
   * the caller's waiting observable (which observes {@link cancelRequested$}); the in-progress leg is
   * cancelled through {@link cancelActiveLeg} (§8).
   */
  settleSplitOfOne(params: SettleSplitOfOneParams): Observable<void> {
    return this.#settleLeg(params, () => this.#settleOnSession(params));
  }

  #activeSessionFor(params: SettleSplitOfOneParams): ActiveSession {
    return {
      cartId: params.cartId,
      parentTransactionId: params.parentTransactionId,
      partnerId: params.partnerId,
      pollable: params.settlesOnTrigger !== true,
      settlesOnDevice: settlesOnDevice(params),
    };
  }

  #settleLeg(params: OpenSessionAndSettleParams | SettleSplitOfOneParams, settlement: () => Observable<void>): Observable<void> {
    // A cancel that arrives before the trigger answers must look for this leg, not abort the previous one.
    this.#activeChildTransactionId = null;
    this.#lastSeenChildTransactionId = null;
    this.#legCancel.next('none');
    if (!Number.isFinite(params.targetAmount) || params.targetAmount <= 0) {
      // The backend rejects non-positive amounts anyway; failing here keeps the terminal untouched.
      return throwError(() => new Error('checkout.payment.failed'));
    }
    this.#settleSequence += 1;
    const sequence = this.#settleSequence;
    this.#settleStarted.next();
    this.#cartTimingService.markSaleStep('trigger');
    this.#tapToPayInFlight = settlesOnDevice(params) && params.tapToPay === true;
    return settlement().pipe(
      tap(() => this.#cartTimingService.recordSaleLegSettled(params.gateway)),
      finalize(() => {
        if (sequence === this.#settleSequence) {
          this.#tapToPayInFlight = false;
        }
        this.#legCancel.next('none');
        this.#settleEnded.next();
      }),
    );
  }

  #settleOnSession(params: SettleSplitOfOneParams): Observable<void> {
    this.#activeSession = this.#activeSessionFor(params);
    if (settlesOnDevice(params)) {
      return this.#settleOnLocalTerminal(params);
    }
    return this.#blockingLegRecovery
      .triggerOrRecover(params, () => this.#triggerAndTrack(params))
      .pipe(switchMap(outcome => this.#continueAfterRecovery(params, outcome)));
  }

  #openSessionAndSettle(params: OpenSessionAndSettleParams): Observable<void> {
    this.#activeSession = null;
    if (settlesOnDevice(params) && (deviceTerminalOf(params) === null || params.currency === undefined)) {
      return throwError(() => new Error('checkout.payment.terminalNotConfigured'));
    }
    return defer(() => this.#openSession(params)).pipe(switchMap(outcome => this.#continueAfterOpening(outcome)));
  }

  #openSession(params: OpenSessionAndSettleParams): Observable<SessionOpeningOutcome> {
    const generation = this.#sessionGeneration;
    const sequence = this.#settleSequence;
    const pending: PendingOpening = { cancelRequested: false };
    this.#pendingOpening = pending;
    const outcome$ = this.#paymentsService
      .createCartPayment({
        amount: params.targetAmount,
        cartId: params.cartId,
        cashLegAmount: params.cashLegAmount,
        cashReceived: params.cashReceived,
        checkout: params.opening.checkout,
        deviceId: params.deviceId ?? params.opening.checkoutDeviceId,
        gateway: params.gateway,
        method: params.method,
        partnerId: params.partnerId,
        paymentConfigurationId: params.paymentConfigurationId,
        splitLegIndex: params.splitLegIndex,
      })
      .pipe(
        map(response => this.#toOpeningOutcome(params, response)),
        catchError((error: unknown) => of(this.#toOpeningFailure(params, error))),
        tap(outcome => this.#onSessionOpening(params, outcome, generation, sequence, pending)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    outcome$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
    return outcome$;
  }

  #toOpeningOutcome(params: OpenSessionAndSettleParams, response: CreateCartPaymentResponse): SessionOpeningOutcome {
    const session = response.session;
    if (session === undefined) {
      return { error: new CartPaymentCheckoutError(new Error('checkout.payment.missingSplitSessionId')), kind: 'checkoutFailed' };
    }
    const sessionParams = toSessionParams(params, session.transactionId);
    if (!response.success) {
      return { error: toTriggerRejection(response), kind: 'triggerRejected', session, sessionParams };
    }
    return { chargeId: response.chargeId, kind: 'charged', session, sessionParams };
  }

  #toOpeningFailure(params: OpenSessionAndSettleParams, error: unknown): SessionOpeningOutcome {
    if (error instanceof SessionHasPaymentsError) {
      return { kind: 'sessionHeld', session: error.session, sessionParams: toSessionParams(params, error.session.transactionId) };
    }
    if (error instanceof CartPaymentTriggerError) {
      return {
        error: error.triggerError,
        kind: 'triggerRejected',
        session: error.session,
        sessionParams: toSessionParams(params, error.session.transactionId),
      };
    }
    if (error instanceof CartPaymentCheckoutError) {
      return { error, kind: 'checkoutFailed' };
    }
    return { error, kind: 'outcomeUnknown' };
  }

  #onSessionOpening(
    params: OpenSessionAndSettleParams,
    outcome: SessionOpeningOutcome,
    generation: number,
    sequence: number,
    pending: PendingOpening,
  ): void {
    if (this.#pendingOpening === pending) {
      this.#pendingOpening = null;
    }
    if (outcome.kind === 'outcomeUnknown') {
      this.#reportOutcomeUnknown(params, outcome.error);
      return;
    }
    if (outcome.kind === 'checkoutFailed') {
      return;
    }
    const session = this.#activeSessionFor(outcome.sessionParams);
    if (sequence === this.#settleSequence) {
      this.#activeSession = session;
    }
    if (generation === this.#sessionGeneration) {
      params.opening.onOpened(outcome.session);
    }
    if (!pending.cancelRequested) {
      return;
    }
    if (outcome.kind === 'charged' && outcome.chargeId !== undefined && (session.pollable || session.settlesOnDevice)) {
      this.#postLegCancel(session, outcome.chargeId);
      return;
    }
    if (session.pollable) {
      this.#cancelLegOnceKnown(session);
    }
  }

  #reportOutcomeUnknown(params: OpenSessionAndSettleParams, error: unknown): void {
    const response = error as { code?: unknown; status?: unknown } | null;
    const code: unknown = response?.code ?? response?.status;
    this.#splitPaymentObserver.cartPaymentOutcomeUnknown(
      { cartId: params.cartId, currency: params.currency, deviceId: params.deviceId, partnerId: params.partnerId },
      {
        amount: params.targetAmount,
        ...(typeof code === 'number' && { errorStatus: code }),
        errorType: error instanceof Error ? error.name : 'ErrorResponse',
        gateway: params.gateway,
        method: params.method,
      },
    );
  }

  #continueAfterOpening(outcome: SessionOpeningOutcome): Observable<void> {
    if (outcome.kind === 'checkoutFailed' || outcome.kind === 'outcomeUnknown') {
      return throwError(() => outcome.error);
    }
    const { sessionParams } = outcome;
    if (outcome.kind === 'sessionHeld') {
      return this.#recoverHeldSession(sessionParams);
    }
    if (outcome.kind === 'triggerRejected') {
      return outcome.error instanceof ChargeInProgressError && !settlesOnDevice(sessionParams)
        ? this.#recoverHeldSession(sessionParams)
        : throwError(() => outcome.error);
    }
    this.#cartTimingService.markSaleStep('terminal');
    if (settlesOnDevice(sessionParams)) {
      return this.#settleOnLocalTerminal(sessionParams, () => of(outcome.chargeId));
    }
    this.#trackTriggeredLeg(sessionParams, outcome.chargeId);
    return sessionParams.settlesOnTrigger === true ? of(void 0) : this.#pollUntilPaid(sessionParams);
  }

  #recoverHeldSession(params: SettleSplitOfOneParams): Observable<void> {
    const trigger = (): Observable<void> => (settlesOnDevice(params) ? this.#settleOnLocalTerminal(params) : this.#triggerAndTrack(params));
    return this.#blockingLegRecovery
      .recoverHeldSession(params, trigger)
      .pipe(switchMap(outcome => this.#continueAfterRecovery(params, outcome)));
  }

  #continueAfterRecovery(params: SettleSplitOfOneParams, outcome: BlockingLegRecoveryOutcome): Observable<void> {
    if (outcome.kind === 'settledByBlockingLeg') {
      this.#lastSeenChildTransactionId = outcome.childTransactionId;
      return of(void 0);
    }
    return params.settlesOnTrigger === true || settlesOnDevice(params) ? of(void 0) : this.#pollUntilPaid(params);
  }

  #abortOnDevice(): void {
    this.#localTerminalPaymentService
      .cancel()
      .pipe(
        take(1),
        catchError((error: unknown) => {
          this.#errorLogger.print(error);
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #cancelTapToPay(): void {
    if (this.#cancelRequestedForLeg) {
      return;
    }
    this.#cancelRequestedForLeg = true;
    this.#abortOnDevice();
  }

  #isTapToPayCancelRequested(): boolean {
    return this.#tapToPayInFlight && this.#cancelRequestedForLeg;
  }

  #payOnDevice(request: LocalTerminalPaymentRequest): Observable<LocalTerminalPaymentResult> {
    if (this.#isTapToPayCancelRequested()) {
      return of({ kind: 'cancelled' });
    }
    return this.#localTerminalPaymentService.pay(request);
  }

  #unwindTapToPayCancel(): Observable<never> {
    this.#activeSession = null;
    this.#activeChildTransactionId = null;
    this.#cancelRequested.next();
    return NEVER;
  }

  #confirmDeviceOutcome(
    params: SettleSplitOfOneParams,
    chargeId: string,
    result: Exclude<LocalTerminalPaymentResult, { kind: 'unknown' }>,
  ): Observable<void> {
    return this.#paymentsService.confirmPayment(this.#confirmParamsFor(params, chargeId, result)).pipe(
      switchMap(response => {
        if (!response.success) {
          return throwError(() => new ConfirmationRejectedError(response.errorCode ?? response.error ?? 'checkout.payment.confirmFailed'));
        }
        if (result.kind === 'approved') {
          return of(void 0);
        }
        if (result.kind === 'cancelled' && this.#isTapToPayCancelRequested()) {
          return this.#unwindTapToPayCancel();
        }
        return throwError(() => new Error(DEVICE_OUTCOME_FAILURE_CATEGORIES[result.kind]));
      }),
      catchError((error: unknown) =>
        result.kind === 'approved' && !isDefiniteRefusal(error) ? this.#settleApprovedLegByStatus(params, error) : throwError(() => error),
      ),
    );
  }

  #confirmParamsFor(
    params: SettleSplitOfOneParams,
    chargeId: string,
    result: Exclude<LocalTerminalPaymentResult, { kind: 'unknown' }>,
  ): ConfirmPaymentParams {
    const base = { cartId: params.cartId, chargeId, partnerId: params.partnerId };
    if (result.kind === 'declined') {
      return { ...base, errorCondition: result.errorCondition, outcome: 'declined', refusalReason: result.refusalReason };
    }
    if (result.kind !== 'approved') {
      return { ...base, outcome: result.kind };
    }
    return {
      ...base,
      authorizedAmount: result.authorizedAmount,
      currency: result.currency,
      outcome: 'approved',
      pspReference: result.terminalReference,
    };
  }

  /**
   * An approved card whose confirm got no answer may already be captured: failing the leg would offer
   * the cashier a resend and charge the customer twice, so the session status decides.
   */
  #settleApprovedLegByStatus(params: SettleSplitOfOneParams, error: unknown): Observable<void> {
    this.#errorLogger.print(error);
    return this.#pollUntilPaid(params);
  }

  #recoverUnconfirmedCharge(params: SettleSplitOfOneParams, chargeId: string): Observable<void> {
    return this.#paymentsService.confirmPayment({ cartId: params.cartId, chargeId, outcome: 'unknown', partnerId: params.partnerId }).pipe(
      catchError((error: unknown) => {
        this.#errorLogger.print(error);
        return of(null);
      }),
      switchMap(() => this.#pollUntilPaid(params)),
    );
  }

  #settleOnLocalTerminal(
    params: SettleSplitOfOneParams,
    reserveCharge: () => Observable<string | undefined> = () => this.#createLegPayment(params),
  ): Observable<void> {
    const { currency } = params;
    const terminal = deviceTerminalOf(params);
    if (terminal === null || currency === undefined) {
      return throwError(() => new Error('checkout.payment.terminalNotConfigured'));
    }
    return reserveCharge().pipe(
      switchMap(chargeId => (chargeId === undefined ? throwError(() => new Error('checkout.payment.triggerFailed')) : of(chargeId))),
      tap(chargeId => this.#trackReservedLeg(chargeId)),
      switchMap(chargeId =>
        this.#payOnDevice({ amount: params.targetAmount, currency, terminal }).pipe(
          // Only `pay` is caught: around the confirm, its own recovery-poll timeout would confirm
          // `unknown` over a capture already approved.
          catchError((error: unknown) => {
            this.#errorLogger.print(error);
            return of<LocalTerminalPaymentResult>({ kind: 'unknown' });
          }),
          tap(() => this.#cartTimingService.markSaleStep('confirm')),
          switchMap(result =>
            result.kind === 'unknown'
              ? this.#recoverUnconfirmedCharge(params, chargeId)
              : this.#confirmDeviceOutcome(params, chargeId, result),
          ),
        ),
      ),
    );
  }

  #createLegPayment({
    cartId,
    cashLegAmount,
    cashReceived,
    deviceId,
    gateway,
    method,
    parentTransactionId,
    partnerId,
    paymentConfigurationId,
    splitLegIndex,
    targetAmount,
  }: SettleSplitOfOneParams): Observable<string | undefined> {
    return this.#paymentsService
      .createCartPayment({
        amount: targetAmount,
        cartId,
        cashLegAmount,
        cashReceived,
        deviceId,
        gateway,
        method,
        partnerId,
        paymentConfigurationId,
        sessionId: parentTransactionId,
        splitLegIndex,
      })
      .pipe(
        switchMap(response => (response.success ? of(response.chargeId) : throwError(() => toTriggerRejection(response)))),
        tap(() => this.#cartTimingService.markSaleStep('terminal')),
      );
  }

  #triggerAndTrack(params: SettleSplitOfOneParams): Observable<void> {
    return this.#createLegPayment(params).pipe(
      tap(chargeId => this.#trackTriggeredLeg(params, chargeId)),
      map((): undefined => void 0),
    );
  }

  #trackTriggeredLeg(params: SettleSplitOfOneParams, chargeId: string | undefined): void {
    if (chargeId !== undefined && params.settlesOnTrigger !== true) {
      this.#trackReservedLeg(chargeId);
    }
  }

  #postLegCancel(session: ActiveSession, childTransactionId: string): void {
    this.#paymentsService
      .cancelPayment({ cartId: session.cartId, childTransactionId, partnerId: session.partnerId })
      .pipe(
        take(1),
        catchError((error: unknown) => {
          // The abort could not be delivered: the leg may still capture on the terminal. Nothing
          // more can be done client-side (the whole-session state stays consistent server-side),
          // but the failed cancel must not disappear silently.
          this.#errorLogger.print(error);
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  /**
   * Resolves the cancel-vs-first-poll race: polls the session status until the `in_progress` leg
   * becomes visible and aborts it then. Stops silently when the latest leg is already terminal
   * (nothing left to abort), when a new settle starts (never abort the next attempt's leg), or after
   * a bounded wait. The poll deliberately outlives the modal session — its whole point is to clean
   * up after the user has already unwound.
   */
  #cancelLegOnceKnown(session: ActiveSession): void {
    timer(0, PENDING_CANCEL_POLL_INTERVAL_MS)
      .pipe(
        exhaustMap(() =>
          this.#paymentsService.getPaymentsStatus({
            cartId: session.cartId,
            parentTransactionId: session.parentTransactionId,
            partnerId: session.partnerId,
          }),
        ),
        map(getLatestSplit),
        filter((split): split is PaymentSplit => split !== null && split.status === 'in_progress'),
        take(1),
        takeUntil(timer(PENDING_CANCEL_MAX_WAIT_MS)),
        takeUntil(this.#settleStarted),
        catchError((error: unknown) => {
          this.#errorLogger.print(error);
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(split => this.#postLegCancel(session, split.id));
  }

  #pollUntilPaid({ cartId, expectedPaidAmount, parentTransactionId, partnerId, targetAmount }: SettleSplitOfOneParams): Observable<void> {
    // exhaustMap (not switchMap): a status request slower than the poll interval must be allowed to
    // finish — cancelling and re-issuing it every tick means a degraded backend never answers and
    // the payment falsely times out, exactly when polling is the webhook-loss fallback.
    return timer(0, POLL_INTERVAL_MS).pipe(
      exhaustMap(() => this.#paymentsService.getPaymentsStatus({ cartId, parentTransactionId, partnerId })),
      tap(status => this.#trackActiveLeg(status)),
      map(status => this.#resolvePollState(status, expectedPaidAmount ?? targetAmount)),
      first((state): state is { kind: 'paid' } => state.kind === 'paid'),
      map((): undefined => void 0),
      takeUntil(this.#pollDeadline(expectedPaidAmount ?? targetAmount)),
    );
  }

  #pollDeadline(sessionPaidAmount: number): Observable<never> {
    return timer(MAX_POLL_DURATION_MS).pipe(
      switchMap(() => this.#legCancel.pipe(first(state => state !== 'pending'))),
      switchMap(state => {
        if (state === 'unpaid') {
          return EMPTY;
        }
        if (state === 'paid') {
          return timer(PAID_LEG_SETTLE_MAX_WAIT_MS).pipe(
            switchMap(() => throwError(() => new PaymentAlreadyTakenError(sessionPaidAmount))),
          );
        }
        return throwError(() => new TimeoutError());
      }),
    );
  }

  #trackReservedLeg(chargeId: string): void {
    this.#activeChildTransactionId = chargeId;
    this.#lastSeenChildTransactionId = chargeId;
  }

  /** Remembers the in-progress leg id (or clears it) so a cancel can target the current leg (§8). */
  #trackActiveLeg(status: PaymentsStatus): void {
    const latestSplit = getLatestSplit(status);
    if (latestSplit === null) {
      return;
    }
    this.#activeChildTransactionId = latestSplit.status === 'in_progress' ? latestSplit.id : null;
    this.#lastSeenChildTransactionId = latestSplit.id;
  }

  #resolvePollState(status: PaymentsStatus, expectedPaidAmount: number): PollState {
    // Resolve from the latest split (the current attempt): a terminal state (hard failure, or a
    // cancelled/declined leg) surfaces the backend reason as an error right away instead of polling
    // until the timeout; the caller reports it as a modal payment failure so the modal shows the
    // payment-failed screen and offers a resend. Earlier failed legs left in the history are ignored.
    const failure = getPaymentFailure(status);
    if (failure !== null) {
      if (this.#legCancel.value === 'pending' || this.#legCancel.value === 'paid') {
        return { kind: 'pending' };
      }
      throw new Error(failure.reason ?? 'checkout.payment.failed');
    }
    // The amount comparison is the webhook-loss fallback; `expectedPaidAmount` is the cumulative
    // session paid amount this leg must reach (see SettleSplitOfOneParams).
    if (isLatestSplitPaid(status) || toCents(status.splitPaidAmount) >= toCents(expectedPaidAmount)) {
      return { kind: 'paid' };
    }
    return { kind: 'pending' };
  }
}
