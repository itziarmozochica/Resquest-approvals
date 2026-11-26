import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { QuickSetupTrackingContext } from '../models/plan-tracking.model';

export interface QuickSetupInventorySavedData extends QuickSetupTrackingContext {
  addon_count: number;
  plan_id: number;
  ticket_count: number;
}

export const quickSetupInventorySaved = defineEvent<QuickSetupInventorySavedData>('quickSetup.inventorySaved');
