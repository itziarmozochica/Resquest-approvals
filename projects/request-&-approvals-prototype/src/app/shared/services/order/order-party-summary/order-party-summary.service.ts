import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { ExportTypeEnum } from '../../../components/export-list-button/export-option.model';
import { PartnerService } from '../../partner/partner.service';

@Injectable({
  providedIn: 'root',
})
export class OrderPartySummaryService {
  readonly #http = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);

  /** One document with the party summary of every order that holds a party booking; fever2 skips the rest. */
  exportBulkPDF(orderIds: readonly number[], language: string): Observable<Blob> {
    return this.#exportPDF('party-summaries/', language, new HttpParams().set('order_ids', orderIds.join(',')));
  }

  exportPDF(orderId: number, language: string, timezone?: string): Observable<Blob> {
    const params = timezone ? new HttpParams().set('timezone', timezone) : undefined;
    return this.#exportPDF(`${orderId}/party-summary/`, language, params);
  }

  #exportPDF(path: string, language: string, params: HttpParams | undefined): Observable<Blob> {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      return throwError(() => new Error('Partner ID is required but not available'));
    }

    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/orders/${path}`;
    const headers = new HttpHeaders({ Accept: ExportTypeEnum.PDF, 'Accept-Language': language });

    return this.#http.get(url, { headers, params, responseType: 'blob' });
  }
}
