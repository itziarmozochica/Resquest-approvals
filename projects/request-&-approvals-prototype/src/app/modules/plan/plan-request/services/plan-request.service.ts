import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { guideLinesConfig } from '../../../../shared/constants/content-guide-lines-urls';
import { photographyPracticesConfig } from '../../../../shared/constants/photography-practices-urls';
import { BaseResponse } from '../../../../shared/models/base-response';
import { LinkPaginationResponse } from '../../../../shared/models/link-pagination-response';
import { User } from '../../../../shared/models/user/user.model';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { PlanRequest, PlanRequestData } from '../models/plan-request/plan-request.model';
import { CreatePlanRequestAdapter } from './create-plan-request.adapter';
import { PlanRequestQuery } from './plan-request-query';
import { PlanRequestAdapter } from './plan-request.adapter';
import { PlanRequestsAdapter } from './plan-requests.adapter';
import { UploadFileAdapter } from './upload-file-adapter';

@Injectable({
  providedIn: 'root',
})
export class PlanRequestService {
  constructor(
    private httpClient: HttpClient,
    private planRequestAdapter: PlanRequestAdapter,
    private planRequestsAdapter: PlanRequestsAdapter,
    private createPlanRequestAdapter: CreatePlanRequestAdapter,
    private uploadFileAdapter: UploadFileAdapter,
  ) {}

  getPlanRequests(queryParameters: PlanRequestQuery): Observable<LinkPaginationResponse<PlanRequest[] | null>> {
    const path = this.getPlanRequestsUrl(queryParameters.partnerId);
    const params = this.getPlanRequestsParameters(queryParameters);
    return this.httpClient.get<BaseResponse<{ plan_requests: PlanRequestData[] }>>(path, { observe: 'response', params: params }).pipe(
      switchMap((result: HttpResponse<BaseResponse<{ plan_requests: PlanRequestData[] }>>) => {
        return of(this.planRequestsAdapter.fromApi(result));
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<PlanRequest[]>(error)),
    );
  }

  private getPlanRequestsUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plan-requests`;
  }

  private getPlanRequestsParameters(parameters: PlanRequestQuery): HttpParams {
    let params = new HttpParams();
    params = params.set('items_per_page', parameters.itemsPerPage ? parameters.itemsPerPage.toString() : 10);
    params = params.set('page', parameters.page ? parameters.page.toString() : 1);
    return params;
  }

  getPlanRequest(queryParams: PlanRequestQuery): Observable<BaseResponse<PlanRequest | null>> {
    const planRequestId = queryParams.planRequestId;
    if (!planRequestId) {
      return of(new BaseResponse<PlanRequest | null>(null, { code: '400', message: 'errors.generic' }));
    }
    const path = this.getPlanRequestUrl(planRequestId, queryParams.partnerId);
    return this.httpClient.get<BaseResponse<PlanRequestData>>(path).pipe(
      map((result: BaseResponse<PlanRequestData>) => this.planRequestAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse<PlanRequest>(error)),
    );
  }

  private getPlanRequestUrl(planRequestId: string, partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plan-requests/${planRequestId}`;
  }

  createPlanRequest(partnerId: number, planRequest: PlanRequest, b2bUser: User): Observable<BaseResponse<string | null>> {
    const path = this.createPlanRequestUrl(partnerId);
    const body = this.getCreatePlanRequestBody(planRequest, b2bUser);
    return this.httpClient.post(path, body).pipe(
      map(result => this.createPlanRequestAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse<string>(error)),
    );
  }

