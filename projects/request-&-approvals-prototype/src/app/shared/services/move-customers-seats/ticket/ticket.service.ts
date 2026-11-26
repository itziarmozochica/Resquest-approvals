import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { catchError, map, Observable, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../models/base-response';
import { SeatingRelocatedApiResponse } from '../../../models/move-customers-seats';
import { getHttpBaseErrorResponseError } from '../../../utils/error-response.utils';
import { TicketAdapter } from './ticket.adapter';

export interface SeatCancellationItem {
  code_id: number;
  seat_id: number;
}

export interface CancelCodesAndReleaseSeatsOptions {
  cancellations: SeatCancellationItem[];
  source_order_id?: number;
  target_order_id?: number;
}

export const LinkOrdersRescheduleType = {
  FixedPriceUpgrade: 'fixed_price_upgrade',
  AddTicketsModify: 'add_tickets_modify',
} as const;
export type LinkOrdersRescheduleType = (typeof LinkOrdersRescheduleType)[keyof typeof LinkOrdersRescheduleType];

export interface LinkOrdersRequest {
  source_order_id: number;
  target_order_id: number;
  reschedule_type: LinkOrdersRescheduleType;
}

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  #http = inject(HttpClient);
  #ticketAdapter = inject(TicketAdapter);

  cancelCodesAndReleaseSeats(partnerId: number, options: CancelCodesAndReleaseSeatsOptions): Observable<BaseResponse<void>> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/cancel-codes-and-release-seats/`;
    return this.#http.post<unknown>(url, options).pipe(
      map(() => new BaseResponse<void>(null, null)),
      catchError(error => throwError(() => getHttpBaseErrorResponseError(error))),
    );
  }

  linkOrders(partnerId: number, request: LinkOrdersRequest): Observable<BaseResponse<void>> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/link-orders/`;
    return this.#http.post<unknown>(url, request).pipe(
      map(() => new BaseResponse<void>(null, null)),
      catchError(error => throwError(() => getHttpBaseErrorResponseError(error))),
    );
  }

  setSeats(
    partnerId: number,
    ticketId: number,
    seatReferences: string[],
    releaseSeats: boolean,
    apiVersion?: string,
  ): Observable<BaseResponse<void>> {
    const url = this.#buildBaseUrl(partnerId, ticketId, apiVersion);
    return this.#http.post<SeatingRelocatedApiResponse>(url, { seat_references: seatReferences, release_seats: releaseSeats }).pipe(
      map(response => this.#ticketAdapter.fromApi(response)),
      catchError(error => throwError(() => getHttpBaseErrorResponseError(error))),
    );
  }

  #buildBaseUrl(partnerId: number, ticketId: number, apiVersion = '3.0'): string {
    return `${environment.apiBaseUrl}/${apiVersion}/partners/${partnerId}/tickets/${ticketId}/move-seating/`;
  }
}
