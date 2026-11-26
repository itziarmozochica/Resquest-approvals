import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../../../environments/environment';
import { ExportTypeEnum } from '../../../../../../shared/components/export-list-button/export-option.model';
import { PartnerService } from '../../../../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../../../../shared/utils/error-response.utils';
import { GetShiftAdapter, GetShiftsApiResponseBody } from '../../../../shared/adapters/shift/get-shift.adapter';
import { Shift } from '../../../../shared/models/shifts.model';
import { ShiftSummaryProvider } from '../shift-abstract-factory.service';

@Injectable({
  providedIn: 'root',
})
export class ShiftSummaryService implements ShiftSummaryProvider {
  constructor(
    private http: HttpClient,
    protected partnerService: PartnerService,
    private getShiftAdapter: GetShiftAdapter,
  ) {}

  getShift(placeId: number, shiftId: string): Observable<Shift>;
  getShift(placeId: number, shiftId: string, fileType: ExportTypeEnum, language: string): Observable<Blob>;
  getShift(placeId: number, shiftId: string, fileType?: ExportTypeEnum, language?: string): Observable<Shift | Blob> {
    const path = this.getShiftUrl(placeId, shiftId);

    const headers = fileType && language ? new HttpHeaders({ Accept: fileType, 'Accept-Language': language }) : null;

    const request: Observable<Shift | Blob> = headers ? this.exportRequest(path, headers) : this.jsonRequest(path, this.getShiftAdapter);

    return request.pipe(catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))));
  }

  addShiftNotes(placeId: number, shiftId: string, notes: string): Observable<any> {
    const path = this.getShiftCommentUrl(placeId, shiftId);
    const body = this.getShiftCommentBody(notes);

    return this.http.put(path, body).pipe(
      map(response => response),
      catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  protected getShiftUrl(placeId: number, shiftId: string): string {
    const partnerId = this.partnerService.getPartner()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/places/${placeId}/shifts/${shiftId}`;
  }

  protected getShiftCommentUrl(placeId: number, shiftId: string): string {
    const partnerId = this.partnerService.getPartner()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/places/${placeId}/shifts/${shiftId}/comment`;
  }

  private getShiftCommentBody(notes: string): any {
    return { comment: notes };
  }

  private jsonRequest(path: string, adapter: GetShiftAdapter): Observable<Shift> {
    return this.http.get(path, { observe: 'response' }).pipe(map(result => adapter.fromApi(result.body as GetShiftsApiResponseBody)));
  }

  private exportRequest(path: string, headers: HttpHeaders): Observable<Blob> {
    return this.http.get(path, { headers: headers, responseType: 'blob' }).pipe(map(result => result as Blob));
  }
}