  private createPlanRequestUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plan-requests`;
  }

  private getCreatePlanRequestBody(planRequest: PlanRequest, b2bUser: User): any {
    const ticketTypes = planRequest.ticketTypes.map(ticketType => {
      return {
        type: ticketType.type,
        price: ticketType.price,
        available_tickets: ticketType.availableTickets,
        weekdays_applies: ticketType.weekdaysApplies,
        sessions_hours: ticketType.sessionsHours,
      };
    });

    const dates = planRequest.dates.map(date => {
      return {
        starts_at: date.startsAt,
        ends_at: date.endsAt,
      };
    });

    const images = planRequest.images.map(image => {
      return {
        image_url: image.imageUrl,
      };
    });

    const user = {
      id: b2bUser.id,
      name: b2bUser.name,
      username: b2bUser.username,
      email: b2bUser.email,
    };

    return {
      status: planRequest.status,
      plan_id: planRequest.planId,
      web_url: planRequest.webUrl,
      plan_name: planRequest.planName,
      plan_description: planRequest.planDescription,
      city: planRequest.city,
      address: planRequest.address,
      accessibility: planRequest.accessibility,
      surcharge_agreed: planRequest.surchargeAgreed,
      closing_sales: planRequest.closingSales,
      additional_information: planRequest.additionalInformation,
      validation_method: planRequest.validationMethod,
      codes_type: planRequest.codesType,
      codes_validation: planRequest.codesValidation,
      codes_file_url: planRequest.codesFileUrl,
      faq: planRequest.faq,
      terms_and_conditions: planRequest.termsAndConditions,
      ticket_types: ticketTypes,
      dates: dates,
      images: images,
      b2b_user: user,
    };
  }

  updatePlanRequest(partnerId: number, planRequestId: string, planRequest: PlanRequest): Observable<BaseResponse<any>> {
    const path = this.updatePlanRequestUrl(partnerId, planRequestId);
    const body = this.getUpdatePlanRequestBody(planRequest);
    return this.httpClient.put(path, body, { observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 204) {
          return new BaseResponse({}, null);
        }
        let error = null;
        if (response.body.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<string>(error)),
    );
  }

  private updatePlanRequestUrl(partnerId: number, planRequestId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plan-requests/${planRequestId}`;
  }

  private getUpdatePlanRequestBody(planRequest: PlanRequest): any {
    const ticketTypes = planRequest.ticketTypes.map(ticketType => {
      return {
        type: ticketType.type,
        price: ticketType.price,
        available_tickets: ticketType.availableTickets,
        weekdays_applies: ticketType.weekdaysApplies,
        sessions_hours: ticketType.sessionsHours,
      };
    });

    const dates = planRequest.dates.map(date => {
      return {
        starts_at: date.startsAt,
        ends_at: date.endsAt,
      };
    });

    const images = planRequest.images.map(image => {
      return {
        image_url: image.imageUrl,
      };
    });

    return {
      created_at: planRequest.createdAt,
      updated_at: planRequest.updatedAt,
      status: planRequest.status,
      plan_id: planRequest.planId,
      web_url: planRequest.webUrl,
      plan_name: planRequest.planName,
      plan_description: planRequest.planDescription,
      city: planRequest.city,
      address: planRequest.address,
      accessibility: planRequest.accessibility,
      surcharge_agreed: planRequest.surchargeAgreed,
      closing_sales: planRequest.closingSales,
      additional_information: planRequest.additionalInformation,
      validation_method: planRequest.validationMethod,
      codes_type: planRequest.codesType,
      codes_validation: planRequest.codesValidation,
      codes_file_url: planRequest.codesFileUrl,
      faq: planRequest.faq,
      terms_and_conditions: planRequest.termsAndConditions,
      ticket_types: ticketTypes,
      dates: dates,
      images: images,
    };
  }

  uploadFile(partnerId: number, file: File, planRequestId: string): Observable<BaseResponse<any>> {
    const path = this.getUploadFileUrl(partnerId, planRequestId);
    const formData = new FormData();
    formData.append('file', file);
    return this.httpClient.post(path, formData).pipe(
      map(result => this.uploadFileAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse<string>(error)),
    );
  }

  private getUploadFileUrl(partnerId: number, planRequestId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plan-requests/${planRequestId}/upload-file`;
  }

  zendeskTicketSend(planRequestId: string, partnerId: number): Observable<BaseResponse<any>> {
    const path = this.getZendeskTicketSendUrl(planRequestId, partnerId);
    return this.httpClient.post(path, {}, { observe: 'response' }).pipe(
      map((response: HttpResponse<{ error?: { code: string } }>) => {
        if (response.status === 204) {
          return new BaseResponse({}, null);
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<string>(error)),
    );
  }

  private getZendeskTicketSendUrl(planRequestId: string, partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plan-requests/${planRequestId}/zendesk-ticket`;
  }

  getGuideLinesUrl(countryCode?: string): string {
    const code = countryCode ?? 'UK';
    return guideLinesConfig.get(code) ?? guideLinesConfig.get('UK')!;
  }

  getPhotographyPracticesUrl(countryCode?: string): string {
    const code = countryCode ?? 'UK';
    return photographyPracticesConfig.get(code) ?? photographyPracticesConfig.get('UK')!;
  }

  duplicatePlan(planId: number, planName: string, partnerId: number, user: User): Observable<BaseResponse<{ id: number } | null>> {
    const path = this.getDuplicatePlanUrl(planId, partnerId);
    const body = {
      b2b_user: {
        b2b_user_id: user.id,
        b2b_user_email: user.email,
        b2b_user_name: user.name,
        b2b_user_username: user.username,
      },
      plan_name: planName,
    };
    return this.httpClient.post<{ id: number; error?: { code: string } }>(path, body, { observe: 'response' }).pipe(
      map((response: HttpResponse<{ id: number; error?: { code: string } }>) => {
        if (response.status === 201 && response.body?.id != null) {
          return new BaseResponse({ id: response.body.id }, null);
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<string>(error)),
    );
  }

  private getDuplicatePlanUrl(planId: number, partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/duplicate`;
  }
}
