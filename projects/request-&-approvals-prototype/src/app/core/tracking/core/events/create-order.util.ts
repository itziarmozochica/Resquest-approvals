import { Cart } from '../../../../shared/models/cart/cart.model';

export interface MultiplanCartFlags {
  has_seats: boolean;
  has_multi_time_slot: boolean;
  has_multi_plan: boolean;
}

export function getMultiplanCartFlags(cart: Cart | null): MultiplanCartFlags {
  const sessionItemsSize = cart?.sessionItemsByDatetime?.size ?? 0;
  const mainPlanSize = cart?.getSessionItemsByMainPlanAndDatetime()?.size ?? 0;

  return {
    has_seats: cart?.hasSeating ?? false,
    has_multi_time_slot: sessionItemsSize > 1 && mainPlanSize === 1,
    has_multi_plan: mainPlanSize > 1,
  };
}
