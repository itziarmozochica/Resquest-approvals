import { InjectionToken, type Signal } from '@angular/core';

import { type CartSessionManualPriceChange } from '@fz-original/app/shared/models/cart/cart-session-manual-price.model';
import { type Money } from '@fz-original/app/shared/models/money.model';

/**
 * A host that lets the operator set a manual price per cart line. The cart detail offers the editor only on the lines the host
 * prices, and never decides on its own which lines, permissions or carts qualify.
 */
export interface CartLinePriceControl {
  /** The catalogue price per ticket of every line that offers the editor, by session id. */
  readonly catalogUnitPriceBySessionId: Signal<ReadonlyMap<number, Money>>;
  /** A translation key explaining why the editor is off for the whole cart, or `null` when it is on. */
  readonly disabledHint: Signal<string | null>;
  apply(datetime: string, sessionId: number, change: CartSessionManualPriceChange): void;
  clear(datetime: string, sessionId: number): void;
}

export const CART_LINE_PRICE_CONTROL = new InjectionToken<CartLinePriceControl>('CART_LINE_PRICE_CONTROL');
