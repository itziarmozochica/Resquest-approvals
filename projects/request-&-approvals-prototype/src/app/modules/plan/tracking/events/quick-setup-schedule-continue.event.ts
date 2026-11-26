import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { QuickSetupTrackingContext } from '../models/plan-tracking.model';

export interface QuickSetupScheduleContinueData extends QuickSetupTrackingContext {
  plan_id: number;
  recurring_dates: boolean;
  recurring_time_slots: boolean;
}

export const quickSetupScheduleContinue = defineEvent<QuickSetupScheduleContinueData>('quickSetup.scheduleContinue');
