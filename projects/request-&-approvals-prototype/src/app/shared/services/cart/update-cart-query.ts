import { CartAdjustmentPrice } from '@fz-original/app/shared/cart/models/cart-adjustment-price.model';

import { CartSessionItemLine } from '../../models/cart/cart-session-item-line.model';
import { CartB2bEmployeeRequestBody } from '../../models/cart/cart-session-manual-price.model';
import { CartSession } from '../../models/cart/cart-session.model';
import { SeatingMapState } from '../../models/seating-map/seating-map.model';

export interface UpdateCartQuery {
  cartId: string;
  partnerId: number;
  sessionItemsByDatetime: Map<string, CartSession[]>;
  adjustment?: CartAdjustmentPrice;
  bundleIds?: number[];
  hasSeating?: boolean;
  overrideCapacity?: boolean;
  seatingHoldTokensBySessionId?: Map<string, string>;
  seatingMapState?: SeatingMapState;
  sessionItemLines?: CartSessionItemLine[];
  useSessionItemLines?: boolean;
  /** Sent as `b2b_employee` whenever the body carries `manual_prices`. */
  actingEmployee?: CartB2bEmployeeRequestBody;
  /** Add-on sessions travel as unpriced lines instead of forcing the `session_items` shape (reservation flow only). */
  allowAddOnLines?: boolean;
}
