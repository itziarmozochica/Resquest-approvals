import { computed, Injectable, InjectionToken, signal } from '@angular/core';

import {
  CartAdjustmentPrice,
  CartAdjustmentPriceCalculation,
  CartAdjustmentPriceCalculationFinal,
  CartAdjustmentPriceOperation,
  CartAdjustmentPriceWithOperation,
} from '@fz-original/app/shared/cart/models/cart-adjustment-price.model';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';

import { getCartTotalMoneyBeforeDeposit } from '../utils/deposit-cart-breakdown.util';

export const CART_DETAIL_SERVICE = new InjectionToken<CartDetailService>('CART_DETAIL_SERVICE');

export interface CartModification {
  oldCartSessionsByNewDatetime: Map<string, CartSession[]>;
  oldDatetimeByNewDatetime: Map<string, string>;
}

@Injectable()
export class CartDetailService {
  cart = signal<Cart | null>(null);
  /**
   * The adjustment the cart already holds in the backend (a quote being modified). The preview and the
   * update keep a stored adjustment when the request omits it, so switching the override off cannot drop
   * it: the adjustment service previews amount 0 instead, until the backend accepts an explicit null.
   */
  persistedAdjustment = signal<CartAdjustmentPrice | null>(null);
  adjustmentOverTotalCart = computed(() => {
    const cart = this.cart();
    return this.getAdjustmentOverTotal(getCartTotalMoneyBeforeDeposit(cart), cart?.adjustment);
  });
  hasCoupon = computed(() => !!this.cart()?.appliedCoupon && this.cart()?.appliedCoupon?.code !== this.cart()?.adjustment?.couponCode);
  hasDiscountsCoupons = computed(() => !!this.cart()?.coupons?.discounts?.length);
  hasPromotion = computed(() => !!this.cart()?.appliedPromotion);
  isValidAdjustmentPrice = computed(() => this.validateAdjustmentPrice(this.cart()?.adjustment));
  modifications = signal<CartModification | null>(null);
  updatingCart = signal(false);

  clearCart(): void {
    this.cart.set(null);
  }

  getAdjustmentOverTotal(cartTotal: Money | null = null, adjustment?: CartAdjustmentPrice | null): Money {
    const result = new Money(0, cartTotal?.currency ?? '');
    if (!adjustment?.amount || !cartTotal) {
      return result;
    }
    result.amount = adjustment.total?.amount ?? 0;

    switch (adjustment.calculation) {
      case CartAdjustmentPriceCalculationFinal.FINAL:
        result.amount = adjustment.amount - cartTotal.amount;
        break;
    }

    if ((adjustment as CartAdjustmentPriceWithOperation).operation === CartAdjustmentPriceOperation.SUBTRACT) {
      result.amount = -result.amount;
    }

    return result;
  }

  getAdjustmentRounding(): Money | null {
    const cart = this.cart();
    if (!cart?.adjustment || !cart.total?.currency) {
      return null;
    }

    return this.#adjustmentRoundingFromApi(cart);
  }

  #adjustmentRoundingFromApi(cart: Cart): Money | null {
    if (!cart.adjustment?.rounded) {
      return null;
    }
    const raw = cart.adjustment.rounded.amount as unknown;
    if (raw === null || raw === undefined) {
      return null;
    }
    const currency = cart.total!.currency;
    const money =
      typeof raw === 'number' ? new Money(raw, currency) : new Money(Number((raw as Money).amount), (raw as Money).currency ?? currency);
    if (money.amount == null || Number.isNaN(money.amount) || Math.abs(money.amount) < 1e-9) {
      return null;
    }
    return money;
  }

  getCartModifications(): CartModification | null {
    return this.modifications() ?? null;
  }

  setCart(cart: Cart): void {
    this.cart.set(cart);
  }

  setCartModifications(modifications: CartModification): void {
    this.modifications.set(modifications);
  }

  setUpdatingCart(value: boolean): void {
    this.updatingCart.set(value);
  }

  validateAdjustmentPrice(adjustment?: CartAdjustmentPrice | null): boolean {
    if (!adjustment || adjustment.amount === undefined) {
      return true;
    }

    switch (adjustment.calculation) {
      case CartAdjustmentPriceCalculationFinal.FINAL:
        return true;
      case CartAdjustmentPriceCalculation.PERCENTAGE:
        return adjustment.amount <= 100;
      case CartAdjustmentPriceCalculation.FIXED:
        if ((adjustment as CartAdjustmentPriceWithOperation).operation === CartAdjustmentPriceOperation.SUBTRACT) {
          const total = this.cart()?.totalWithoutOverride?.amount;
          if (typeof total === 'undefined') {
            return true;
          }
          return adjustment.amount <= total;
        }
        return true;
      default:
        return true;
    }
  }
}
