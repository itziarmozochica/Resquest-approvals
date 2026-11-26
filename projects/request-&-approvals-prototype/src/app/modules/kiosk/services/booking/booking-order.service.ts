import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';

import { BookingOrderDetail } from './booking-order.model';

/**
 * Reads a single order's detail (event info, tickets, codes, reschedule info)
 * from the customer-facing endpoint, authenticated by the order-group otoken
 * (attached by `bookingOtokenInterceptor`). The `/api/4.2/orders/{id}/` payload
 * is a flat order object (no `data` envelope, unlike the 5.0 orders list).
 */
@Injectable({ providedIn: 'root' })
export class BookingOrderService {
  readonly #http = inject(HttpClient);

  getOrderDetail(orderId: number): Observable<BookingOrderDetail> {
    const url = `${environment.apiB2CBaseUrl}/api/4.2/orders/${orderId}/`;
    return this.#http.get<BookingOrderDetail>(url);
  }
}
