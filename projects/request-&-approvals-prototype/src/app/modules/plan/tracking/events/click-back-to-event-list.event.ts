import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { PlanReviewBackVariant } from '../models/plan-tracking.model';

export interface ClickBackToEventListData {
  plan_id: number;
  variant: PlanReviewBackVariant;
}

export const clickBackToEventList = defineEvent<ClickBackToEventListData>('click.backToEventList');
