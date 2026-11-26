import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ClickCancelRejectReviewData {
  plan_id: number;
}

export const clickCancelRejectReview = defineEvent<ClickCancelRejectReviewData>('click.cancelRejectReview');
