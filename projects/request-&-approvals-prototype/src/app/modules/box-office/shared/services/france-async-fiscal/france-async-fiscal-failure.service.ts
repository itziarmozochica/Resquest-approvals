import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CartService } from '@fz-original/app/shared/services/cart/cart.service';
import {
  catchError,
  defaultIfEmpty,
  defer,
  EMPTY,
  exhaustMap,
  filter,
  finalize,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  timeout,
  timer,
} from 'rxjs';

import { getDiscardFailureContext, isDiscardedWithFiscalAbortPending } from '../../utils/discard-cart-fiscal.util';
import { shouldWatchAsyncFiscalFailure } from '../efsta-fiscal/efsta-fiscal.util';
import { SplitPaymentProgressService } from '../split-payment-progress/split-payment-progress.service';
import { CartFiscalSigningState, CartPaymentsStatusResponse } from '../split-payment/models/split-payment-response.model';
import { SplitPaymentService } from '../split-payment/split-payment.service';
import { FranceAsyncFiscalModalService } from './france-async-fiscal-modal.service';
import {
  isAsyncFiscalFailureStatus,
  isAsyncFiscalReleasePendingStatus,
  isCartBookingLost,
  isFiscalSigningRetryable,
} from './france-async-fiscal-status.util';
import { FranceAsyncFiscalContext } from './models/france-async-fiscal-context.model';

export const FRANCE_ASYNC_FISCAL_POLL_INTERVAL_MS = 1500;
export const FRANCE_ASYNC_FISCAL_POLL_MAX_ATTEMPTS = 200;
/** Watch cycles whose Sign again / Cancel sale prompt closed without an answer before the watch gives up asking. */
export const FRANCE_ASYNC_FISCAL_UNANSWERED_PROMPT_LIMIT = 3;

const FRANCE_ASYNC_FISCAL_STATUS_REQUEST_TIMEOUT_MS = 10_000;

interface FiscalOutcomePoll {
  awaitingForMs: number;
  response: CartPaymentsStatusResponse | null;
}

const NO_FISCAL_OUTCOME: FiscalOutcomePoll = { awaitingForMs: 0, response: null };

function hasField<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
  return typeof value === 'object' && value !== null && key in value;
}

/** Reads `key` off an unknown value (an HTTP error, its body) without claiming any shape for it. */
function fieldOf<K extends string>(value: unknown, key: K): unknown {
  return hasField(value, key) ? value[key] : undefined;
}

@Injectable({
  providedIn: 'root',
})
export class FranceAsyncFiscalFailureService {
  readonly #splitPaymentService = inject(SplitPaymentService);
  readonly #modalService = inject(FranceAsyncFiscalModalService);
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #cartService = inject(CartService);
  readonly #splitPaymentProgressService = inject(SplitPaymentProgressService);
  readonly #inFlightTransactionIds = new Set<string>();
  readonly #cartWatchTeardown = new Map<string, Subject<void>>();
  readonly #handlingFailureCartIds = new Set<string>();
  readonly #cancelAcceptedCartIds = new Set<string>();
  readonly #unresolvedSigningCartIds = new Set<string>();
  readonly #bookingFailureCartIds = new Set<string>();
  readonly #unansweredPromptsByCartId = new Map<string, number>();
  readonly #heldSigningCartIds = new Set<string>();
  readonly #lastSigningStateByCartId = new Map<string, CartFiscalSigningState | null>();

  isHandlingAnyFiscalFailure(): boolean {
    return this.#handlingFailureCartIds.size > 0;
  }

  isHandlingFiscalFailure(cartId: string): boolean {
    return this.#handlingFailureCartIds.has(cartId);
  }

  isWatchingCart(cartId: string): boolean {
    return this.#cartWatchTeardown.has(cartId);
  }

  markBookingFailure(cartId: string): void {
    this.#bookingFailureCartIds.add(cartId);
  }

  stopWatchingCart(cartId: string): void {
    if (this.#handlingFailureCartIds.has(cartId)) {
      return;
    }
    const teardown = this.#cartWatchTeardown.get(cartId);
    if (teardown === undefined) {
      return;
    }
    teardown.next();
    teardown.complete();
    this.#cartWatchTeardown.delete(cartId);
  }

