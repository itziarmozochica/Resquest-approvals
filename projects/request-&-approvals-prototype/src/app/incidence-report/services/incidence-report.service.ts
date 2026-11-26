import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { PartnerService } from '../../shared/services/partner/partner.service';

export type IncidenceCategory = 'technical' | 'access' | 'billing' | 'other';
export type IncidenceSeverity = 'low' | 'medium' | 'high';

export interface ReportIncidenceInput {
  title: string;
  description: string;
  category: IncidenceCategory;
  severity: IncidenceSeverity;
}

export interface ReportIncidenceResult {
  id: string;
}

export interface ReportIncidenceError {
  status: number;
  rateLimited: boolean;
}

@Injectable({ providedIn: 'root' })
export class IncidenceReportService {
  static readonly CURRENT_URL_MAX_LENGTH = 500;
  static readonly USER_AGENT_MAX_LENGTH = 300;

  readonly #document = inject(DOCUMENT);
  readonly #http = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);

  report(input: ReportIncidenceInput): Observable<ReportIncidenceResult> {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined || partnerId === null) {
      return throwError(() => ({ status: 0, rateLimited: false }) as ReportIncidenceError);
    }

    const currentUrl = (this.#document.location?.href ?? '').slice(0, IncidenceReportService.CURRENT_URL_MAX_LENGTH);
    const userAgent = (this.#document.defaultView?.navigator?.userAgent ?? '').slice(0, IncidenceReportService.USER_AGENT_MAX_LENGTH);

    const body = {
      title: input.title,
      description: input.description,
      category: input.category,
      severity: input.severity,
      current_url: currentUrl,
      user_agent: userAgent,
    };

    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/incidences`;
    return this.#http.post<{ data: ReportIncidenceResult; error: unknown }>(url, body).pipe(
      map(response => response.data),
      catchError((err: HttpErrorResponse) =>
        throwError(() => ({ status: err.status, rateLimited: err.status === 429 }) as ReportIncidenceError),
      ),
    );
  }
}
