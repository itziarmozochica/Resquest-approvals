import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { BookingPortal, BookingPortalResponse } from './booking-portal.model';
import { extractBookingPortal } from './booking-portal.util';

/**
 * Fetches the per-order booking-portal link from the partner-authenticated
 * endpoint. The response carries the order-group `otoken` as a first-class
 * field, which the kiosk uses to drive the native booking screens.
 *
 * Resolves to `null` (rather than erroring) when no portal is available for
 * the order/partner, so callers can simply hide the entry point.
 */
@Injectable({ providedIn: 'root' })
export class BookingPortalService {
  #httpClient = inject(HttpClient);

  getBookingPortal(partnerId: number, planId: number, placeId: number, orderId: number): Observable<BookingPortal | null> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/places/${placeId}/orders/${orderId}/booking-portal/`;
    return this.#httpClient.get<BookingPortalResponse>(url).pipe(
      map(response => extractBookingPortal(response)),
      catchError(() => of(null)),
    );
  }
}
