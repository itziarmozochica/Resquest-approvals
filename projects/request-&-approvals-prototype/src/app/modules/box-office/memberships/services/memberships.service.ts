import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MembershipsMember, PlanDiscount } from '../models/memberships.model';
import {
  MembershipsDiscountCodesResponse,
  MembershipsMemberResponse,
  PlanDiscountsResponse,
} from '../models/responses/memberships-response.model';
import { OBOMembershipsAdapter } from './memberships.adapter';

@Injectable({
  providedIn: 'root',
})
export class OBOMembershipsService {
  #httpClient = inject(HttpClient);
  #membershipsAdapter = inject(OBOMembershipsAdapter);

  getMemberByPartnerAndMemberCode(memberCode: string, partnerId: number): Observable<BaseResponse<MembershipsMember>> {
    const url = `${environment.apiBaseUrl}/3.0/memberships/partners/${partnerId}/codes/${encodeURIComponent(memberCode)}/identify/`;
    return this.#httpClient.get<BaseResponse<MembershipsMemberResponse>>(url).pipe(
      map(result => this.#membershipsAdapter.adaptMembershipsMember(result)),
      catchError(error => throwError(() => new BaseResponse(null, ErrorResponseUtils.getErrorResponseError(error)))),
    );
  }

  getDiscountCodesByPartnerAndMemberCode(memberCode: string, partnerId: number): Observable<BaseResponse<Array<string>>> {
    const url = `${environment.apiBaseUrl}/3.0/memberships/partners/${partnerId}/codes/${encodeURIComponent(memberCode)}/discounts/`;
    return this.#httpClient.get<BaseResponse<MembershipsDiscountCodesResponse>>(url).pipe(
      map(result => this.#membershipsAdapter.adaptMembershipsDiscountCodes(result)),
      catchError(error => throwError(() => new BaseResponse(null, ErrorResponseUtils.getErrorResponseError(error)))),
    );
  }

  getPlanDiscountsByPartnerAndPlanId(planId: number, partnerId: number): Observable<BaseResponse<Array<PlanDiscount>>> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/discounts/`;
    return this.#httpClient.get<BaseResponse<PlanDiscountsResponse>>(url).pipe(
      map(result => this.#membershipsAdapter.adaptPlanDiscounts(result)),
      catchError(error => throwError(() => new BaseResponse(null, ErrorResponseUtils.getErrorResponseError(error)))),
    );
  }
}
