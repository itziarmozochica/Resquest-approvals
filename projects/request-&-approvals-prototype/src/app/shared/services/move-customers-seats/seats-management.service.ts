import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { catchError, Observable, of } from 'rxjs';

import { BaseResponse } from '../../models/base-response';
import { PaginatedOrders } from '../../models/move-customers-seats';
import { failure, success } from '../../utils/base-response.utils';
import { PartnerService } from '../partner/partner.service';
import { OrderService } from './order/order.service';
import { CancelCodesAndReleaseSeatsOptions, LinkOrdersRequest, SeatCancellationItem, TicketService } from './ticket/ticket.service';

export const seatManagementErrorCode = {
  invalidSessionPlanId: 'SeatManagement.InvalidSessionPlanId',
  invalidPagination: 'SeatManagement.InvalidPagination',
  partnerIdRequired: 'SeatManagement.PartnerIdRequired',
  translationError: 'SeatManagement.TranslationError',
} as const;
export type SeatManagementErrorCode = (typeof seatManagementErrorCode)[keyof typeof seatManagementErrorCode];

@Injectable({
  providedIn: 'root',
})
export class SeatsManagementService {
  #datadogLogService = inject(DatadogLogService);
  #orderService = inject(OrderService);
  #partnerService = inject(PartnerService);
  #ticketService = inject(TicketService);

  cancelCodesAndReleaseSeats(
    cancellations: SeatCancellationItem[],
    orderLinking?: { sourceOrderId: number; targetOrderId: number },
  ): Observable<BaseResponse<void>> {
    const { data: partnerId, error: partnerIdError } = this.#getPartnerId();
    if (partnerId === null) {
      return of(failure<void>(partnerIdError));
    }

    const options: CancelCodesAndReleaseSeatsOptions = {
      cancellations,
      ...(orderLinking && {
        source_order_id: orderLinking.sourceOrderId,
        target_order_id: orderLinking.targetOrderId,
      }),
    };

    return this.#ticketService.cancelCodesAndReleaseSeats(partnerId, options).pipe(catchError(error => of(failure<void>(error))));
  }

  linkOrders(request: LinkOrdersRequest): Observable<BaseResponse<void>> {
    const { data: partnerId, error: partnerIdError } = this.#getPartnerId();
    if (partnerId === null) {
      return of(failure<void>(partnerIdError));
    }

    return this.#ticketService.linkOrders(partnerId, request).pipe(catchError(error => of(failure<void>(error))));
  }

  getSeatsByOrder(
    planId: number,
    sessionId: number,
    page: number,
    pageSize: number,
    orderId?: number,
  ): Observable<BaseResponse<PaginatedOrders>> {
    const { data: partnerId, error: partnerIdError } = this.#getPartnerId();
    if (partnerId === null) {
      return of(failure<PaginatedOrders>(partnerIdError));
    }

    return this.#orderService
      .getSeats(partnerId, planId, sessionId, page, pageSize, undefined, orderId)
      .pipe(catchError(error => of(failure<PaginatedOrders>(error))));
  }

  setTicketSeats(ticketId: number, seatReferences: string[], releaseSeats = false): Observable<BaseResponse<void>> {
    const { data: partnerId, error: partnerIdError } = this.#getPartnerId();

    if (partnerId === null) {
      return of(failure<void>(partnerIdError));
    }

    return this.#ticketService
      .setSeats(partnerId, ticketId, seatReferences, releaseSeats)
      .pipe(catchError(error => of(failure<void>(error))));
  }

  #getPartnerId(): BaseResponse<number> {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      this.#datadogLogService.logError(seatManagementErrorCode.partnerIdRequired, {
        partnerId,
        context: 'Getting partner ID from PartnerService',
      });
      return failure<number>({ code: 'generic' });
    }
    return success<number>(partnerId);
  }
}
