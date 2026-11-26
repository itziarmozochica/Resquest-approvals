import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ManualPriceRefusedAction } from '../models/manual-price-tracking.model';

export interface ManualPriceRefusedData {
  action: ManualPriceRefusedAction;
  channel: string;
  /** The cart status code of the refusal (fever2 GAME-1722 spec 6.2). */
  code: number;
}

export const manualPriceRefused = defineEvent<ManualPriceRefusedData>('reservation.manualPrice.refused');
