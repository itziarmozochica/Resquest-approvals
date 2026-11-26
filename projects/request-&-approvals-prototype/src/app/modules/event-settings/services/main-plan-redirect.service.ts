import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../shared/utils/error-response.utils';
import { MainPlanRedirect } from '../models/main-plan-redirect.model';
import { MainPlanRedirectAdapter } from './adapters/main-plan-redirect.adapter';
import { MainPlanRedirectDto } from './dtos/main-plan-redirect.dto';

@Injectable({
  providedIn: 'root',
})
export class MainPlanRedirectService {
  #http: HttpClient = inject(HttpClient);
  #mainPlanRedirectAdapter: MainPlanRedirectAdapter = inject(MainPlanRedirectAdapter);

  deleteMainPlanRedirect(partnerId: number, redirectFromId: number): Observable<void> {
    const path = `${this.#getMainPlanRedirectUrl(partnerId, redirectFromId)}delete/`;

    return this.#http.delete<void>(path).pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  getMainPlanRedirect(partnerId: number, planId: number): Observable<MainPlanRedirect> {
    const path = this.#getMainPlanRedirectUrl(partnerId, planId);

    return this.#http.get<BaseResponse<MainPlanRedirectDto>>(path, { observe: 'response' }).pipe(
      map((result: HttpResponse<BaseResponse<MainPlanRedirectDto>>) => this.#mainPlanRedirectAdapter.fromApi(result)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  saveMainPlanRedirect(partnerId: number, mainPlanRedirect: MainPlanRedirect): Observable<void> {
    const path = `${this.#getMainPlanRedirectUrl(partnerId, mainPlanRedirect.redirectFromId)}add/`;
    const body = {
      redirect_to_id: mainPlanRedirect.redirectToId,
    };

    return this.#http.post<void>(path, body).pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  updateMainPlanRedirect(partnerId: number, mainPlanRedirect: MainPlanRedirect): Observable<void> {
    const path = `${this.#getMainPlanRedirectUrl(partnerId, mainPlanRedirect.redirectFromId)}update/`;
    const body = {
      redirect_to_id: mainPlanRedirect.redirectToId,
    };

    return this.#http.patch<void>(path, body).pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  #getMainPlanRedirectUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/redirect/`;
  }
}
