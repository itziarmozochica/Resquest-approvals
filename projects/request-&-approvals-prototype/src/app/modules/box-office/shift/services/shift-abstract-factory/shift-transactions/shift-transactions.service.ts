import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Params } from '@angular/router';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../../../environments/environment';
import { ExportTypeEnum } from '../../../../../../shared/components/export-list-button/export-option.model';
import { PartnerService } from '../../../../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../../../../shared/utils/error-response.utils';
import { ShiftTransactionsQuery } from '../../../models/shift-transactions-query';
import {
  GetShiftTransactionsApiResponseBody,
  GetShiftTransactionsResponse,
  ShiftTransactionsAdapter,
} from '../shared/shift-transactions.adapter';

@Injectable({
  providedIn: 'root',
})
export class ShiftTransactionsService {
  constructor(
    private http: HttpClient,
    protected partnerService: PartnerService,
    private shiftTransactionsAdapter: ShiftTransactionsAdapter,
  ) {}

  getTransactions(placeId: number, shiftId: string, query: ShiftTransactionsQuery): Observable<GetShiftTransactionsResponse> {
    const queryDTO = this.shiftTransactionsAdapter.toApi(query);
    const params = this.getParameters(queryDTO as unknown as Params);
    const path = this.getShiftTransactionsUrl(placeId, shiftId);

    return this.http.get<GetShiftTransactionsApiResponseBody>(path, { observe: 'response', params }).pipe(
      map(result => this.shiftTransactionsAdapter.fromApi(result)),
      catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  downloadTransactions(placeId: number, shiftId: string, fileType: ExportTypeEnum): Observable<Blob> {
    const path = this.getShiftTransactionsUrl(placeId, shiftId);
    const headers = { Accept: fileType };

    return this.http
      .get(path, { headers, responseType: 'blob' })
      .pipe(catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))));
  }

  private getParameters(params: Params): HttpParams {
    return Object.entries(params).reduce<HttpParams>(
      (httpParams: HttpParams, [key, value]) => httpParams.append(key, value),
      new HttpParams(),
    ) as unknown as HttpParams;
  }

  protected getShiftTransactionsUrl(placeId: number, shiftId: string): string {
    const partnerId = this.partnerService.getPartner()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/places/${placeId}/shifts/${shiftId}/transactions`;
  }
}
