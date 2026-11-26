import { inject, Injectable } from '@angular/core';

import { STORAGE_SERVICE } from '@fz/storage';

const CHECKOUT_CART_ID_KEY = 'box_office_checkout_cart_id';
const CHECKOUT_USER_ID_KEY = 'box_office_checkout_user_id';

@Injectable({
  providedIn: 'root',
})
export class CheckoutUserStorageService {
  readonly #storage = inject(STORAGE_SERVICE);

  getUserIdForCart(cartId: string | undefined): number | null {
    if (!cartId || this.#storage.get<string>(CHECKOUT_CART_ID_KEY) !== cartId) {
      return null;
    }
    const userId = Number(this.#storage.get<number>(CHECKOUT_USER_ID_KEY));
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  }

  setUserIdForCart(cartId: string | undefined, userId: number | undefined): void {
    if (!cartId || !userId) {
      return;
    }
    this.#storage.set(CHECKOUT_CART_ID_KEY, cartId);
    this.#storage.set(CHECKOUT_USER_ID_KEY, userId);
  }
}
