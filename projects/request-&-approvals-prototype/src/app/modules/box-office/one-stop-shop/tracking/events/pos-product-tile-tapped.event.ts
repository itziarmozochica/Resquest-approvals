import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosProductTileType = 'add-on' | 'category' | 'product' | 'ticket';

export interface PosProductTileTappedData {
  tileType: PosProductTileType;
}

export const posProductTileTapped = defineEvent<PosProductTileTappedData>('pos.product.tile.tapped');
