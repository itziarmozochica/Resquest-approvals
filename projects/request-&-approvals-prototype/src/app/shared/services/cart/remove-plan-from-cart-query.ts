import { Cart } from '../../models/cart/cart.model';

export interface RemovePlanFromCartQuery {
  cart: Cart;
  cartId: string;
  mainPlanId: number;
  partnerId: number;
  useSessionItemLines?: boolean;
}
