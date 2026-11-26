import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { SeatingReportQuery } from '../../models/seating-map/seating-report-query';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { SeatingReportAdapter } from './seating-report.adapter';

@Injectable({
  providedIn: 'root',
})
export class SeatingReportService {
  constructor(
    private httpClient: HttpClient,
    private seatingReportAdapter: SeatingReportAdapter,
  ) {}

  getSeatingReport(seatingReportQuery: SeatingReportQuery): Observable<BaseResponse<null>> {
    const path: string = this.getSeatingReportUrl(seatingReportQuery);
    const params = this.getSeatingReportParams(seatingReportQuery.emailAddress);

    return this.httpClient.get(path, { params }).pipe(
      switchMap((data: any) => of(this.seatingReportAdapter.fromApi(data))),
      catchError(error => throwError({ error: ErrorResponseUtils.getErrorResponseError(error) })),
    );
  }

  private getSeatingReportParams(emailAddress: string): HttpParams {
    let params = new HttpParams();
    params = params.append('email_address', emailAddress);
    return params;
  }

  private getSeatingReportUrl(query: SeatingReportQuery): string {
    return `${environment.apiBaseUrl}/partners/${query.partnerId}/plans/${query.planId}/places/${query.placeId}/sessions/${query.sessionId}/seating-report/`;
  }
}
