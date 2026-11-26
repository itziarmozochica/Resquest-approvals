import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { DuplicatePlanSource } from '../models/plan-tracking.model';

export interface SuccessDuplicatePlanData {
  duplicatedPlanId: number;
  planId: number;
  source: DuplicatePlanSource;
}

export const successDuplicatePlan = defineEvent<SuccessDuplicatePlanData>('success.duplicate.plan');
