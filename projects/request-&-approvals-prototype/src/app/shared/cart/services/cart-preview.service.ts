import { HttpClient, HttpResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SessionItem, SessionItemData } from '@fz-original/app/modules/sessions/session-item.model';
import {
  CartAdjustmentPrice,
  CartAdjustmentPriceCalculation,
  CartAdjustmentPriceCalculationFinal,
} from '@fz-original/app/shared/cart/models/cart-adjustment-price.model';
import { CartPreview, CartPreviewServiceParams } from '@fz-original/app/shared/cart/models/cart-preview.model';
import { Cart, CartData } from '@fz-original/app/shared/models/cart/cart.model';
import { CartAdapter } from '@fz-original/app/shared/services/cart/cart.adapter';
import { environment } from '@fz-original/environments/environment';
import { catchError, Observable, of, switchMap } from 'rxjs';

import { BaseResponse } from '../../models/base-response';
import { ErrorResponseUtils } from '../../utils/error-response.utils';

@Injectable({
  providedIn: 'root',
})
export class CartPreviewService {
  #cartAdapter = inject(CartAdapter);
  #destroyRef = inject(DestroyRef);
  #httpClient = inject(HttpClient);

  getCartPreview({
    cartId,
    partnerId,
    sessionItems,
    adjustment,
    heldSessions = [],
  }: CartPreviewServiceParams): Observable<BaseResponse<Cart>> {
    const path = `${environment.apiBaseUrl}/partners/${partnerId}/carts/${cartId}/preview/`;
    const body: CartPreview = {
      session_items: sessionItems.map(sessionItem => this.#getSessionItemBody(sessionItem)),
      ...(adjustment && { adjustment: this.#getAdjustmentBody(adjustment) }),
    };

    return this.#httpClient
      .post<{ data: CartData } | { error: { code: string; message: string } }>(path, body, { observe: 'response' })
      .pipe(
        switchMap((response: HttpResponse<{ data: CartData } | { error: { code: string; message: string } } | null>) => {
          if (response.status === 204) {
            return of(new BaseResponse<Cart>(null, null));
          }
          if (response.body && 'error' in response.body && response.body.error) {
            return of(
              new BaseResponse<Cart>(null, {
                code: response.body.error.code,
                message: response.body.error.message,
              }),
            );
          }
          // the 204 and error bodies returned above, so the body carries data here
          return of(this.#cartAdapter.fromApi(new BaseResponse((response.body as { data: CartData }).data, null), heldSessions));
        }),
        takeUntilDestroyed(this.#destroyRef),
        catchError(error => {
          const errorResponse = ErrorResponseUtils.getErrorResponseError(error);

          return of(new BaseResponse<Cart>(null, errorResponse));
        }),
      );
  }

  #getAdjustmentBody(adjustment: CartAdjustmentPrice): CartAdjustmentPrice {
    if (
      adjustment.calculation === CartAdjustmentPriceCalculation.FIXED ||
      adjustment.calculation === CartAdjustmentPriceCalculation.PERCENTAGE
    ) {
      return {
        amount: adjustment.amount ?? 0,
        calculation: adjustment.calculation,
        operation: adjustment.operation!,
        concept: adjustment.concept,
      };
    } else if (adjustment.calculation === CartAdjustmentPriceCalculationFinal.FINAL) {
      return {
        amount: adjustment.amount ?? 0,
        calculation: adjustment.calculation,
        concept: adjustment.concept,
      };
    } else {
      throw new Error('Unknown calculation type for CartAdjustmentPrice');
    }
  }

  #getSessionItemBody(sessionItem: SessionItem): SessionItemData {
    const body: SessionItemData = {
      session_id: sessionItem.sessionId,
      ticket_number: sessionItem.ticketNumber,
    };

    if (sessionItem.seats !== undefined) {
      body.seats = sessionItem.seats.map(seat => ({
        label: seat.seatLabel || seat.seatReference,
        reference: seat.seatReference,
      }));
    }

    return body;
  }
}
