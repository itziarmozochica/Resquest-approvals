import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { LinkPaginationResponse } from '@fz-original/app/shared/models/link-pagination-response';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { SalesWindowAdapter } from '../../../modules/sessions/shared/components/sales-window/adapters/sales-window.adapter';
import { BaseResponse } from '../../models/base-response';
import { DateUtil } from '../../utils/date.util';
import { ErrorResponseUtils, withConflictMessage } from '../../utils/error-response.utils';
import { PartnerService } from '../partner/partner.service';
import { BatchUpdateSessionsDetailsAdapter } from './batch-update-sessions-details.adapter';
import { CancelSessionsBody, CancelSessionsBodyDTO } from './cancel-sessions';
import { CancellationDetail, CancellationDetailDTO, PartnerCancellations, PartnerCancellationsResponseDTO } from './partner-cancellations';
import { PartnerCancellationsAdapter } from './partner-cancellations.adapter';
import {
  BatchSessionChange,
  SessionCapacityChange,
  SessionChange,
  SessionPricingChange,
  SessionSalesChange,
  UpdateSessionDetailsRequestBody,
} from './session-resource-change.model';
import { SessionResource } from './session-resource.model';
import { SessionsQueryParameters } from './sessions-query-parameters';
import { SessionsUpdateQuery } from './sessions-update-query-parameters';
import { SessionsAdapter } from './sessions.adapter';
import { SessionsSliceModel } from './sessions.model';

@Injectable({
  providedIn: 'root',
})
export class SessionsService {
  #batchUpdateSessionsDetailsAdapter = inject(BatchUpdateSessionsDetailsAdapter);
  readonly #partnerCancellationsAdapter = inject(PartnerCancellationsAdapter);
  #http = inject(HttpClient);
  #partnerService = inject(PartnerService);
  #salesWindowAdapter = inject(SalesWindowAdapter);
  #sessionsAdapter = inject(SessionsAdapter);

  batchUpdateSessionsDetails(planId: number, sessionIds: Array<number>, change: BatchSessionChange): Observable<unknown> {
    const url = this.#getBatchUpdateSessionDetailsUrl(planId);
    const params = new HttpParams({ fromObject: { id: sessionIds } });
    const body = this.#batchUpdateSessionsDetailsAdapter.toApi(change);

    return this.#http
      .patch(url, body, { params })
      .pipe(
        catchError((error: HttpErrorResponse) =>
          throwError(() => withConflictMessage(error, ErrorResponseUtils.getErrorResponseError(error))),
        ),
      );
  }

  cancelSessions(planId: number, placeId: number, request: CancelSessionsBody): Observable<void> {
    const url: string = this.#cancelSessionsUrl(planId, placeId);
    const body: CancelSessionsBodyDTO = {
      cancellation_reason: request.cancellationReason,
      compensation_type: request.reimbursementMethod,
      session_ids: request.sessionIds,
      ...(request.comments ? { comments: request.comments } : {}),
      ...(request.customMessage?.trim() ? { custom_message: request.customMessage.trim() } : {}),
      ...(request.internalComments?.trim() ? { internal_comments: request.internalComments.trim() } : {}),
    };

    return this.#http.post<void>(url, body).pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  getCancellationDetail(cancellationBatchId: string): Observable<CancellationDetail | null> {
    const url = this.#cancellationDetailUrl(cancellationBatchId);

    return this.#http.get<BaseResponse<CancellationDetailDTO>>(url).pipe(
      map(response => this.#partnerCancellationsAdapter.detailFromApi(response).data),
      catchError(() => of(null)),
    );
  }

