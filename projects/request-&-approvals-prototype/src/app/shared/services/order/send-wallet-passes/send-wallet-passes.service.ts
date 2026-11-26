import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { EMPTY, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { DistributorRouteService, scopedOrganizationHeader } from '../../distributor/distributor-route.service';

export interface SendWalletPassesData {
  partnerId: number;
  ticketId: number;
  email?: string;
  includeQrCodes?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SendWalletPassesService {
  #http = inject(HttpClient);
  readonly #distributorRoute = inject(DistributorRouteService);

  sendWalletPasses(data: SendWalletPassesData): Observable<void> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }

    const { email, includeQrCodes, partnerId, ticketId } = data;
    const target = this.#distributorRoute.pairTarget();
    const path =
      target !== null
        ? `${environment.apiBaseUrl}/3.0/tickets/${ticketId}/send-wallet-passes/`
        : `${environment.apiBaseUrl}/3.0/partners/${partnerId}/tickets/${ticketId}/send_wallet_passes/`;
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    const body = {
      include_qr_codes: includeQrCodes ?? false,
      ...(email !== undefined && { email }),
    };

    return this.#http.post<void>(path, body, { headers }).pipe(map((): undefined => undefined));
  }
}
