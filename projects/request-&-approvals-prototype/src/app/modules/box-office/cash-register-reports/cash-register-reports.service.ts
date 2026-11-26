import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { ExportTypeEnum } from '@fz-original/app/shared/components/export-list-button/export-option.model';
import { getHttpBaseErrorResponseError } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { catchError, map, Observable, throwError } from 'rxjs';

import { HttpErrorResponseWithBaseError, IBaseResponse } from '../../../shared/models/base-response';
import { CashRegisterReport, CashRegisterReportDTO, CashRegisterReportStatus } from './models/cash-register-report.model';

@Injectable({ providedIn: 'root' })
export class CashRegisterReportsService {
  #httpClient = inject(HttpClient);

  approveReport(partnerId: number, reportId: string): Observable<void> {
    const url = this.#buildReportUrl(partnerId, reportId, 'approve');

    return this.#httpClient.post(url, null).pipe(
      map((): undefined => void 0),
      catchError(this.#handleError),
    );
  }

  downloadReport(partnerId: number, reportId: string): Observable<Blob> {
    const url = this.#buildReportUrl(partnerId, reportId, 'download');
    const headers = new HttpHeaders({ Accept: ExportTypeEnum.PDF });

    return this.#httpClient.get(url, { headers, responseType: 'blob' }).pipe(catchError(this.#handleError));
  }

  flagReport(partnerId: number, reportId: string, title: string, description: string): Observable<void> {
    const url = this.#buildReportUrl(partnerId, reportId, 'flag');

    return this.#httpClient.put<void>(url, { title, description }).pipe(catchError(this.#handleError));
  }

  getReports(partnerId: number): Observable<CashRegisterReport[]> {
    const url = this.#buildReportUrl(partnerId);

    return this.#httpClient.get<IBaseResponse<CashRegisterReportDTO[]>>(url).pipe(
      map(response => {
        return (response.data ?? []).map(item => ({
          createdAt: new Date(item.created_at),
          deadline: new Date(item.deadline),
          id: item.id,
          loading: false,
          location: {
            city: {
              id: item.location.city.id,
              name: item.location.city.name,
            },
            id: item.location.id,
            venue: {
              id: item.location.venue.id,
              name: item.location.venue.name,
            },
          },
          replacedBy: item.replaced_by,
          status: item.status,
          updatedAt: new Date(item.updated_at),
        }));
      }),
      catchError(this.#handleError),
    );
  }

  #buildReportUrl(partnerId: number, reportId?: string, action?: string): string {
    let url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/cash-registers/reports`;

    if (reportId && action) {
      url += `/${reportId}/${action}`;
    }

    return url;
  }

  #handleError(error: HttpErrorResponseWithBaseError): Observable<never> {
    return throwError(() => new Error(getHttpBaseErrorResponseError(error).message));
  }
}