  getPartnerCancellations(page?: number, mainPlanId?: number): Observable<LinkPaginationResponse<PartnerCancellations>> {
    const url = this.#partnerCancellationsUrl();
    let params = new HttpParams();
    if (page != null) {
      params = params.set('page', page);
    }
    if (mainPlanId != null) {
      params = params.set('main_plan_id', mainPlanId);
    }

    return this.#http.get<BaseResponse<PartnerCancellationsResponseDTO>>(url, { observe: 'response', params }).pipe(
      map((response: HttpResponse<BaseResponse<PartnerCancellationsResponseDTO>>) => {
        const linkHeader = response.headers.get('Link');
        const adapted = this.#partnerCancellationsAdapter.cancellationsFromApi(response.body!);
        return new LinkPaginationResponse<PartnerCancellations>(linkHeader, adapted.data, adapted.error);
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getSessions(parameters: SessionsQueryParameters): Observable<SessionsSliceModel | null> {
    const dateRange = DateUtil.prepareDateRangeForApiCall(parameters.dateFrom, parameters.dateTo, parameters.timezone);
    const url = this.#urlSessions(parameters.partnerId, parameters.planId, dateRange.startDate, dateRange.endDate, parameters.page);

    return this.#http.get(url).pipe(
      map(result => this.#sessionsAdapter.fromApi(result)),
      catchError(() => of(null)),
    );
  }

  modifySession(partnerId: number, sessionId: number, sessionData: Record<string, string | number | boolean>): Observable<any> {
    const url = this.#urlChangeSession(partnerId, sessionId);

    return this.#http.put(url, sessionData);
  }

  updateSession(params: SessionsUpdateQuery): Observable<BaseResponse<void>> {
    if (params.resource === undefined) {
      return EMPTY;
    }
    const url = this.#getUpdateSessionUrl(params.partnerId, params.planId, params.sessionId, params.resource);
    const body = this.#getUpdateSessionBody(
      params.resource,
      params.change as SessionCapacityChange | SessionSalesChange | SessionPricingChange,
    );
    return this.#http.patch(url, body, { observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 204) {
          return new BaseResponse(null, null);
        }
        const error = {
          code: response.body?.error?.code || response.status,
          message: response.body?.error?.message || 'errors.generic',
        };
        return new BaseResponse(null, error);
      }),
      catchError((error: HttpErrorResponse) =>
        of(new BaseResponse<void>(null, withConflictMessage(error, ErrorResponseUtils.getErrorResponseError(error)))),
      ),
    );
  }

  updateSessionDetails(params: SessionsUpdateQuery): Observable<BaseResponse<void>> {
    const url: string = this.#getUpdateSessionDetailsUrl(params.partnerId, params.planId, params.sessionId);
    const body: UpdateSessionDetailsRequestBody = this.#getUpdateSessionDetailsBody(params.change as SessionChange);
    return this.#http.patch(url, body, { observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 204) {
          return new BaseResponse(null, null);
        }
        const error = {
          code: response.body?.error?.code || response.status,
          message: response.body?.error?.message || 'errors.generic',
        };
        return new BaseResponse(null, error);
      }),
      catchError((error: HttpErrorResponse) =>
        of(new BaseResponse<void>(null, withConflictMessage(error, ErrorResponseUtils.getErrorResponseError(error)))),
      ),
    );
  }

  #cancellationDetailUrl(cancellationBatchId: string): string {
    const partnerId = this.#partnerService.getPartner()!.id;
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/cancellations/${cancellationBatchId}/detail/`;
  }

  #cancelSessionsUrl(planId: number, placeId: number): string {
    const partnerId = this.#partnerService.getPartner()!.id;
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/places/${placeId}/cancel/`;
  }

  #getBatchUpdateSessionDetailsUrl(planId: number): string {
    const partnerId = this.#partnerService.getPartner()?.id;
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/sessions/update/`;
  }

  #getUpdateSessionBody(resource: SessionResource, change: SessionCapacityChange | SessionSalesChange | SessionPricingChange): any {
    switch (resource) {
      case SessionResource.CAPACITY:
        return { tickets: (change as SessionCapacityChange).tickets };
      case SessionResource.SALES:
        return { sold_out: (change as SessionSalesChange).soldOut };
      case SessionResource.PRICING:
        return { price: (change as SessionPricingChange).price };
    }
  }

  #getUpdateSessionDetailsBody(change: SessionChange): UpdateSessionDetailsRequestBody {
    const body = {} as UpdateSessionDetailsRequestBody;
    if (change.label) {
      body.label = change.label;
    }
    if (change.price === 0 || change.price) {
      body.price = change.price;
    }
    if (change.capacity) {
      body.capacity = change.capacity;
    }
    if (change.soldOut !== undefined) {
      body.sold_out = change.soldOut;
    }
    if (change.isHidden !== undefined) {
      body.is_hidden = change.isHidden;
    }
    if (change.salesWindow !== undefined) {
      body.sales_windows = this.#salesWindowAdapter.toApi(change.salesWindow);
    }

    return body;
  }

  #getUpdateSessionDetailsUrl(partnerId: number, planId: number, sessionId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/sessions/${sessionId}/`;
  }

  #getUpdateSessionUrl(partnerId: number, planId: number, sessionId: number, operation: SessionResource): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/sessions/${sessionId}/${operation}/`;
  }

  #partnerCancellationsUrl(): string {
    const partnerId = this.#partnerService.getPartner()!.id;
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/cancellations/`;
  }

  #urlChangeSession(partnerId: number, sessionId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/sessions/${sessionId}/`;
  }

  #urlSessions(partnerId: number, planId: number, startDate: string, endDate: string, page: number): string {
    const params = `start_date=${startDate}&end_date=${endDate}&page=${page}`;
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/sessions/?${params}`;
  }
}
