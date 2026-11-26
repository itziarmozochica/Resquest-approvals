import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { PlanReviewRequestAdapter } from '../../models/plan-review/plan-review-request.adapter';
import { PlanReviewRequestModel, PlanReviewRequestStatusData } from '../../models/plan-review/plan-review-request.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';

export interface RejectReviewRequest {
  comments: string[];
}

@Injectable({
  providedIn: 'root',
})
export class PlanReviewService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(PlanReviewRequestAdapter);

  approveReview(partnerId: number, planId: number, reviewId: string): Observable<BaseResponse<void>> {
    const url = this.#getApproveReviewUrl(partnerId, planId, reviewId);

    return this.#http.post<void>(url, null).pipe(
      map(() => new BaseResponse(undefined, null)),
      catchError(error => ErrorResponseUtils.getErrorResponse<void>(error)),
    );
  }

  claimReview(partnerId: number, planId: number, reviewId: string): Observable<BaseResponse<void>> {
    const url = this.#getClaimReviewUrl(partnerId, planId, reviewId);

    return this.#http.post<void>(url, null).pipe(
      map(() => new BaseResponse(undefined, null)),
      catchError(error => ErrorResponseUtils.getErrorResponse<void>(error)),
    );
  }

  getReviews(partnerId: number, planId: number): Observable<BaseResponse<PlanReviewRequestModel[] | null>> {
    const url = this.#getReviewsUrl(partnerId, planId);

    return this.#http.get<BaseResponse<PlanReviewRequestStatusData[]>>(url).pipe(
      map((response: BaseResponse<PlanReviewRequestStatusData[]>) => this.#adapter.fromHistoryApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<PlanReviewRequestModel[]>(error)),
    );
  }

  getStatus(partnerId: number, planId: number): Observable<BaseResponse<PlanReviewRequestModel | null>> {
    const url = this.#getStatusUrl(partnerId, planId);

    return this.#http.get<BaseResponse<PlanReviewRequestStatusData>>(url).pipe(
      map((response: BaseResponse<PlanReviewRequestStatusData>) => this.#adapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<PlanReviewRequestModel>(error)),
    );
  }

  rejectReview(partnerId: number, planId: number, reviewId: string, comments: string[]): Observable<BaseResponse<void>> {
    const url = this.#getRejectReviewUrl(partnerId, planId, reviewId);
    const body: RejectReviewRequest = { comments };

    return this.#http.post<void>(url, body).pipe(
      map(() => new BaseResponse(undefined, null)),
      catchError(error => ErrorResponseUtils.getErrorResponse<void>(error)),
    );
  }

  releaseReview(partnerId: number, planId: number, reviewId: string): Observable<BaseResponse<void>> {
    const url = this.#getReleaseReviewUrl(partnerId, planId, reviewId);

    return this.#http.post<void>(url, null).pipe(
      map(() => new BaseResponse(undefined, null)),
      catchError(error => ErrorResponseUtils.getErrorResponse<void>(error)),
    );
  }

  submitReview(partnerId: number, planId: number): Observable<BaseResponse<void>> {
    const url = this.#getSubmitReviewUrl(partnerId, planId);

    return this.#http.post<void>(url, null).pipe(
      map(() => new BaseResponse(undefined, null)),
      catchError(error => ErrorResponseUtils.getErrorResponse<void>(error)),
    );
  }

  withdrawReview(partnerId: number, planId: number, reviewId: string): Observable<BaseResponse<void>> {
    const url = this.#getWithdrawReviewUrl(partnerId, planId, reviewId);

    return this.#http.post<void>(url, null).pipe(
      map(() => new BaseResponse(undefined, null)),
      catchError(error => ErrorResponseUtils.getErrorResponse<void>(error)),
    );
  }

  #getApproveReviewUrl(partnerId: number, planId: number, reviewId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/review-requests/${reviewId}/approve`;
  }

  #getClaimReviewUrl(partnerId: number, planId: number, reviewId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/review-requests/${reviewId}/claim`;
  }

  #getRejectReviewUrl(partnerId: number, planId: number, reviewId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/review-requests/${reviewId}/reject`;
  }

  #getReleaseReviewUrl(partnerId: number, planId: number, reviewId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/review-requests/${reviewId}/release`;
  }

  #getReviewsUrl(partnerId: number, planId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/review-requests`;
  }

  #getStatusUrl(partnerId: number, planId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/review-requests/latest`;
  }

  #getSubmitReviewUrl(partnerId: number, planId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/review-requests`;
  }

  #getWithdrawReviewUrl(partnerId: number, planId: number, reviewId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/review-requests/${reviewId}/withdraw`;
  }
}
