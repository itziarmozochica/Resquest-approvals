import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { BasePromotionsManagerService } from './base-promotions-manager.service';
import { PromotionAppliedResponse, PromotionResponse, PromotionsResult, PromotionValidate } from './models';

@Injectable({
  providedIn: 'root',
})
export class KioskPromotionsManagerService extends BasePromotionsManagerService {
  #httpClient = inject(HttpClient);

  get(cartId: string, partnerId: number): Observable<PromotionsResult> {
    const url = this.#getPromotionsUrl(cartId, partnerId);

    return this.#httpClient.get<BaseResponse<PromotionsResult>>(url).pipe(
      map(response => response.data ?? { promotions: [] }),
      catchError((error: BaseErrorResponse) => {
        const errorResponse: BaseErrorResponse = ErrorResponseUtils.getErrorResponseError(error);
        return throwError(() => errorResponse);
      }),
    );
  }

  post(cartId: string, partnerId: number, promotions: PromotionResponse[]): Observable<PromotionAppliedResponse> {
    const url = this.#getPromotionsUrl(cartId, partnerId);

    return this.#httpClient.post<BaseResponse<PromotionAppliedResponse>>(url, promotions).pipe(
      map((response: BaseResponse<PromotionAppliedResponse>) => response.data as PromotionAppliedResponse),
      catchError((error: BaseErrorResponse) => {
        const errorResponse: BaseErrorResponse = ErrorResponseUtils.getErrorResponseError(error);
        return throwError(() => errorResponse);
      }),
    );
  }

  validate(cartId: string, partnerId: number, promotions: PromotionResponse[]): Observable<PromotionValidate[]> {
    const url = this.#getPromotionsUrl(cartId, partnerId) + 'validate/';

    return this.#httpClient.post<BaseResponse<PromotionValidate[]>>(url, promotions).pipe(
      map((response: BaseResponse<PromotionValidate[]>) => response.data || []),
      catchError((error: BaseErrorResponse) => {
        const errorResponse: BaseErrorResponse = ErrorResponseUtils.getErrorResponseError(error);
        return throwError(() => errorResponse);
      }),
    );
  }

  #getPromotionsUrl(cartId: string, partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/carts/${cartId}/promotions/`;
  }
}
