import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { catchError, map, Observable, of } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../../shared/models/base-response';
import { Cart, CartData } from '../../../../shared/models/cart/cart.model';
import { CartAdapter } from '../../../../shared/services/cart/cart.adapter';
import {
  adaptCartSessionTypeUpgrades,
  ApplySessionTypeUpgradeApiResponse,
  ApplySessionTypeUpgradeRequest,
  CartSessionTypeUpgrade,
  CartSessionTypeUpgradesApiResponse,
} from './kiosk-cart-upgrades.models';

export class CartUpgradeApiError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'CartUpgradeApiError';
    this.code = code;
  }
}

const EXPECTED_SKIP_HTTP_STATUSES = new Set([422]);
const CART_USER_REQUIRED_CODE = 987;
const SESSION_TYPE_UPGRADE_NOT_SUPPORTED_CODE = 986;

@Injectable({ providedIn: 'root' })
export class KioskCartUpgradesService {
  readonly #http = inject(HttpClient);
  readonly #cartAdapter = inject(CartAdapter);

  getCartSessionTypeUpgrades(partnerId: number, cartId: string, locale: string): Observable<CartSessionTypeUpgrade[] | null> {
    const url = this.#upgradesUrl(partnerId, cartId);
    return this.#http.get<CartSessionTypeUpgradesApiResponse>(url, { headers: { 'Accept-Language': locale } }).pipe(
      map(response => {
        if (response.error) {
          if (this.#isExpectedSkipCode(response.error.code)) {
            return null;
          }
          throw new CartUpgradeApiError(response.error.code, response.error.message);
        }
        const upgrades = response.data?.upgrades;
        return upgrades ? adaptCartSessionTypeUpgrades(upgrades) : null;
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && EXPECTED_SKIP_HTTP_STATUSES.has(error.status)) {
          return of(null);
        }
        throw error;
      }),
    );
  }

  applySessionTypeUpgrade(
    partnerId: number,
    cartId: string,
    upgrades: ApplySessionTypeUpgradeRequest[],
    targetMainPlanId: number | null,
  ): Observable<Cart> {
    const url = this.#applyUrl(partnerId, cartId);
    const body = {
      upgrades,
      partner_id: partnerId,
      ...(targetMainPlanId !== null && { target_main_plan_id: targetMainPlanId }),
    };
    return this.#http.post<ApplySessionTypeUpgradeApiResponse>(url, body).pipe(
      map(response => {
        if (response.error) {
          throw new CartUpgradeApiError(response.error.code, response.error.message);
        }
        if (!response.data) {
          throw new CartUpgradeApiError(0, 'apply-session-type-upgrade returned empty data');
        }
        const adapted = this.#cartAdapter.fromApi(new BaseResponse<CartData>(response.data as CartData, null));
        if (!adapted.data) {
          throw new CartUpgradeApiError(0, 'apply-session-type-upgrade: cart adapter returned null');
        }
        return adapted.data;
      }),
    );
  }

  #upgradesUrl(partnerId: number, cartId: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/carts/${cartId}/session-type-upgrades/`;
  }

  #applyUrl(partnerId: number, cartId: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/carts/${cartId}/apply-session-type-upgrade/`;
  }

  #isExpectedSkipCode(code: number): boolean {
    return code === CART_USER_REQUIRED_CODE || code === SESSION_TYPE_UPGRADE_NOT_SUPPORTED_CODE;
  }
}
