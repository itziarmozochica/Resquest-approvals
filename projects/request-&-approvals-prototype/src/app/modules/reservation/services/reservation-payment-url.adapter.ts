import { Injectable } from '@angular/core';

import {
  ReservationPaymentUrl,
  ReservationPaymentUrlResponse,
} from '@fz-original/app/modules/reservation/models/reservation-payment-url.model';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../shared/models/base-response';

@Injectable({ providedIn: 'root' })
export class ReservationPaymentUrlAdapter implements AdapterInterface<BaseResponse<ReservationPaymentUrl[]>> {
  fromApi(response: BaseResponse<ReservationPaymentUrlResponse[]>): BaseResponse<ReservationPaymentUrl[]> {
    return new BaseResponse<ReservationPaymentUrl[]>(this.getData(response.data), this.getError(response.error));
  }

  private getData(responseData: ReservationPaymentUrlResponse[] | null): ReservationPaymentUrl[] | null {
    if (!responseData) {
      return null;
    }

    return responseData.map(paymentUrl => ({
      applicationId: paymentUrl.application_id,
      applicationName: paymentUrl.application_name,
      url: paymentUrl.url,
    }));
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }

    return { code: data.code, message: data.message };
  }
}
