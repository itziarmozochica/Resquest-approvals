import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { EMPTY, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { DistributorRouteService, scopedOrganizationHeader } from '../../distributor/distributor-route.service';

@Injectable({
  providedIn: 'root',
})
export class ForwardOrderPurchaseConfirmationService {
  #http = inject(HttpClient);
  readonly #distributorRoute = inject(DistributorRouteService);

  forwardOrderPurchaseConfirmation(partnerId: number, orderId: number, recipientEmail: string): Observable<void> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }

    const target = this.#distributorRoute.pairTarget();
    const path =
      target !== null
        ? `${environment.apiBaseUrl}/3.0/orders/${orderId}/forward-purchase-confirmation-email/`
        : `${environment.apiBaseUrl}/3.0/partners/${partnerId}/orders/${orderId}/forward-purchase-confirmation-email/`;
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});

    return this.#http.post<void>(path, { recipient_email: recipientEmail }, { headers }).pipe(map((): undefined => undefined));
  }
}
