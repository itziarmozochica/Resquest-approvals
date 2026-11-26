import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CartService } from '@fz-original/app/shared/services/cart/cart.service';
import { DiscardCartQuery, DiscardCartRoute } from '@fz-original/app/shared/services/cart/discard-cart-query';
import { Observable, tap } from 'rxjs';

import { getDiscardFailureContext, isBenignDiscardFailure } from '../../utils/discard-cart-fiscal.util';

@Injectable({
  providedIn: 'root',
})
export class CashRegisterCartDiscardService {
  readonly #cartService = inject(CartService);
  readonly #datadogLogService = inject(DatadogLogService);

  discard(query: DiscardCartQuery): Observable<BaseResponse<boolean | null>> {
    const cashRegisterQuery: DiscardCartQuery = { ...query, viaCashRegister: true };
    const route = this.#cartService.discardCartRoute(cashRegisterQuery);
    return this.#cartService.discardCart(cashRegisterQuery).pipe(tap(response => this.#logFailure(cashRegisterQuery, route, response)));
  }

  #logFailure(query: DiscardCartQuery, route: DiscardCartRoute, response: BaseResponse<boolean | null>): void {
    if (response.error == null) {
      return;
    }
    const failure = getDiscardFailureContext(response);
    const payload = { cartId: query.cartId, partner_id: query.partnerId, route, ...failure };
    if (isBenignDiscardFailure(failure)) {
      this.#datadogLogService.logInfo('[BoxOffice] Cart discard failed', payload);
      return;
    }
    this.#datadogLogService.logWarn('[BoxOffice] Cart discard failed', payload);
  }
}
