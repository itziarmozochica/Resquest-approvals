import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { inject, Injectable, InjectionToken, signal } from '@angular/core';

import { AdyenErrorCode } from '@fz-original/app/app/enums/payment-checkout-adyen.enum';
import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { AdyenCheckout } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { BookResultService } from '@fz-original/app/shared/services/payment-gateways/book-resut/book-result.service';
import { BookResult, BookStatusEnum } from '@fz-original/app/shared/services/payment-gateways/book-resut/models/book-result-status.model';
import { EMPTY, Observable, of, Subject, throwError } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

import { SplitPaymentProgressModalComponent } from '../../components/split-payment-progress-modal/split-payment-progress-modal.component';
import { SplitPaymentService } from '../split-payment/split-payment.service';

export interface SplitPaymentProgressParams {
  cartId: string;
  currency: string;
  deviceId: string;
  partnerId: number;
  paymentGateway: string;
  placeId: number;
  planId: number;
  seed: number;
  transactionId: string;
  userId: number;
  totalAmount?: number;
}

/** Injection token for modal usage. Params are provided via NgbModalOptions.injector so they are available before ngOnInit. */
export const SPLIT_PAYMENT_PARAMS = new InjectionToken<SplitPaymentProgressParams>('SplitPaymentProgressParams');

export type SplitPaymentProgressDialogResult =
  | { cancelled: true }
  | { fiscalFailureClosed: true }
  | { orderId?: number; transactionId?: string };

@Injectable({
  providedIn: 'root',
})
export class SplitPaymentProgressService {
  #bookResultService = inject(BookResultService);
  #dialog = inject(Dialog);
  #paymentService = inject(PaymentService);
  #splitPaymentService = inject(SplitPaymentService);
  readonly #activeDialogByCart = new Map<string, DialogRef<SplitPaymentProgressDialogResult>>();
  readonly #bookResultRestarts = new Subject<string>();
  readonly #fiscalFailureCartIds = new Set<string>();
  readonly #fiscalSigningHeldCartIds = signal<ReadonlySet<string>>(new Set());
  readonly #fiscalSigningReleases = new Subject<string>();
  readonly #fiscalSigningUnresolvableCartIds = signal<ReadonlySet<string>>(new Set());

