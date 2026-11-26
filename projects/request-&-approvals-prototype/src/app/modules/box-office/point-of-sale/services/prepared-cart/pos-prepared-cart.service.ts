import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable, Injector } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import {
  PayOneStepQuery,
  PreparedCartForPayment,
} from '@fz-original/app/modules/box-office/ticketing/services/one-step-purchase/one-step-purchase.service';
import { BookingQuestion } from '@fz-original/app/shared/booking-questions/models';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { BaseErrorResponse } from '@fz-original/app/shared/models/base-response';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { PreparedCartBookingQuestionsStatus } from '@fz-original/app/shared/models/cart/prepared-cart-booking-questions-status.enum';
import { defer, EMPTY, MonoTypeOperatorFunction, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap, take, tap } from 'rxjs/operators';

import {
  POS_PREPARED_CART_RELEASE_REASON_BY_STEP,
  PosPreparedCartReleaseReason,
  PosPreparedCartReplacer,
  PosPreparedCartStep,
  PreparedCartBookingQuestionsUnreadableError,
} from '../../models/pos-prepared-cart.model';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosCartService } from '../cart/pos-cart.service';
import { PosUiPortService } from '../pos-ui-port/pos-ui-port.service';
import { TicketingCoreService } from '../ticketing-core/ticketing-core.service';

interface PreparedCartWindow {
  readonly cart: Cart;
  readonly replaceCart: PosPreparedCartReplacer;
  step: PosPreparedCartStep;
}

/**
 * The prepared-cart window of a Point of Sale sale (B2BO-9578): the cart
 * is prepared right before the booking questions step, the questions come with that prepare, and the payment starts
 * from that cart instead of preparing it again. A sale that leaves before its payment starts gets its cart replaced
 * by an unprepared one, so nothing pays the released cart.
 *
 * It is a **lego domain service**, outside the facade: `PosPurchaseService` injects it and `TicketingStrategy` never
 * learns about it. Every dialog it needs goes through `PosUiPortService`.
 */
@Injectable()
export class PosPreparedCartService {
  readonly #core = inject(TicketingCoreService);
  readonly #datadog = inject(DatadogLogService);
  readonly #injector = inject(Injector);
  readonly #spinner = inject(SpinnerService);
  readonly #state = inject(PosTicketingState);
  readonly #ui = inject(PosUiPortService);
  #isDestroyed = false;
  #window: PreparedCartWindow | null = null;

