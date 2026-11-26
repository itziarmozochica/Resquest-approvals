import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ConfirmSubmitForReviewData {
  plan_id: number;
}

export const confirmSubmitForReview = defineEvent<ConfirmSubmitForReviewData>('confirm.submitForReview');