  watchForFiscalCancellation(context: FranceAsyncFiscalContext): Observable<boolean> {
    if (!shouldWatchAsyncFiscalFailure(context.paymentCheckout, context.blockBooker, context.blocksPurchaseOnFailure)) {
      return of(false);
    }

    // The registration side effects (in-flight id, per-cart supersede, log) must happen on
    // subscription, not on call: a built-but-never-subscribed watch would otherwise leak the
    // transaction id for good and tear down the live watch of the same cart.
    return defer(() => {
      if (this.#inFlightTransactionIds.has(context.parentTransactionId)) {
        return of(false);
      }
      this.#inFlightTransactionIds.add(context.parentTransactionId);

      const supersede$ = this.#supersedePreviousCartWatch(context.cartId);

      this.#datadogLogService.logInfo(`[BoxOffice] FR async fiscal failure watch started for cart ${context.cartId}`, {
        cartId: context.cartId,
        transactionId: context.parentTransactionId,
      });

      return this.#watchUntilResolved(context).pipe(
        takeUntil(supersede$),
        finalize(() => {
          this.#inFlightTransactionIds.delete(context.parentTransactionId);
          this.#handlingFailureCartIds.delete(context.cartId);
          this.#bookingFailureCartIds.delete(context.cartId);
          this.#cancelAcceptedCartIds.delete(context.cartId);
          this.#unansweredPromptsByCartId.delete(context.cartId);
          this.#heldSigningCartIds.delete(context.cartId);
          this.#lastSigningStateByCartId.delete(context.cartId);
          if (this.#unresolvedSigningCartIds.delete(context.cartId) === false) {
            this.#splitPaymentProgressService.releaseFiscalSigningHeld(context.cartId);
          }
          if (this.#cartWatchTeardown.get(context.cartId) === supersede$) {
            this.#cartWatchTeardown.delete(context.cartId);
          }
        }),
      );
    });
  }

  /**
   * An unanswered prompt neither signs nor cancels: the sale stays held as it is and the watch asks
   * again on its next poll, which only re-prompts if the session still offers the choice. Capped so a
   * dialog that keeps closing on its own cannot keep the watch alive for good; past the cap the watch
   * ends the way an expired one does (see {@link #endWatchWithoutOutcome}), still without touching the sale.
   */
  #askAgainOnNextCycle(context: FranceAsyncFiscalContext): Observable<boolean> {
    const unanswered = (this.#unansweredPromptsByCartId.get(context.cartId) ?? 0) + 1;
    this.#unansweredPromptsByCartId.set(context.cartId, unanswered);
    this.#datadogLogService.logWarn('[BoxOffice] FR async fiscal signing prompt closed without an answer', {
      cartId: context.cartId,
      transactionId: context.parentTransactionId,
      unanswered,
    });
    if (unanswered >= FRANCE_ASYNC_FISCAL_UNANSWERED_PROMPT_LIMIT) {
      return this.#endWatchWithoutOutcome(context);
    }
    return this.#watchUntilResolved(context, FRANCE_ASYNC_FISCAL_POLL_INTERVAL_MS, true);
  }

  #askCashierToRetryOrCancel(context: FranceAsyncFiscalContext, response: CartPaymentsStatusResponse): Observable<boolean> {
    this.#datadogLogService.logWarn('[BoxOffice] FR async fiscal signing failed with the payments kept', {
      cartId: context.cartId,
      fiscalSigningState: response.fiscal_signing_state,
      transactionId: context.parentTransactionId,
    });
    this.#heldSigningCartIds.add(context.cartId);
    this.#splitPaymentProgressService.markFiscalSigningHeld(context.cartId);
    return this.#modalService.showFiscalSigningRetryPrompt().pipe(
      switchMap(retry => {
        if (retry === null) {
          return this.#askAgainOnNextCycle(context);
        }
        this.#unansweredPromptsByCartId.delete(context.cartId);
        return retry ? this.#retrySigning(context) : this.#cancelSigning(context);
      }),
    );
  }

  /**
   * A 200 from cancel is not proof the sale was cancelled: partners answers the same when it finds
   * the signing already completed, and in that case it creates the order. The session status is the
   * only thing that knows, so the watch is resumed and the ordinary outcome handling decides.
   */
  #cancelSigning(context: FranceAsyncFiscalContext): Observable<boolean> {
    return this.#splitPaymentService.cancelFiscalSigning(context.partnerId, context.cartId, context.parentTransactionId).pipe(
      tap(() => this.#cancelAcceptedCartIds.add(context.cartId)),
      map(() => true),
      catchError((error: unknown) => this.#reportSigningActionError(context, 'cancel', error)),
      switchMap(resume => this.#resumeWatchAfterSigningAction(context, resume)),
    );
  }

  #discardCartAndCloseProgressModal(context: FranceAsyncFiscalContext): Observable<boolean> {
    return this.#cartService.discardCart({ cartId: context.cartId, partnerId: context.partnerId, viaCashRegister: true }).pipe(
      map(result => this.#isCartDiscarded(context, result)),
      catchError(error => {
        this.#datadogLogService.logWarn('[BoxOffice] FR async fiscal failure: discard cart errored', {
          cartId: context.cartId,
          error,
          transactionId: context.parentTransactionId,
        });
        return of(false);
      }),
      tap(() => this.#splitPaymentProgressService.closeProgressModal(context.cartId)),
    );
  }

  /**
   * A watch that ends without an outcome (poll budget spent, or the prompt cap reached) leaves the
   * sale as it is. Releasing the hold would bring back the progress modal's generic Cancel and
   * refund, which fever2#56952 does not block yet, so it is only released when the last state this
   * watch read was `failed`: nothing is on the fiscal journal then. `in_flight` means a registration
   * was sent, `not_registered` can be the window before partners arms the row, and a retry sent
   * since the last read leaves nothing known; all of those keep the hold and send the cashier to
   * support, as an unresolvable signing does. A watch that never held the signing has nothing to keep.
   */
  #endWatchWithoutOutcome(context: FranceAsyncFiscalContext): Observable<boolean> {
    if (this.#heldSigningCartIds.has(context.cartId) === false) {
      return of(false);
    }
    const lastSigningState = this.#lastSigningStateByCartId.get(context.cartId) ?? null;
    if (lastSigningState === 'failed') {
      return of(false);
    }
    this.#datadogLogService.logWarn('[BoxOffice] FR async fiscal watch ended unresolved with the signing held', {
      cartId: context.cartId,
      lastSigningState,
      transactionId: context.parentTransactionId,
    });
    return this.#reportUnresolvableSigning(context);
  }

  #errorCodeOf(error: unknown): string | undefined {
    const code = fieldOf(fieldOf(fieldOf(error, 'error'), 'error'), 'code');
    return typeof code === 'string' ? code : undefined;
  }

  #errorReasonOf(error: unknown): string | undefined {
    const reason = fieldOf(fieldOf(fieldOf(fieldOf(error, 'error'), 'error'), 'data'), 'reason');
    return typeof reason === 'string' ? reason : undefined;
  }

  #handleCancelledSale(context: FranceAsyncFiscalContext, response: CartPaymentsStatusResponse): Observable<boolean> {
    this.#splitPaymentProgressService.markFiscalFailureDetected(context.cartId);
    context.onFiscalFailureDetected?.();
    const bookingFailed = this.#bookingFailureCartIds.has(context.cartId) || isCartBookingLost(response);
    this.#datadogLogService.logWarn('[BoxOffice] FR async sale cancelled without a ticket', {
      bookingFailed,
      cartId: context.cartId,
      transactionId: context.parentTransactionId,
    });
    return this.#discardCartAndCloseProgressModal(context).pipe(
      switchMap(cartDiscarded => this.#showOutcomeMessage(bookingFailed, cartDiscarded)),
      map(() => true),
    );
  }

  #isCartDiscarded(context: FranceAsyncFiscalContext, result: BaseResponse<boolean | null> | null): boolean {
    if (result != null && result.error == null) {
      return true;
    }
    const abortPending = result != null && isDiscardedWithFiscalAbortPending(result);
    const message = abortPending
      ? '[BoxOffice] FR async fiscal failure: cart discarded without registering the fiscal abort'
      : '[BoxOffice] FR async fiscal failure: discard cart failed';
    this.#datadogLogService.logWarn(message, {
      cartId: context.cartId,
      partner_id: context.partnerId,
      transactionId: context.parentTransactionId,
      ...(result != null && getDiscardFailureContext(result)),
    });
    return abortPending;
  }

  #pollUntilFiscalOutcome(
    context: FranceAsyncFiscalContext,
    startDelayMs: number,
    releasePendingAlreadySeen: boolean,
  ): Observable<FiscalOutcomePoll> {
    return defer(() => {
      // A resumed watch has already seen the session awaiting its booker, so it must recognise a
      // `cancelled` that went through while the prompt was open or while a response was lost.
      let releasePendingSeen = releasePendingAlreadySeen;
      let awaitingSince: number | null = releasePendingAlreadySeen ? Date.now() : null;
      return timer(startDelayMs, FRANCE_ASYNC_FISCAL_POLL_INTERVAL_MS).pipe(
        take(FRANCE_ASYNC_FISCAL_POLL_MAX_ATTEMPTS),
        exhaustMap(() =>
          this.#splitPaymentService.getCartPaymentsStatus(context.partnerId, context.cartId, context.parentTransactionId).pipe(
            timeout(FRANCE_ASYNC_FISCAL_STATUS_REQUEST_TIMEOUT_MS),
            catchError(error => {
              this.#datadogLogService.logWarn('[BoxOffice] FR async fiscal polling error', {
                cartId: context.cartId,
                error,
                transactionId: context.parentTransactionId,
              });
              return EMPTY;
            }),
          ),
        ),
        filter(response => {
          this.#lastSigningStateByCartId.set(context.cartId, response.fiscal_signing_state ?? null);
          if (awaitingSince === null && isAsyncFiscalReleasePendingStatus(response.status) === true) {
            awaitingSince = Date.now();
          }
          const awaitingForMs = awaitingSince === null ? 0 : Date.now() - awaitingSince;
          const stillOfferable =
            this.#cancelAcceptedCartIds.has(context.cartId) === false && isFiscalSigningRetryable(response, awaitingForMs);
          const isResolved = isAsyncFiscalFailureStatus(response.status, releasePendingSeen) || stillOfferable;
          releasePendingSeen = releasePendingSeen || isAsyncFiscalReleasePendingStatus(response.status);
          return isResolved;
        }),
        take(1),
        map(response => ({ awaitingForMs: awaitingSince === null ? 0 : Date.now() - awaitingSince, response })),
        defaultIfEmpty(NO_FISCAL_OUTCOME),
      );
    });
  }

  /**
   * Only `FISCAL_SIGNING_IN_PROGRESS` comes back to the cashier on its own. The rest never will, so
   * telling them to wait would leave them in front of a prompt that never reappears.
   *
   * Resolves whether the watch should resume. A lost response (timeout, 5xx, unreachable) may still
   * have gone through, so the session decides; a refusal that will not change on its own
   * (unresolvable, 403, 404) ends the watch instead of asking the cashier the same question again.
   */
  #reportSigningActionError(context: FranceAsyncFiscalContext, action: 'cancel' | 'retry', error: unknown): Observable<boolean> {
    const code = this.#errorCodeOf(error);
    this.#datadogLogService.logWarn(`[BoxOffice] FR async fiscal signing ${action} failed`, {
      cartId: context.cartId,
      code,
      error,
      transactionId: context.parentTransactionId,
    });
    if (code === 'FISCAL_SIGNING_IN_PROGRESS') {
      if (this.#errorReasonOf(error) === 'signing_outcome_unknown') {
        return this.#reportUnresolvableSigning(context);
      }
      return this.#modalService.showFiscalSigningStillRunning().pipe(map(() => true));
    }
    if (code === 'FISCAL_SIGNING_NOT_RETRYABLE' || code === 'CART_NOT_SIGNABLE') {
      return this.#reportUnresolvableSigning(context);
    }
    const status = fieldOf(error, 'status');
    const resume = status !== 403 && status !== 404;
    return this.#modalService.showFiscalSigningActionFailed().pipe(map(() => resume));
  }

  /**
   * The sale may be on the fiscal journal and partners refuses to touch it, so the till must not
   * offer its generic Cancel and refund either: fever2#56952 does not block that path yet. It is not
   * a fiscal failure, though: nothing is being refunded, so the progress modal gets its own state,
   * which shows its Close (it cannot be dismissed otherwise) with a "payments held, contact support"
   * message, while Cancel and refund stays disabled on the held signing.
   */
  #reportUnresolvableSigning(context: FranceAsyncFiscalContext): Observable<boolean> {
    this.#unresolvedSigningCartIds.add(context.cartId);
    this.#splitPaymentProgressService.markFiscalSigningUnresolvable(context.cartId);
    context.onFiscalFailureDetected?.();
    return this.#modalService.showFiscalSigningUnresolvable().pipe(map(() => false));
  }

  #resolveOutcome(
    context: FranceAsyncFiscalContext,
    response: CartPaymentsStatusResponse | null,
    awaitingForMs: number,
  ): Observable<boolean> {
    if (response === null) {
      this.#datadogLogService.logWarn('[BoxOffice] FR async fiscal watch expired unresolved', {
        cartId: context.cartId,
        transactionId: context.parentTransactionId,
      });
      return this.#endWatchWithoutOutcome(context);
    }
    // Keeping the cart alive is the whole point of this branch: the legs are still collected and a
    // retry can still turn them into a ticket, so nothing is discarded until the cashier gives up.
    this.#handlingFailureCartIds.add(context.cartId);
    if (this.#cancelAcceptedCartIds.has(context.cartId) === false && isFiscalSigningRetryable(response, awaitingForMs)) {
      return this.#askCashierToRetryOrCancel(context, response);
    }
    return this.#handleCancelledSale(context, response);
  }

  /**
   * Every resume restarts the book-result poll, not only a 200: a signing still in progress or a
   * lost response can still end in an order, and if the original poll ran out while the cashier
   * waited on the EFR, nothing else would print the tickets.
   */
  #resumeWatchAfterSigningAction(context: FranceAsyncFiscalContext, resume: boolean): Observable<boolean> {
    if (!resume) {
      return of(false);
    }
    this.#splitPaymentProgressService.restartBookResultPolling(context.cartId);
    return this.#watchUntilResolved(context, FRANCE_ASYNC_FISCAL_POLL_INTERVAL_MS, true);
  }

  #retrySigning(context: FranceAsyncFiscalContext): Observable<boolean> {
    return defer(() => {
      // Once a retry is sent the `failed` read before it no longer says nothing was registered.
      this.#lastSigningStateByCartId.delete(context.cartId);
      return this.#splitPaymentService.retryFiscalSigning(context.partnerId, context.cartId, context.parentTransactionId);
    }).pipe(
      map(() => true),
      catchError((error: unknown) => this.#reportSigningActionError(context, 'retry', error)),
      switchMap(resume => this.#resumeWatchAfterSigningAction(context, resume)),
    );
  }

  #showOutcomeMessage(bookingFailed: boolean, cartDiscarded: boolean): Observable<void> {
    if (bookingFailed) {
      return cartDiscarded ? this.#modalService.showBookingFailure() : this.#modalService.showBookingFailureError();
    }
    return cartDiscarded ? this.#modalService.showFranceAsyncFiscalFailure() : this.#modalService.showFranceAsyncFiscalFailureError();
  }

  #supersedePreviousCartWatch(cartId: string): Subject<void> {
    const previous = this.#cartWatchTeardown.get(cartId);
    if (previous !== undefined) {
      previous.next();
      previous.complete();
    }
    const teardown = new Subject<void>();
    this.#cartWatchTeardown.set(cartId, teardown);
    return teardown;
  }

  /**
   * `startDelayMs` is what keeps a cashier who keeps pressing retry from turning this into a tight
   * loop: a resumed watch waits a poll interval before it can ask them anything again.
   *
   * A watch that is polling holds no failure, so it releases the cart: otherwise a resumed watch
   * would keep `stopWatchingCart` a no-op and block the till until the poll budget ran out.
   */
  #watchUntilResolved(context: FranceAsyncFiscalContext, startDelayMs = 0, releasePendingAlreadySeen = false): Observable<boolean> {
    return defer(() => {
      this.#handlingFailureCartIds.delete(context.cartId);
      return this.#pollUntilFiscalOutcome(context, startDelayMs, releasePendingAlreadySeen).pipe(
        switchMap(({ awaitingForMs, response }) => this.#resolveOutcome(context, response, awaitingForMs)),
      );
    });
  }
}
