import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { TaxDocument, TaxDocumentDTO } from '../../models/tax-document/tax-document.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { DistributorRouteService, scopedOrganizationHeaderFor } from '../distributor/distributor-route.service';
import { PartnerService } from '../partner/partner.service';
import { TaxDocumentAdapter } from './tax-document.adapter';

@Injectable({
  providedIn: 'root',
})
export class TaxDocumentService {
  readonly #distributorRoute = inject(DistributorRouteService);
  readonly #httpClient = inject(HttpClient);
  readonly #taxDocumentAdapter = inject(TaxDocumentAdapter);
  readonly #partnerService = inject(PartnerService);

  downloadTaxDocument(fileUrl: string): Observable<Blob> {
    return this.#httpClient.get(fileUrl, { responseType: 'blob' });
  }

  getTaxDocumentsByOrderId(orderId: number, orderPartnerId?: number): Observable<BaseResponse<Array<TaxDocument>>> {
    const distributorId = this.#distributorRoute.actingDistributorId();
    const scopedPartnerId = orderPartnerId ?? this.#distributorRoute.pairTarget()?.targetOrganizationId;

    if (distributorId !== null && scopedPartnerId === undefined) {
      return of(new BaseResponse<Array<TaxDocument>>([], null));
    }

    const endpoint =
      distributorId !== null
        ? `${environment.apiGWBaseUrl}/2.0/partners/${scopedPartnerId}/orders/${orderId}/tax-documents`
        : `${environment.apiGWBaseUrl}/1.0/partners/${this.#partnerService.getPartner()?.id}/orders/${orderId}/tax-documents`;
    const headers = new HttpHeaders(distributorId !== null ? scopedOrganizationHeaderFor(distributorId) : {});
    const request = this.#httpClient.get<BaseResponse<Array<TaxDocumentDTO>>>(endpoint, { headers });

    return request.pipe(
      map(result => this.#taxDocumentAdapter.fromApi(result)),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  getTaxDocumentsByPurchaseUrn(purchaseUrn: string): Observable<BaseResponse<Array<TaxDocument>>> {
    const partnerId = this.#partnerService.getPartner()?.id;
    const endpoint = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/tax-documents`;
    const request = this.#httpClient.get<BaseResponse<Array<TaxDocumentDTO>>>(endpoint, {
      params: { purchase_urn: purchaseUrn },
    });

    return request.pipe(
      map(result => this.#taxDocumentAdapter.fromApi(result)),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }
}
