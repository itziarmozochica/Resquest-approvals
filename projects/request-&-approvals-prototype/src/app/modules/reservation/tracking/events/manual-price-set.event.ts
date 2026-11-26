import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ManualPriceScreen } from '../models/manual-price-tracking.model';

export interface ManualPriceSetData {
  cataloguePrice: number;
  channel: string;
  currency: string;
  hasReason: boolean;
  manualPrice: number;
  screen: ManualPriceScreen;
  sessionTypeId: number | null;
}

export const manualPriceSet = defineEvent<ManualPriceSetData>('reservation.manualPrice.set');
