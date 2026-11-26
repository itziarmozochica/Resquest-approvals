import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { DuplicatePlanSource } from '../models/plan-tracking.model';

export interface ClickDuplicatePlanData {
  planId: number;
  source: DuplicatePlanSource;
}

export const clickDuplicatePlan = defineEvent<ClickDuplicatePlanData>('click.duplicate.plan');
