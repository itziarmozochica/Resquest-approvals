import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SeatInfoApiResponse, SeatInfoResult } from '../../models/seat-info/seat-info-response.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';

@Injectable({
  providedIn: 'root',
})
export class SeatInfoService {
  readonly #http = inject(HttpClient);

  getSeatInfo(partnerId: number, mainPlanId: number, seatReference: string, seatingPoolId: number): Observable<SeatInfoResult> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${mainPlanId}/seat-info/`;
    const params = new HttpParams().set('seat_reference', seatReference).set('seating_pool_id', seatingPoolId);

    return this.#http.get<{ data?: SeatInfoApiResponse } | SeatInfoApiResponse>(url, { params }).pipe(
      map(response => {
        const data: SeatInfoApiResponse | undefined =
          response && typeof response === 'object' && 'data' in response ? response.data : (response as SeatInfoApiResponse);
        if (!data) {
          throw new Error('Invalid seat-info response');
        }
        const orderId = data.order_id != null ? data.order_id : undefined;
        const reservationLocator = data.reservation_locator != null ? data.reservation_locator : undefined;
        if (orderId == null && reservationLocator == null) {
          throw new Error('Invalid seat-info response');
        }
        return { orderId, reservationLocator };
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }
}
