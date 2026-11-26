import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../../shared/models/base-response';
import { LinkPaginationResponse } from '../../../../shared/models/link-pagination-response';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { InvitationGuest } from '../models/invitation-guest/invitation-guest.model';
import {
  CreateInvitationRequestBody,
  Invitation,
  InvitationDeliveryStatusData,
  InvitationResponseData,
} from '../models/invitation/invitation.model';
import { CreateInvitationAdapter } from './create-invitation.adapter';
import { GetInvitationAdapter } from './get-invitation.adapter';
import { InvitationQuery } from './invitation-query';
import { InvitationAdapter } from './invitation.adapter';

@Injectable({
  providedIn: 'root',
})
export class InvitationService {
  constructor(
    private httpClient: HttpClient,
    private invitationAdapter: InvitationAdapter,
    private createInvitationAdapter: CreateInvitationAdapter,
    private getInvitationAdapter: GetInvitationAdapter,
  ) {}

  cancel(partnerId: number, planId: number, placeId: number, invitationId: string): Observable<BaseResponse<unknown>> {
    const path = this.#getCancelUrl(partnerId, planId, placeId, invitationId);
    return this.httpClient.post<BaseResponse<unknown>>(path, null, { observe: 'response' }).pipe(
      map(response => {
        if (response.status === 204) {
          return new BaseResponse({}, null);
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<unknown>(error)),
    );
  }

  createInvitation(
    partnerId: number,
    planId: number,
    cartId: string,
    invitationsGuest: Array<InvitationGuest>,
  ): Observable<BaseResponse<string | null>> {
    const path = this.#createInvitationsUrl(partnerId, planId);
    const body = this.#getCreateInvitationGuestsBody(invitationsGuest[0], cartId);
    return this.httpClient.post(path, body).pipe(
      map(result => this.createInvitationAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse<string>(error)),
    );
  }

  getDeliveryStatus(partnerId: number, planId: number, invitationId: string): Observable<BaseResponse<InvitationDeliveryStatusData>> {
    const path = this.#getDeliveryStatusUrl(partnerId, planId, invitationId);
    return this.httpClient.get<BaseResponse<InvitationDeliveryStatusData>>(path, { observe: 'response' }).pipe(
      map((response: HttpResponse<BaseResponse<InvitationDeliveryStatusData>>) => {
        const body = response.body;
        return new BaseResponse<InvitationDeliveryStatusData>(body?.data ?? null, body?.error ?? null);
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getInvitation(queryParams: InvitationQuery): Observable<BaseResponse<Invitation | null>> {
    const invitationId = queryParams.invitationId;
    if (!invitationId) {
      return throwError(() => new Error('invitationId is required'));
    }
    const path = this.#getInvitationUrl(queryParams.partnerId, queryParams.planId, invitationId);
    return this.httpClient.get(path).pipe(
      map(result => this.getInvitationAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Invitation>(error)),
    );
  }

  getInvitations(queryParameters: InvitationQuery): Observable<LinkPaginationResponse<Invitation[] | null>> {
    const path = this.#getInvitationsUrl(queryParameters.partnerId, queryParameters.planId);
    const params = this.#getInvitationsParameters(queryParameters);
    return this.httpClient.get<BaseResponse<InvitationResponseData>>(path, { observe: 'response', params: params }).pipe(
      map((result: HttpResponse<BaseResponse<InvitationResponseData>>) => this.invitationAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<Invitation[]>(error)),
    );
  }

  resend(partnerId: number, invitationId: string, email?: string, codeIds?: number[]): Observable<BaseResponse<unknown>> {
    const path = this.#getResendUrl(partnerId, invitationId);
    const body: { code_ids?: number[]; email?: string } = {};
    if (email) {
      body.email = email;
    }
    if (codeIds !== undefined && codeIds.length > 0) {
      body.code_ids = codeIds;
    }
    const payload = Object.keys(body).length > 0 ? body : null;
    return this.httpClient.post<BaseResponse<unknown>>(path, payload, { observe: 'response' }).pipe(
      map(response => {
        if (response?.status === 202) {
          return new BaseResponse({}, null);
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<unknown>(error)),
    );
  }

  #createInvitationsUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/invitations/`;
  }

  #getCancelUrl(partnerId: number, planId: number, placeId: number, invitationId: string): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/places/${placeId}/invitations/${invitationId}/cancel/`;
  }

  #getCreateInvitationGuestsBody(invitationsGuest: InvitationGuest, cartId: string): CreateInvitationRequestBody {
    let invitationGuest: CreateInvitationRequestBody = {
      cart_id: cartId,
      first_name: invitationsGuest.firstName,
      notification_type: invitationsGuest.notificationType,
      recipient_email: invitationsGuest.email,
    };
    if (invitationsGuest.lastName) {
      invitationGuest = { ...invitationGuest, last_name: invitationsGuest.lastName };
    }
    if (invitationsGuest.businessEntityId) {
      invitationGuest = { ...invitationGuest, business_entity_id: invitationsGuest.businessEntityId };
    }
    if (invitationsGuest.requestor) {
      invitationGuest = { ...invitationGuest, requestor: invitationsGuest.requestor };
    }
    if (invitationsGuest.guestGroup) {
      invitationGuest = { ...invitationGuest, guest_group: invitationsGuest.guestGroup };
    }
    return invitationGuest;
  }

  #getDeliveryStatusUrl(partnerId: number, planId: number, invitationId: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/invitations/${invitationId}/delivery-status/`;
  }

  #getInvitationsParameters(parameters: InvitationQuery): HttpParams {
    let params = new HttpParams();
    params = params.set('items_per_page', parameters.itemsPerPage ? parameters.itemsPerPage.toString() : 25);
    params = params.set('page', parameters.page ? parameters.page.toString() : 1);
    if (parameters.search) {
      params = params.set('search', parameters.search);
    }
    return params;
  }

  #getInvitationsUrl(partnerId: number, planId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/invitations`;
  }

  #getInvitationUrl(partnerId: number, planId: number, invitationId: string): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/invitations/${invitationId}/`;
  }

  #getResendUrl(partnerId: number, invitationId: string): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/invitations/${invitationId}/resend/`;
  }
}
