import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ConfirmReleaseReviewData {
  plan_id: number;
}

export const confirmReleaseReview = defineEvent<ConfirmReleaseReviewData>('confirm.releaseReview');