  /** Restarts the progress modal's book-result poll, see {@link restartBookResultPolling}. */
  bookResultRestarts(cartId: string): Observable<void> {
    return this.#bookResultRestarts.pipe(
      filter(id => id === cartId),
      map((): void => undefined),
    );
  }

  cancelChildSplit(partnerId: number, cartId: string, childTransactionId: string): Observable<{ success: boolean; error?: string }> {
    return this.#splitPaymentService.cancelChildSplit(partnerId, cartId, childTransactionId);
  }
  cancelPayment(params: {
    currency: string;
    partnerId: number;
    placeId: number;
    planId: number;
    transactionId: string;
  }): Observable<undefined> {
    return this.#paymentService.cancelPayment({
      currency: params.currency,
      partnerId: params.partnerId,
      paymentCheckout: PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET,
      placeId: params.placeId,
      planId: params.planId,
      transactionId: params.transactionId,
    });
  }

  /**
   * Set by the France async fiscal watch the moment it detects the failure, i.e. before the discard
   * round trip that precedes `closeProgressModal`. The progress modal reads it so a `cancelled` session
   * its own slower poll cannot attribute (no release-pending status seen yet) is still recognised as a
   * fiscal failure instead of painting the generic poll-verification error underneath.
   */
  markFiscalFailureDetected(cartId: string): void {
    this.#fiscalFailureCartIds.add(cartId);
  }

  isFiscalFailureDetected(cartId: string): boolean {
    return this.#fiscalFailureCartIds.has(cartId);
  }

  /**
   * Set by the France async fiscal watch while a sale with the payments kept is the cashier's to
   * resolve: from the Sign again / Cancel sale prompt until the watch ends. The progress modal disables
   * its own Cancel and refund meanwhile, so a generic refund cannot race the fiscal action. A signal,
   * because the modal is already on screen when this changes.
   */
  markFiscalSigningHeld(cartId: string): void {
    this.#fiscalSigningHeldCartIds.update(ids => new Set(ids).add(cartId));
  }

  releaseFiscalSigningHeld(cartId: string): void {
    if (!this.#fiscalSigningHeldCartIds().has(cartId)) {
      return;
    }
    this.#fiscalSigningHeldCartIds.update(ids => {
      const next = new Set(ids);
      next.delete(cartId);
      return next;
    });
    this.#fiscalSigningReleases.next(cartId);
  }

  /**
   * Emits once the hold set by {@link markFiscalSigningHeld} is released for this cart, after
   * {@link isFiscalSigningHeld} already reads `false`. The progress modal reports here what it kept
   * back while the signing was held.
   */
  fiscalSigningReleases(cartId: string): Observable<void> {
    return this.#fiscalSigningReleases.pipe(
      filter(id => id === cartId),
      map((): void => undefined),
    );
  }

  isFiscalSigningHeld(cartId: string): boolean {
    return this.#fiscalSigningHeldCartIds().has(cartId);
  }

  /**
   * Set by the France async fiscal watch when partners can neither sign nor cancel the sale. Unlike a
   * fiscal failure nothing is being refunded: the payments stay held for support, so the progress
   * modal offers its Close with its own message instead of the automatic-refund one. A signal, because
   * the modal is already on screen when this changes.
   */
  markFiscalSigningUnresolvable(cartId: string): void {
    this.#fiscalSigningUnresolvableCartIds.update(ids => new Set(ids).add(cartId));
  }

  isFiscalSigningUnresolvable(cartId: string): boolean {
    return this.#fiscalSigningUnresolvableCartIds().has(cartId);
  }

  closeProgressModal(cartId: string): void {
    const dialogRef = this.#activeDialogByCart.get(cartId);
    if (dialogRef === undefined) {
      return;
    }
    dialogRef.close({ fiscalFailureClosed: true });
  }

  createCartForPolling(params: SplitPaymentProgressParams): Cart {
    const total = params.totalAmount != null ? new Money(params.totalAmount, params.currency) : new Money(0, params.currency);

    return new Cart(new Map(), undefined, params.cartId, undefined, total, null, null, null, undefined, null, null, params.userId);
  }

  createCheckoutResponseForPolling(params: SplitPaymentProgressParams): AdyenCheckout {
    return {
      deviceId: params.deviceId,
      transactionId: params.transactionId,
    };
  }

  getCartPaymentsStatus(partnerId: number, cartId: string, parentTransactionId: string) {
    return this.#splitPaymentService.getCartPaymentsStatus(partnerId, cartId, parentTransactionId);
  }

  openSplitPaymentProgressModal(params: SplitPaymentProgressParams): Observable<BaseResponse<BookResult>> {
    const dialogRef = this.#dialog.open<SplitPaymentProgressDialogResult, SplitPaymentProgressParams>(SplitPaymentProgressModalComponent, {
      backdropClass: 'ignt-modal--background-opaque',
      data: params,
      disableClose: true,
      panelClass: 'split-payment-progress-dialog',
    });
    this.#activeDialogByCart.set(params.cartId, dialogRef);
    this.#fiscalFailureCartIds.delete(params.cartId);

    return dialogRef.closed.pipe(
      switchMap(result => {
        this.#activeDialogByCart.delete(params.cartId);
        this.#fiscalFailureCartIds.delete(params.cartId);
        if (result && 'fiscalFailureClosed' in result) {
          return EMPTY;
        }
        if (result && 'cancelled' in result) {
          return throwError(
            () =>
              new BaseResponse(null, {
                errorCode: AdyenErrorCode.CancelledTransaction,
                message: `errors.adyen.${AdyenErrorCode.CancelledTransaction}`,
              }),
          );
        }
        const payload = result as { orderId?: number; transactionId?: string };
        return of(
          new BaseResponse(
            {
              orderId: payload?.orderId,
              status: BookStatusEnum.Completed,
              transactionId: payload?.transactionId,
            } as BookResult,
            null,
          ),
        );
      }),
    );
  }

  pollBookResult(params: SplitPaymentProgressParams, restartTrigger$: Subject<void>): Observable<BaseResponse<BookResult>> {
    const cart = this.createCartForPolling(params);
    const checkoutResponse = this.createCheckoutResponseForPolling(params);
    const paymentGateway = params.paymentGateway as PaymentCheckoutET;

    return this.#bookResultService.getBookResult(
      paymentGateway,
      params.partnerId,
      params.planId,
      params.placeId,
      cart,
      checkoutResponse,
      params.userId,
      restartTrigger$.asObservable(),
      {
        maxRetryAttempts: BookResultService.maxRetryAttemptsForSplitPaymentBookResult,
        retryDelayMs: BookResultService.retryTimeInMsForSplitPaymentBookResult,
      },
    );
  }

  /**
   * Called by the France async fiscal watch once partners accepts a fiscal-signing action. The modal's
   * book-result poll starts with the first leg and has a fixed budget, so a signing the cashier retried
   * minutes later would otherwise create the order with nobody left polling to print the tickets.
   */
  restartBookResultPolling(cartId: string): void {
    this.#bookResultRestarts.next(cartId);
  }

  triggerNextPayment(partnerId: number, cartId: string, amount?: number): Observable<{ success: boolean; error?: string }> {
    return this.#splitPaymentService.triggerNextPayment(partnerId, cartId, amount);
  }
}
