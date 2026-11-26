import { Cart } from '@fz-original/app/shared/models/cart/cart.model';

/** The cart the Point of Sale just paid, kept in memory for the confirmation screen's resolver. */
export interface PurchasedCartHandoff {
  cart: Cart;
  cartId: string;
  partnerId: number;
}
