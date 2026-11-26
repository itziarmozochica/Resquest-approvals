import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { BaseResponse } from '../../models/base-response';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { CreateEventType } from './create-event-type.model';

export interface CreateMainPlanMediaItem {
  name: string;
  url: string;
  poster?: string;
  playback_rate?: number;
}

interface CreateMainPlanPayloadBase {
  plan_type: CreateEventType;
  title: string;
  category?: string;
  description?: string;
  information_request_id?: string;
  media?: CreateMainPlanMediaItem[];
}

export type CreateMainPlanWithVenuePayload = CreateMainPlanPayloadBase & {
  place_id: number;
  plan_type: Exclude<CreateEventType, 'showcase'>;
};

export type CreateMainPlanWithCatalogPayload = CreateMainPlanPayloadBase & {
  catalog_plan_id: number;
  plan_type: 'showcase';
  place_id?: number;
};

export type CreateMainPlanPayload = CreateMainPlanWithVenuePayload | CreateMainPlanWithCatalogPayload;

export interface CreateMainPlanSuccessResponse {
  message?: string;
  plan_id: number;
}

export type CreateMainPlanResponse = CreateMainPlanSuccessResponse;

export interface CreateMainPlanFromRequestResponse {
  main_plan_id: number;
  job_request_id: string;
}

@Injectable({
  providedIn: 'root',
})
export class CreateMainPlanService {
  #httpClient = inject(HttpClient);

  createMainPlan(
    partnerId: number,
    payload: CreateMainPlanPayload,
    context?: HttpContext,
  ): Observable<BaseResponse<CreateMainPlanResponse | null>> {
    const url = this.#getCreateMainPlanUrl(partnerId);
    return this.#httpClient
      .post<BaseResponse<CreateMainPlanResponse>>(url, payload, { context })
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<CreateMainPlanResponse>(error)));
  }

  createMainPlanFromInformationRequest(
    partnerId: number,
    informationRequestId: string,
  ): Observable<BaseResponse<CreateMainPlanFromRequestResponse | null>> {
    const url = this.#getCreateMainPlanFromRequestUrl(partnerId, informationRequestId);
    return this.#httpClient
      .post<BaseResponse<CreateMainPlanFromRequestResponse>>(url, {})
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<CreateMainPlanFromRequestResponse>(error)));
  }

  #getCreateMainPlanUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans`;
  }

  #getCreateMainPlanFromRequestUrl(partnerId: number, informationRequestId: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/information-requests/${informationRequestId}/create-main-plan/`;
  }
}
