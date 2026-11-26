import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { QuickSetupTrackingContext } from '../models/plan-tracking.model';

export interface QuickSetupContentSavedData extends QuickSetupTrackingContext {
  category: string;
  name: string;
  plan_id: number;
  venue: string;
}

export const quickSetupContentSaved = defineEvent<QuickSetupContentSavedData>('quickSetup.contentSaved');
