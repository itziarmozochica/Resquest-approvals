import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BookingOrderGroup, BookingOrdersResponse, BookingOrdersStatus } from './booking-orders.model';

/**
 * Reads the order group(s) the otoken grants access to from the customer
 * endpoint `GET /api/5.0/user/orders/` (otoken attached by the interceptor).
 */
@Injectable({ providedIn: 'root' })
export class BookingOrdersService {
  readonly #http = inject(HttpClient);

  getOrderGroups(status?: BookingOrdersStatus): Observable<BookingOrderGroup[]> {
    const url = `${environment.apiB2CBaseUrl}/api/5.0/user/orders/`;
    let params = new HttpParams().set('page_size', '50').set('page_number', '1').set('include_transferred_orders', 'true');
    if (status) {
      params = params.set('status', status);
    }
    return this.#http.get<BookingOrdersResponse>(url, { params }).pipe(map(response => response.data));
  }
}
