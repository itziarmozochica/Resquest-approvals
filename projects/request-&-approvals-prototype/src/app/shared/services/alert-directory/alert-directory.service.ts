import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { AlertDirectoryAdapter } from './alert-directory.adapter';
import {
  AlertDirectory,
  AlertDirectoryApiData,
  FeverContactSearchApiData,
  FeverContactSearchResult,
  mapAlertDirectoryRowDto,
} from './alert-directory.model';

@Injectable({ providedIn: 'root' })
export class AlertDirectoryService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(AlertDirectoryAdapter);

  get(partnerId: number, projectId?: string | null): Observable<BaseResponse<AlertDirectory | null>> {
    const params = projectId ? new HttpParams().set('project_id', projectId) : undefined;
    return this.#http.get<BaseResponse<AlertDirectoryApiData>>(this.#url(partnerId), { params }).pipe(
      map(response => this.#adapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<AlertDirectory>(error)),
    );
  }

  searchFeverContacts(partnerId: number, term: string, page: number): Observable<BaseResponse<FeverContactSearchResult | null>> {
    const params = new HttpParams().set('search', term).set('page', String(page));
    return this.#http.get<BaseResponse<FeverContactSearchApiData>>(`${this.#url(partnerId)}fever-contacts/`, { params }).pipe(
      map(response => {
        const data = response.data ? { rows: response.data.results.map(mapAlertDirectoryRowDto), total: response.data.total } : null;
        return new BaseResponse<FeverContactSearchResult | null>(data, response.error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<FeverContactSearchResult>(error)),
    );
  }

  resolveSlackIds(partnerId: number, emails: string[]): Observable<BaseResponse<Record<string, string | null> | null>> {
    return this.#http
      .post<BaseResponse<{ slack_ids: Record<string, string | null> }>>(`${this.#url(partnerId)}resolve-slack-ids/`, { emails })
      .pipe(
        map(response => new BaseResponse(response.data?.slack_ids ?? null, response.error)),
        catchError(error => ErrorResponseUtils.getErrorResponse<Record<string, string | null>>(error)),
      );
  }

  #url(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/alert-directory/`;
  }
}
