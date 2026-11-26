import { Injectable } from '@angular/core';

import { BaseResponse } from '../base-response';
import { PlanReviewRequestModel, PlanReviewRequestStatusData } from './plan-review-request.model';

@Injectable({
  providedIn: 'root',
})
export class PlanReviewRequestAdapter {
  fromApi(response: BaseResponse<PlanReviewRequestStatusData>): BaseResponse<PlanReviewRequestModel | null> {
    if (response.error || !response.data) {
      return new BaseResponse(null, response.error);
    }

    const data = response.data;
    const submitterId = this.#getSubmitterId(data.submitter);
    const reviewId = this.#getReviewId(data.review_id);
    const model = new PlanReviewRequestModel(
      data.status,
      reviewId,
      data.reviewer ?? null,
      submitterId,
      data.submitted_at ? new Date(data.submitted_at) : null,
      data.claimed_at ? new Date(data.claimed_at) : null,
      data.rejected_at ? new Date(data.rejected_at) : null,
      data.approved_at ? new Date(data.approved_at) : null,
      data.comments ?? null,
    );

    return new BaseResponse(model, null);
  }

  fromHistoryApi(response: BaseResponse<PlanReviewRequestStatusData[]>): BaseResponse<PlanReviewRequestModel[]> {
    if (response.error || !response.data) {
      return new BaseResponse([], response.error);
    }

    const models = response.data.map(
      item =>
        new PlanReviewRequestModel(
          item.status,
          this.#getReviewId(item.review_id),
          item.reviewer ?? null,
          this.#getSubmitterId(item.submitter),
          item.submitted_at ? new Date(item.submitted_at) : null,
          item.claimed_at ? new Date(item.claimed_at) : null,
          item.rejected_at ? new Date(item.rejected_at) : null,
          item.approved_at ? new Date(item.approved_at) : null,
          item.comments ?? null,
        ),
    );

    return new BaseResponse(models, null);
  }

  #getReviewId(reviewId: PlanReviewRequestStatusData['review_id']): string | null {
    if (typeof reviewId === 'string') {
      return reviewId;
    }
    if (typeof reviewId === 'number') {
      return String(reviewId);
    }
    return null;
  }

  #getSubmitterId(submitter: PlanReviewRequestStatusData['submitter']): number | null {
    if (typeof submitter === 'number') {
      return submitter;
    }
    if (submitter && typeof submitter === 'object' && typeof submitter.id === 'number') {
      return submitter.id;
    }
    return null;
  }
}
