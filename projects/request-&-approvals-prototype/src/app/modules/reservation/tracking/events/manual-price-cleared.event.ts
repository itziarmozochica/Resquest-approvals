import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ManualPriceScreen } from '../models/manual-price-tracking.model';

export interface ManualPriceClearedData {
  channel: string;
  screen: ManualPriceScreen;
  sessionTypeId: number | null;
}

export const manualPriceCleared = defineEvent<ManualPriceClearedData>('reservation.manualPrice.cleared');
