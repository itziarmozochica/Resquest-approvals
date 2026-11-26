import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ConfirmRejectReviewData {
  plan_id: number;
}

export const confirmRejectReview = defineEvent<ConfirmRejectReviewData>('confirm.rejectReview');
