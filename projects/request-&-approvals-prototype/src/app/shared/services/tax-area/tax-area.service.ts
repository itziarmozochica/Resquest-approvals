import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { PartnerService } from '../partner/partner.service';
import { ProductTypeAssignability } from './product-type-assignability.enum';
import { TaxAreaAdapter } from './tax-area.adapter';
import { TaxArea, TaxAreaDTO } from './tax-area.model';

@Injectable({
  providedIn: 'root',
})
export class TaxAreaService {
  constructor(
    private httpClient: HttpClient,
    private partnerService: PartnerService,
    private taxAreaAdapter: TaxAreaAdapter,
  ) {}

  getTaxArea(planId: number, placeId: number, productTypeAssignability?: ProductTypeAssignability): Observable<BaseResponse<TaxArea>> {
    const url = this.getTaxAreaUrl(planId, placeId);
    const params = productTypeAssignability ? { product_type_assignability: productTypeAssignability } : undefined;

    return this.httpClient.get<BaseResponse<TaxAreaDTO>>(url, { params }).pipe(
      map(response => this.taxAreaAdapter.fromApi(response)),
      catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  private getTaxAreaUrl(planId: number, placeId: number): string {
    return `${environment.apiBaseUrl}/partners/${this.partnerService.getPartner()?.id}/plans/${planId}/places/${placeId}/tax-area/`;
  }
}
