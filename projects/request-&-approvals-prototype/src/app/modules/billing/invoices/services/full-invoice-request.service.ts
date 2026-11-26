import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  DistributorRouteService,
  scopedOrganizationHeaderFor,
} from '@fz-original/app/shared/services/distributor/distributor-route.service';
import { adaptNominativeRequest, type NominativeRequest, type NominativeRequestDTO, type NominativeRequestPayloadDTO } from '@fz/invoicing';
import { map, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';

export type FullInvoiceRequestPayload = NominativeRequestPayloadDTO;

@Injectable({ providedIn: 'root' })
export class FullInvoiceRequestService {
  readonly #distributorRoute = inject(DistributorRouteService);
  #http = inject(HttpClient);

  requestFullInvoice(partnerId: number, orderId: number, payload: FullInvoiceRequestPayload, orderPartnerId?: number): Observable<void> {
    const distributorId = this.#distributorRoute.actingDistributorId();
    const scopedPartnerId = orderPartnerId ?? this.#distributorRoute.pairTarget()?.targetOrganizationId;

    if (distributorId !== null && scopedPartnerId === undefined) {
      return throwError(() => new Error('No partner chosen for the acting distributor'));
    }

    const endpoint =
      distributorId !== null ? this.#scopedOrderEndpoint(scopedPartnerId as number, orderId) : this.#orderEndpoint(partnerId, orderId);
    const headers = new HttpHeaders(distributorId !== null ? scopedOrganizationHeaderFor(distributorId) : {});

    return this.#http.post<void>(endpoint, payload, { headers });
  }

  getNominativeRequestStatus(partnerId: number, orderId: number, orderPartnerId?: number): Observable<NominativeRequest | null> {
    const distributorId = this.#distributorRoute.actingDistributorId();
    const scopedPartnerId = orderPartnerId ?? this.#distributorRoute.pairTarget()?.targetOrganizationId;

    if (distributorId !== null && scopedPartnerId === undefined) {
      return of(null);
    }

    const endpoint =
      distributorId !== null ? this.#scopedOrderEndpoint(scopedPartnerId as number, orderId) : this.#orderEndpoint(partnerId, orderId);
    const headers = new HttpHeaders(distributorId !== null ? scopedOrganizationHeaderFor(distributorId) : {});

    return this.#http
      .get<{ data: NominativeRequestDTO | null }>(endpoint, { headers })
      .pipe(map(response => adaptNominativeRequest(response)));
  }

  requestFullInvoiceByPurchaseUrn(partnerId: number, purchaseUrn: string, payload: FullInvoiceRequestPayload): Observable<void> {
    return this.#http.post<void>(this.#purchaseEndpoint(partnerId, purchaseUrn), payload);
  }

  getNominativeRequestStatusByPurchaseUrn(partnerId: number, purchaseUrn: string): Observable<NominativeRequest | null> {
    return this.#http
      .get<{ data: NominativeRequestDTO | null }>(this.#purchaseEndpoint(partnerId, purchaseUrn))
      .pipe(map(response => adaptNominativeRequest(response)));
  }

  #orderEndpoint(partnerId: number, orderId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/orders/${orderId}/nominative-request`;
  }

  #purchaseEndpoint(partnerId: number, purchaseUrn: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/purchases/${encodeURIComponent(purchaseUrn)}/nominative-request`;
  }

  #scopedOrderEndpoint(partnerId: number, orderId: number): string {
    return `${environment.apiGWBaseUrl}/2.0/partners/${partnerId}/orders/${orderId}/nominative-request`;
  }
}
