import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { QuickSetupTrackingContext } from '../models/plan-tracking.model';

export interface QuickSetupPreviewReturnToScheduleData extends QuickSetupTrackingContext {
  plan_id: number;
}

export const quickSetupPreviewReturnToSchedule = defineEvent<QuickSetupPreviewReturnToScheduleData>('quickSetup.previewReturnToSchedule');
