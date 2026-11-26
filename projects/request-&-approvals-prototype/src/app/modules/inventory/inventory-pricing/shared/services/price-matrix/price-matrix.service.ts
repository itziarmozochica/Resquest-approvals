import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { IBaseResponse } from '@fz-original/app/shared/models/base-response';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { buildSessionTypeCategoryHttpParams } from '../../utils/session-type-category.util';
import { PriceMatrixGetAdapter } from './price-matrix-get.adapter';
import { PriceMatrixResponse, PriceMatrixResponseDTO } from './price-matrix.model';

@Injectable({
  providedIn: 'root',
})
export class PriceMatrixService {
  #http = inject(HttpClient);
  #partnerService = inject(PartnerService);
  #priceMatrixGetAdapter = inject(PriceMatrixGetAdapter);

  getPriceMatrix(planId: number, sessionTypeCategories?: string[], includeArchivedTicketTypes?: boolean): Observable<PriceMatrixResponse> {
    const url = this.#getPriceMatrixUrl(planId);
    let params = buildSessionTypeCategoryHttpParams(sessionTypeCategories);

    if (includeArchivedTicketTypes !== undefined) {
      params = (params ?? new HttpParams()).set('include_archived_ticket_types', String(includeArchivedTicketTypes));
    }

    return this.#http.get<IBaseResponse<PriceMatrixResponseDTO>>(url, { params }).pipe(
      map((response: IBaseResponse<PriceMatrixResponseDTO>) => this.#priceMatrixGetAdapter.fromApi(response)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  #getPriceMatrixUrl(planId: number): string {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      throw new Error('Partner not found');
    }
    const baseUrl = environment.apiBaseUrl;
    return `${baseUrl}/3.0/partners/${partner.id}/plans/${planId}/price-lists/matrix/`;
  }
}
