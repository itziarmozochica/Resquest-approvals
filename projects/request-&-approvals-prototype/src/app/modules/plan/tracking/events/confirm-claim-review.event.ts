import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ConfirmClaimReviewData {
  plan_id: number;
}

export const confirmClaimReview = defineEvent<ConfirmClaimReviewData>('confirm.claimReview');
