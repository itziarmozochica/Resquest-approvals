import { CartSessionManualPriceChange, CartSessionManualPriceEntry } from '../../models/cart/cart-session-manual-price.model';
import { CartSession } from '../../models/cart/cart-session.model';

/** A cart line addressed by its `Cart.sessionItemsByDatetime` key and the line itself. */
export interface CartSessionSelection {
  cartSession: CartSession;
  datetime: string;
}

/** A cart line addressed by its `Cart.sessionItemsByDatetime` key and session id. */
export interface CartLineRef {
  readonly datetime: string;
  readonly sessionId: number;
}

/** Quantity rules of a cart line, mirrored from the ticket selector (`TicketType`) of its slot. */
export interface CartLineLimits {
  readonly max: number | null;
  readonly min: number;
  readonly step: number;
}

export interface CartSessionUnitsChange extends CartSessionSelection {
  readonly units: number;
}

/** A manual price entered on the line `cartSession` of the slot `datetime` (GAME-1722). */
export interface CartLinePriceChange extends CartSessionSelection {
  concept: string;
  entry: CartSessionManualPriceEntry;
}

/** The last manual price sent from a line (`change`) or cleared on it (`change` null), until the backend confirms it. */
export interface CartLinePricePending {
  readonly change: CartSessionManualPriceChange | null;
  readonly lineKey: string;
}
