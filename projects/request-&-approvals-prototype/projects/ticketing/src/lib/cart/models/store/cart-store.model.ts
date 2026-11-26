import type { Cart } from '../cart.model';

export interface CartStoreState {
  cart: Cart | null;
  cartError: unknown;
  isDiscarding: boolean;
  isLoadingCart: boolean;
  isPreparing: boolean;
  isUpdatingCart: boolean;
}

export const initialState: CartStoreState = {
  cart: null,
  cartError: null,
  isDiscarding: false,
  isLoadingCart: false,
  isPreparing: false,
  isUpdatingCart: false,
};
