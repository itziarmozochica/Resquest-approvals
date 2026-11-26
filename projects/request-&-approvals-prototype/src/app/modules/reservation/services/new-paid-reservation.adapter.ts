import { inject, Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../shared/models/base-response';
import { NewPaidReservation } from '../models/new-paid-reservation.model';
import { NewReservationAdapter } from './new-reservation.adapter';

export interface NewPaidReservationApiResponse {
  data?: {
    expires_at: string;
    id: string;
    locator: string;
    order?: {
      id: number;
    };
    order_ids?: number[];
  };
  error?: BaseErrorResponse;
}

@Injectable({ providedIn: 'root' })
export class NewPaidReservationAdapter implements AdapterInterface<BaseResponse<NewPaidReservation>> {
  #newReservationAdapter = inject(NewReservationAdapter);

  fromApi(response: NewPaidReservationApiResponse): BaseResponse<NewPaidReservation> {
    return new BaseResponse<NewPaidReservation>(this.#getData(response), this.#getError(response.error));
  }

  #getData(response: NewPaidReservationApiResponse): NewPaidReservation | null {
    if (!response.data) {
      return null;
    }

    const reservationData = this.#newReservationAdapter.fromApi(response).data;
    if (!reservationData) {
      return null;
    }

    if (!response.data.order?.id) {
      return null;
    }

    const orderId = response.data.order.id;
    return {
      ...reservationData,
      order: { id: orderId },
      orderIds: response.data.order_ids ?? [orderId],
    };
  }

  #getError(error: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (!error) {
      return null;
    }
    return { code: error.code, error: error.error, errorCode: error.errorCode, message: `errors.${error.code}` };
  }
}
