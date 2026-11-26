import { inject, Injectable } from '@angular/core';

import { CHECKOUT_PAYMENT_DRIVER } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-driver.model';
import type { CheckoutPaymentRequest } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-port.model';
import { FiscalComplianceBlockPrepareError } from '@fz-original/app/shared/services/fiscal-compliance-block/fiscal-compliance-block-prepare.error';
import { EMPTY, merge, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

import type { PaymentType } from '../../../checkout/models/payment-type.enum';
import { ChargeMismatchError } from '../../models/expected-charge.model';
import { OneStepPurchaseService, PayOneStepResponse } from '../one-step-purchase/one-step-purchase.service';

/** Component-owned pieces the resend loop needs: how to run a purchase and where UI state lives. */
export interface ModalResendHooks {
  /** Runs the full purchase pipeline against the component's current UI state. */
  payInOneStep: () => Observable<PayOneStepResponse | null>;
  /** Propagates the (re)selected method to the component state the pipeline reads. */
  setPaymentType: (paymentType: PaymentType) => void;
  /**
   * Cleanup for when the modal session ends while a resend was still awaited (the cashier dismissed
   * the payment-failed screen): the purchase stream completes without a value, so component error
   * handling never runs — anything it would have cleaned up must be cleaned up here.
   */
  onSessionEndedWithoutResend?: () => void;
}

type ResendSignal = { kind: 'resend'; request: CheckoutPaymentRequest } | { kind: 'sessionCancelRequested' } | { kind: 'sessionEnded' };

/**
 * Runs a modal-driven pay-in-full purchase with the checkout modal's resend loop.
 *
 * In the checkout-modal flow a failed payment keeps the modal open on the payment-failed screen,
 * which offers a resend action. Each resend re-emits on the driver's `methodSelected$`: when a settle
 * context exists (checkout was opened), a same-method retry re-triggers only the existing checkout;
 * otherwise — e.g. the first leg failed before `createCheckout` succeeded — the whole purchase
 * pipeline runs again. A method change always re-runs the whole pipeline. The wait also serves the
 * modal's whole-session cancel (B2BO-7939): once the pipeline errored, nothing else listens to
 * `sessionCancelRequested$` — most importantly after a booking failure on a fully paid session, where
 * the customer is charged but has no order — so the cancel is performed here and its outcome reported
 * back to the modal. The wait ends when the modal session ends — the stream then completes without
 * emitting, after the `onSessionEndedWithoutResend` cleanup hook.
 */
@Injectable({
  providedIn: 'root',
})
export class CheckoutModalResendService {
  readonly #checkoutPaymentDriver = inject(CHECKOUT_PAYMENT_DRIVER);
  readonly #oneStepPurchaseService = inject(OneStepPurchaseService);

  payWithModalResend(hooks: ModalResendHooks): Observable<PayOneStepResponse | null> {
    return hooks.payInOneStep().pipe(catchError((error: unknown) => this.#awaitResend(error, hooks)));
  }

  #awaitResend(error: unknown, hooks: ModalResendHooks): Observable<PayOneStepResponse | null> {
    if (error instanceof FiscalComplianceBlockPrepareError || error instanceof ChargeMismatchError) {
      return throwError(() => error);
    }
    if (!this.#checkoutPaymentDriver.isActive()) {
      return throwError(() => error);
    }
    const resendRequested$: Observable<ResendSignal> = this.#checkoutPaymentDriver.methodSelected$.pipe(
      map(request => ({ kind: 'resend', request })),
    );
    const sessionCancelRequested$: Observable<ResendSignal> = this.#checkoutPaymentDriver.sessionCancelRequested$.pipe(
      map(() => ({ kind: 'sessionCancelRequested' })),
    );
    const sessionEnded$: Observable<ResendSignal> = this.#checkoutPaymentDriver.sessionEnded$.pipe(map(() => ({ kind: 'sessionEnded' })));
    return merge(resendRequested$, sessionCancelRequested$, sessionEnded$).pipe(
      take(1),
      switchMap((signal: ResendSignal) => {
        if (signal.kind === 'sessionEnded') {
          hooks.onSessionEndedWithoutResend?.();
          return EMPTY;
        }
        if (signal.kind === 'sessionCancelRequested') {
          // The modal user confirmed the whole-session cancel with the settle loop no longer
          // listening (it completed — booking failure — or never ran). Serve it here and keep
          // waiting: on success the modal ends the session from its Cancel Confirmation step
          // (`sessionEnded$`), on failure its retryable cancel-failed step re-emits the request.
          return this.#oneStepPurchaseService.cancelModalSession().pipe(switchMap(() => this.#awaitResend(error, hooks)));
        }
        hooks.setPaymentType(signal.request.paymentType);
        const retrySettleOnly = signal.request.retry === true && this.#oneStepPurchaseService.hasModalSettleContext();
        const attempt$ = retrySettleOnly
          ? this.#oneStepPurchaseService.retryModalSettleSplitOfOne(signal.request.paymentType)
          : hooks.payInOneStep();
        return attempt$.pipe(catchError((attemptError: unknown) => this.#awaitResend(attemptError, hooks)));
      }),
    );
  }
}
