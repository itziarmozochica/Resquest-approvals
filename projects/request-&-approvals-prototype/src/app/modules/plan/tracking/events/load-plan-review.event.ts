import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface LoadPlanReviewData {
  is_reviewer: boolean;
  plan_id: number;
  review_status: string | null;
}

export const loadPlanReview = defineEvent<LoadPlanReviewData>('load.planReview');
