import { Injectable } from '@angular/core';

import { Cart } from '@fz-original/app/shared/models/cart/cart.model';

import { PurchasedCartHandoff } from '../models/purchased-cart-handoff.model';

/**
 * One-shot, in-memory handoff of the paid cart from the Point of Sale to the confirmation screen, so the
 * screen's resolver reads the cart it already has instead of requesting it again (B2BO-9521; its flag was
 * removed in B2BO-9690). A handoff is taken once; the next sale's replaces one never taken.
 */
@Injectable({
  providedIn: 'root',
})
export class PurchasedCartHandoffService {
  #handoff: PurchasedCartHandoff | null = null;

  discard(handoff: PurchasedCartHandoff): void {
    if (this.#handoff === handoff) {
      this.#handoff = null;
    }
  }

  handOff(handoff: PurchasedCartHandoff): void {
    this.#handoff = handoff;
  }

  take(partnerId: number, cartId: string): Cart | null {
    const handoff = this.#handoff;
    this.#handoff = null;
    if (handoff === null || handoff.partnerId !== partnerId || handoff.cartId !== cartId) {
      return null;
    }
    return handoff.cart;
  }
}
