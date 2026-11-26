import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { CartUtil } from '@fz-original/app/shared/utils/cart.util';

/**
 * The cart the contact step decides on. The contact modal opens while the server cart is still being
 * created, so the selection being sent is the source; the server cart is only used when it already
 * holds that same selection, or when there is no selection at all.
 */
export function resolveContactInformationCart(serverCart: Cart | null, selection: Cart | null): Cart | null {
  if (selection === null) {
    return serverCart;
  }
  if (serverCart !== null && serverCart.hasSameContent(selection)) {
    return serverCart;
  }
  return selection;
}

/** Same rule the cart adapter applies to a server cart, so a local selection answers it too. */
export function contactInformationCartHasSessionsInFuture(cart: Cart | null): boolean {
  if (cart === null) {
    return false;
  }
  if (!cart.timezone) {
    return cart.hasSessionsInFuture;
  }
  return CartUtil.hasSessionsInFuture(cart.sessionItemsByDatetime, cart.timezone);
}