  constructor() {
    // Registered before any pay pipeline subscribes, so it runs before their teardown on the page's destruction.
    inject(DestroyRef).onDestroy(() => (this.#isDestroyed = true));
  }

  /** Marks the step the sale reaches, so a release says where the operator left. */
  enterStep(step: PosPreparedCartStep): void {
    if (this.#window !== null) {
      this.#window.step = step;
    }
  }

  /**
   * Read once per pay attempt: the window opens only where the payment prepares with the single 2.1 call, since the
   * questions come in that call's answer. A distributor session keeps today's pipeline.
   */
  isEnabled(): boolean {
    return this.#core.canPrepareInOneCall();
  }

  /**
   * Prepares the cart with the payment's own 2.1 prepare, holds every question of the cart that came with it, and asks
   * the pre-booking ones in the same dialog as before (it reads them from what is held, so no request leaves). Emits
   * once the operator answered, or when there is nothing to ask, and completes empty when the dialog is closed.
   *
   * Questions partners could not read are requested once on the same cart; when that request fails too, or the answer
   * is malformed, it errors with `PreparedCartBookingQuestionsUnreadableError`. Pipe the pay pipeline through
   * {@link releaseOnError} so an error replaces the cart before the error handler runs.
   */
  prepareAndAskPreBookingQuestions$(query: PayOneStepQuery, replaceCart: PosPreparedCartReplacer): Observable<void> {
    const questions$ = defer(() => {
      this.#spinner.show();
      return this.#core.prepareCartWithBookingQuestions(query);
    }).pipe(
      tap((prepared: PreparedCartForPayment) => {
        this.#window = { cart: prepared.cart, replaceCart, step: PosPreparedCartStep.BOOKING_QUESTIONS };
      }),
      switchMap((prepared: PreparedCartForPayment) => this.#readBookingQuestions$(prepared)),
      take(1),
      finalize(() => this.#spinner.hide()),
    );
    return questions$.pipe(
      switchMap(() =>
        this.#ui.request('bookingQuestions', {
          cart: this.#state.cart,
          customer: this.#state.customer ?? undefined,
          phase: 'pre',
        }),
      ),
      switchMap(answered => (answered ? of(void 0) : EMPTY)),
    );
  }

  /**
   * Replaces the prepared cart when the sale ends before its payment started; does nothing otherwise. Without a
   * `reason` it is the step the sale reached. A replacement that fails gets today's "cart discarded after error"
   * handling, except on a real-time map, which keeps its cart as `handlePaymentError` does. On a page being left
   * nothing is replaced: leaving owns the cart. Never errors.
   */
  release$(reason?: PosPreparedCartReleaseReason): Observable<void> {
    const preparedWindow = this.#window;
    if (preparedWindow === null) {
      return of(void 0);
    }
    this.#window = null;
    const cartId = preparedWindow.cart.id!;
    this.#core.dropHeldBookingQuestions(cartId);
    if (this.#isDestroyed) {
      return of(void 0);
    }
    const releaseReason = reason ?? POS_PREPARED_CART_RELEASE_REASON_BY_STEP[preparedWindow.step];
    const context = { cartId, partnerId: this.#state.partner?.id, reason: releaseReason, step: preparedWindow.step };
    return preparedWindow.replaceCart(releaseReason).pipe(
      tap(replaced => this.#datadog.logInfo('[POS-PREPARED-CART] Prepared cart released before payment', { ...context, ...replaced })),
      map((): void => undefined),
      catchError((error: unknown) => {
        this.#datadog.logWarn('[POS-PREPARED-CART] Prepared cart release failed', {
          ...context,
          httpStatus: error instanceof HttpErrorResponse ? error.status : null,
        });
        this.#handleReleaseFailure();
        return of(void 0);
      }),
    );
  }

  /** Replaces the prepared cart, when one is still waiting for its payment, before the error reaches the subscriber. */
  releaseOnError<T>(): MonoTypeOperatorFunction<T> {
    return catchError((error: unknown) => this.release$(PosPreparedCartReleaseReason.ERROR).pipe(switchMap(() => throwError(() => error))));
  }

  /** The prepared cart for the payment of `cartId`, which closes the window; `null` when there is none for it. */
  takePreparedCart(cartId: string): Cart | null {
    const preparedWindow = this.#window;
    if (preparedWindow === null || preparedWindow.cart.id !== cartId) {
      return null;
    }
    this.#window = null;
    return preparedWindow.cart;
  }

  /** Lazy: `PosPurchaseService` injects this service eagerly, and the domain services reach each other lazily. */
  get #cart(): PosCartService {
    return this.#injector.get(PosCartService);
  }

  /**
   * Mirrors `PosCartService.discardCartAfterPaymentError`, whose discard needs a cart a failed recreate may have left null.
   * A real-time cart is kept, as `PosPurchaseService.handlePaymentError` keeps it: discarding it empties the OneBox basket
   * while the map still shows the seats. The window is already closed, so the next payment prepares that cart again.
   */
  #handleReleaseFailure(): void {
    if (this.#state.isRealTimeSeating) {
      return;
    }
    if (this.#state.cart?.id != null) {
      this.#cart.discardCartAfterPaymentError();
      return;
    }
    this.#state.nonConfirmedCart = null;
    this.#cart.showModal('boxOffice.cart.discardedAfterError.title', 'boxOffice.cart.discardedAfterError.message');
  }

  #readBookingQuestions$(prepared: PreparedCartForPayment): Observable<BookingQuestion[]> {
    const cartId = prepared.cart.id!;
    const { bookingQuestions } = prepared;
    if (bookingQuestions.status === PreparedCartBookingQuestionsStatus.AVAILABLE) {
      this.#core.holdBookingQuestions(cartId, bookingQuestions.questions);
      return of(bookingQuestions.questions);
    }
    const context = { cartId, partnerId: this.#state.partner?.id, status: bookingQuestions.status };
    if (bookingQuestions.status === PreparedCartBookingQuestionsStatus.MALFORMED) {
      this.#datadog.logWarn('[POS-PREPARED-CART] Booking questions malformed in the prepare answer, stopping the sale', context);
      return throwError(() => new PreparedCartBookingQuestionsUnreadableError('errors.generic'));
    }
    this.#datadog.logInfo('[POS-PREPARED-CART] Booking questions missing from the prepare answer, requesting them', context);
    return this.#core.getBookingQuestions(cartId).pipe(
      tap(questions => this.#core.holdBookingQuestions(cartId, questions)),
      catchError((error: BaseErrorResponse | undefined) => {
        this.#datadog.logWarn('[POS-PREPARED-CART] Booking questions request failed, stopping the sale', { ...context, code: error?.code });
        return throwError(() => new PreparedCartBookingQuestionsUnreadableError(error?.message ?? 'errors.generic'));
      }),
    );
  }
}
