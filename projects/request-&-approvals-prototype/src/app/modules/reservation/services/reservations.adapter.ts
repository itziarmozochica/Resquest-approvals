import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

import { AdapterInterface } from '../../../core/adapter.interface';
import { LinkPaginationResponse } from '../../../shared/models/link-pagination-response';
import { ReservationsSummaryData } from '../models/reservation-summary.model';
import { Reservation } from '../models/reservation.model';
import { ReservationDTO } from './models/reservation.dto';
import { ReservationAdapter } from './reservation.adapter';

@Injectable({
  providedIn: 'root',
})
export class ReservationsAdapter implements AdapterInterface<LinkPaginationResponse<Reservation[]>> {
  constructor(private reservationAdapter: ReservationAdapter) {}

  fromApi(response: HttpResponse<BaseResponse<ReservationsSummaryData>>): LinkPaginationResponse<Reservation[]> {
    const body = response.body;
    if (!body) {
      return new LinkPaginationResponse<Reservation[]>('', null, null);
    }
    return new LinkPaginationResponse<Reservation[]>(
      response.headers.get('Link'),
      this.getData(body.data),
      this.getError(body.error),
      body.data?.count ?? null,
    );
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: ReservationsSummaryData | null | undefined): Reservation[] | null {
    if (data != null && data.reservations) {
      return data.reservations.map((reservation: ReservationDTO) => this.reservationAdapter.fromApi(reservation));
    }
    return null;
  }
}
