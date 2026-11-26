import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import moment from 'moment-timezone';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse, HttpErrorResponseWithBaseError } from '../../models/base-response';
import {
  CapacityGroupUpdateCapacityBodyDTO,
  CapacityGroupUpdateCapacityQuery,
} from '../../models/capacity/capacity-group-update-capacity-query';
import {
  CapacitySummaryQuery,
  CapacitySummaryRangeQuery,
  CapacitySummaryTimeSlotIdQuery,
  isCapacitySummaryRangeQuery,
} from '../../models/capacity/capacity-summary-query';
import { CapacitySummary, CapacitySummaryData } from '../../models/capacity/capacity-summary.model';
import { ErrorResponseUtils, getHttpBaseErrorResponseError, withConflictMessage } from '../../utils/error-response.utils';
import { CapacitySummaryAdapter } from './capacity-summary.adapter';

@Injectable({
  providedIn: 'root',
})
export class CapacityService {
  #capacitySummaryAdapter = inject(CapacitySummaryAdapter);
  #http = inject(HttpClient);

  getCapacityGroupUpdateCapacityBody({ capacity, timeSlotId }: CapacityGroupUpdateCapacityQuery): CapacityGroupUpdateCapacityBodyDTO {
    return { capacity, ...(timeSlotId === undefined ? {} : { time_slot_id: timeSlotId }) };
  }

  getCapacityGroupUpdateCapacityUrl(parameters: CapacityGroupUpdateCapacityQuery) {
    return `${environment.apiBaseUrl}/partners/${parameters.partnerId}/plans/${parameters.planId}/capacity-groups/${parameters.capacityGroupId}/capacity/`;
  }

  getCapacitySummary(parameters: CapacitySummaryQuery): Observable<BaseResponse<CapacitySummary | null>> {
    const path = `${this.getCapacitySummaryUrl(parameters)}`;
    const params: HttpParams = this.getRangeParameters(parameters);

    return this.#http.get<BaseResponse<CapacitySummaryData>>(path, { params: params }).pipe(
      switchMap((result: BaseResponse<CapacitySummaryData>) => of(this.#capacitySummaryAdapter.fromApi(result))),
      catchError(error => ErrorResponseUtils.getErrorResponse<CapacitySummary>(error)),
    );
  }

  getCapacitySummaryUrl(parameters: CapacitySummaryQuery) {
    return `${environment.apiBaseUrl}/partners/${parameters.partnerId}/plans/${parameters.planId}/places/${parameters.placeId}/capacities/summary/`;
  }

  getDateRangeQueryDTO({ startsAtFrom, startsAtTo }: CapacitySummaryRangeQuery): { starts_at_from: string; starts_at_to: string } {
    const formatUTC = 'YYYY-MM-DDTHH:mm:ss';
    return {
      starts_at_from: moment(startsAtFrom).format(formatUTC),
      starts_at_to: moment(startsAtTo).format(formatUTC),
    };
  }

  getRangeParameters(query: CapacitySummaryQuery): HttpParams {
    const parameters = isCapacitySummaryRangeQuery(query) ? this.getDateRangeQueryDTO(query) : this.getTimeSlotIdQueryDTO(query);

    return new HttpParams({
      fromObject: parameters,
    });
  }

  getTimeSlotIdQueryDTO({ timeSlotId }: CapacitySummaryTimeSlotIdQuery): { time_slot_id: number } {
    return {
      time_slot_id: timeSlotId,
    };
  }

  updateCapacityGroupCapacity(parameters: CapacityGroupUpdateCapacityQuery): Observable<BaseResponse<void>> {
    const path = this.getCapacityGroupUpdateCapacityUrl(parameters);
    const body = this.getCapacityGroupUpdateCapacityBody(parameters);

    return this.#http.patch(path, body, { observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 204) {
          return new BaseResponse(null, null);
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse(null, error);
      }),
      catchError((error: HttpErrorResponseWithBaseError) => {
        return of(new BaseResponse<void>(null, withConflictMessage(error, getHttpBaseErrorResponseError(error))));
      }),
    );
  }
}
