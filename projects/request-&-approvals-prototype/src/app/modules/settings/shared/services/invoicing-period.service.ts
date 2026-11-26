import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { InvoicingPeriod } from '../models/invoicing-period.model';
import { ActiveInvoicingPeriodQuery } from './active-invoicing-period-query';
import { InvoicingPeriodAdapter } from './invoicing-period.adapter';

@Injectable({
  providedIn: 'root',
})
export class InvoicingPeriodService {
  constructor(
    private httpClient: HttpClient,
    private invoicingPeriodAdapter: InvoicingPeriodAdapter,
  ) {}

  getActiveInvoicingPeriod(queryParameters: ActiveInvoicingPeriodQuery): Observable<BaseResponse<InvoicingPeriod> | BaseResponse<null>> {
    const path = this.getActiveInvoicingPeriodUrl(queryParameters);

    return this.httpClient.get(path, { observe: 'response' }).pipe(
      switchMap(result => {
        return of(this.invoicingPeriodAdapter.fromApi(result));
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<InvoicingPeriod>(error)),
    );
  }

  private getActiveInvoicingPeriodUrl(queryParameters: ActiveInvoicingPeriodQuery): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${queryParameters.partnerId}/users/${queryParameters.userId}/active-invoicing-period`;
  }
}
