import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ConfirmApproveReviewData {
  plan_id: number;
}

export const confirmApproveReview = defineEvent<ConfirmApproveReviewData>('confirm.approveReview');
