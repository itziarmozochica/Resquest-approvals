import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Params } from '@angular/router';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../../../environments/environment';
import { ExportTypeEnum } from '../../../../../../shared/components/export-list-button/export-option.model';
import { PartnerService } from '../../../../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../../../../shared/utils/error-response.utils';
import { ShiftListQuery } from '../../../../shared/models/shift-list-query';
import { GetShiftsApiResponse, GetShiftsResponse, ShiftListAdapter } from '../../shared/shift-list.adapter';
import { ShiftListProvider } from '../../shift-list-abstract-factory/shift-list-abstract-factory.service';

@Injectable({
  providedIn: 'root',
})
export class ShiftListService implements ShiftListProvider {
  constructor(
    private http: HttpClient,
    private shiftListAdapter: ShiftListAdapter,
    protected partnerService: PartnerService,
  ) {}

  getShiftList(placeId: number, query: ShiftListQuery): Observable<GetShiftsResponse>;
  getShiftList(placeId: number, query: ShiftListQuery, fileType: ExportTypeEnum, language: string): Observable<Blob>;
  getShiftList(placeId: number, query: ShiftListQuery, fileType?: ExportTypeEnum, language?: string): Observable<GetShiftsResponse | Blob> {
    const queryDTO = this.shiftListAdapter.toApi(query);
    const params = this.getParameters(queryDTO as Params);
    const path = this.getShiftListUrl(placeId);

    const headers = fileType && language ? new HttpHeaders({ Accept: fileType, 'Accept-Language': language }) : null;

    const request: Observable<GetShiftsResponse | Blob> = headers
      ? this.exportRequest(path, params, headers)
      : this.jsonRequest(path, params, this.shiftListAdapter);

    return request.pipe(catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))));
  }

  private getParameters(params: Params): HttpParams {
    return Object.entries(params).reduce<HttpParams>(
      (httpParams: HttpParams, [key, value]) => httpParams.append(key, value),
      new HttpParams(),
    ) as unknown as HttpParams;
  }

  private jsonRequest(path: string, params: HttpParams, adapter: ShiftListAdapter): Observable<GetShiftsResponse> {
    return this.http.get(path, { observe: 'response', params }).pipe(map(result => adapter.fromApi(result as GetShiftsApiResponse)));
  }

  private exportRequest(path: string, params: HttpParams, headers: HttpHeaders): Observable<Blob> {
    return this.http.get(path, { headers: headers, params: params, responseType: 'blob' }).pipe(map(result => result as Blob));
  }

  protected getShiftListUrl(placeId: number): string {
    const partnerId = this.partnerService.getPartner()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/places/${placeId}/shifts`;
  }
}
