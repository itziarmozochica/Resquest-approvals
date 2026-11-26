import { inject, Injectable, Signal, signal } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { PaymentFlowFeatureService } from '@fz-original/app/modules/box-office/shared/services/payment-flow-feature/payment-flow-feature.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { CartService } from '@fz-original/app/shared/services/cart/cart.service';
import { catchError, defaultIfEmpty, defer, map, Observable, of, shareReplay, tap } from 'rxjs';

import {
  ReservationSettlementEntry,
  ReservationSettlementQueryParams,
  ReservationSettlementRejectionReason,
  ReservationSettlementSession,
  ReservationSettlementStartParams,
  ReservationSettlementStartResult,
  validateReservationSettlementEntry,
} from '../models/reservation-settlement-session.model';

@Injectable({
  providedIn: 'root',
})
export class ReservationSettlementSessionService {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #cartService = inject(CartService);
  readonly #paymentFlowFeatureService = inject(PaymentFlowFeatureService);
  readonly #session = signal<ReservationSettlementSession | null>(null);
  #epoch = 0;

  readonly session: Signal<ReservationSettlementSession | null> = this.#session.asReadonly();

  clear(): void {
    this.#epoch += 1;
    this.#session.set(null);
  }

  isEntry(queryParams: ReservationSettlementQueryParams): boolean {
    return this.#isEnabled() && validateReservationSettlementEntry(queryParams) !== null;
  }

  start(params: ReservationSettlementStartParams): Observable<ReservationSettlementStartResult> {
    return defer(() => this.#start$(params)).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  #apply(result: ReservationSettlementStartResult, cartId: string, epoch: number): void {
    if (epoch !== this.#epoch) {
      return;
    }

    if (result.status === 'started') {
      this.#session.set(result.session);
      return;
    }

    this.#session.set(null);
    this.#logRejection(result.reason, cartId);
  }

  #cartUnavailable(): ReservationSettlementStartResult {
    return { reason: 'cart_unavailable', status: 'rejected' };
  }

  #decide(response: BaseResponse<Cart | null>, partnerId: number, entry: ReservationSettlementEntry): ReservationSettlementStartResult {
    if (response.error != null) {
      return this.#cartUnavailable();
    }

    const cart = response.data;

    if (cart == null) {
      return { reason: 'cart_not_found', status: 'rejected' };
    }

    if (!this.#hasSessionItems(cart)) {
      return { reason: 'empty_cart', status: 'rejected' };
    }

    if (cart.confirmedAt != null) {
      return { reason: 'already_purchased', status: 'rejected' };
    }

    if (cart.preparedAt == null) {
      return { reason: 'not_prepared', status: 'rejected' };
    }

    return {
      session: Object.freeze({
        cart: cart.clone(),
        cartId: entry.cartId,
        partnerId,
        reservationId: entry.reservationId,
      }),
      status: 'started',
    };
  }

  #hasSessionItems(cart: Cart): boolean {
    for (const sessionItems of cart.sessionItemsByDatetime?.values() ?? []) {
      if (sessionItems.some((sessionItem: CartSession) => sessionItem.units > 0)) {
        return true;
      }
    }
    return false;
  }

  #isEnabled(): boolean {
    return this.#paymentFlowFeatureService.isNewPaymentFlowEnabled();
  }

  #logRejection(reason: ReservationSettlementRejectionReason, cartId: string | null): void {
    this.#datadogLogService.logWarn('Reservation settlement entry rejected', { cart_id: cartId, reason });
  }

  #reject(reason: ReservationSettlementRejectionReason, cartId: string | null): ReservationSettlementStartResult {
    this.#session.set(null);
    this.#logRejection(reason, cartId);
    return { reason, status: 'rejected' };
  }

  #start$(params: ReservationSettlementStartParams): Observable<ReservationSettlementStartResult> {
    this.#epoch += 1;
    const epoch = this.#epoch;

    if (!this.#isEnabled()) {
      return of(this.#reject('invalid_params', params.queryParams['reservation_cart_id'] ?? null));
    }

    const entry = validateReservationSettlementEntry(params.queryParams);

    if (entry === null) {
      return of(this.#reject('invalid_params', params.queryParams['reservation_cart_id'] ?? null));
    }

    return this.#cartService.getCart(params.partnerId, entry.cartId).pipe(
      map((response: BaseResponse<Cart | null>) => this.#decide(response, params.partnerId, entry)),
      catchError(() => of(this.#cartUnavailable())),
      defaultIfEmpty(this.#cartUnavailable()),
      tap((result: ReservationSettlementStartResult) => this.#apply(result, entry.cartId, epoch)),
    );
  }
}
