import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosCartTileType = 'add-on' | 'ticket' | 'product';
export type PosCartSource = 'from_tile' | 'from_search' | 'from_cart' | 'from_seating' | 'from_scanner';
export type PosCartAction = 'add_item' | 'remove_item';

export interface PosCartItemQuantityChangeData {
  action: PosCartAction;
  planId: number;
  price: number | null;
  quantity: number;
  sessiontypeId: number | null;
  source: PosCartSource;
  tileType: PosCartTileType;
}

export const posCartItemQuantityChange = defineEvent<PosCartItemQuantityChangeData>('pos.cart.item.quantity.change');
