import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';

import { EntitlementReschedulePair, EntitlementRescheduleRequest } from './booking-reschedule.model';

/**
 * Reschedules entitlement (free) tickets into new sessions via the customer
 * endpoint `POST /api/5.0/entitlements/reschedule/` (otoken attached by the
 * interceptor). Resolves on 204; a 409 (session clash) surfaces as an HTTP
 * error so the caller can re-submit with `acknowledgeClash = true`.
 */
@Injectable({ providedIn: 'root' })
export class BookingRescheduleService {
  #httpClient = inject(HttpClient);

  reschedule(pairs: EntitlementReschedulePair[], acknowledgeClash = false): Observable<void> {
    const url = `${environment.apiB2CBaseUrl}/api/5.0/entitlements/reschedule/`;
    const body: EntitlementRescheduleRequest = { pairs };
    if (acknowledgeClash) {
      body.acknowledge_clash = true;
    }
    return this.#httpClient.post<void>(url, body);
  }
}
