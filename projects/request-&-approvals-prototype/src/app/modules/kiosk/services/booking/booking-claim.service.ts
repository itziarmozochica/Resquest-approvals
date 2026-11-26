import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ClaimOrderGroupResponse {
  token: string;
}

/**
 * Exchanges a typed booking reference (the order-group claim code) for an
 * order-group otoken via the public `POST /api/5.0/orders/claim/` endpoint.
 * This endpoint is intentionally NOT in the otoken interceptor allow-list — it
 * is how an anonymous walk-up customer obtains a token in the first place.
 */
@Injectable({ providedIn: 'root' })
export class BookingClaimService {
  readonly #http = inject(HttpClient);

  claimByCode(code: string): Observable<string> {
    const url = `${environment.apiB2CBaseUrl}/api/5.0/orders/claim/`;
    return this.#http.post<ClaimOrderGroupResponse>(url, { code }).pipe(map(response => response.token));
  }
}
