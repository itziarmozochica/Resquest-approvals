import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { QuickSetupTrackingContext } from '../models/plan-tracking.model';

export interface QuickSetupPreviewConfirmedData extends QuickSetupTrackingContext {
  plan_id: number;
}

export const quickSetupPreviewConfirmed = defineEvent<QuickSetupPreviewConfirmedData>('quickSetup.previewConfirmed');
