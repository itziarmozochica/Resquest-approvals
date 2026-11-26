import { Injectable } from '@angular/core';

import {
  DepositPaymentResult,
  DepositPaymentResultApiStatus,
  DepositPaymentResultResponse,
} from '@fz-original/app/modules/reservation/models/deposit-payment-result.model';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class DepositPaymentResultAdapter {
  fromApi(body: BaseResponse<DepositPaymentResultResponse>): BaseResponse<DepositPaymentResult | null> {
    const { data, error } = this.#parseApiBody(body);
    return new BaseResponse(this.#getResponseData(data), this.#getError(error));
  }

  getInProgressResponse(): BaseResponse<DepositPaymentResult> {
    return new BaseResponse<DepositPaymentResult>(
      {
        amountPaid: null,
        currency: null,
        depositId: null,
        depositStatus: null,
        reservationId: null,
        status: DepositPaymentResultApiStatus.NOT_READY,
      },
      null,
    );
  }

  #getError(data: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: `errors.${data.code}` };
  }

  #getResponseData(responseData: DepositPaymentResultResponse | null): DepositPaymentResult | null {
    if (responseData == null) {
      return null;
    }
    return {
      amountPaid: responseData.amount_paid ?? null,
      currency: responseData.currency ?? null,
      depositId: responseData.deposit_id ?? null,
      depositStatus: responseData.deposit_status ?? null,
      reservationId: responseData.reservation_id ?? null,
      status: responseData.status,
    };
  }

  #parseApiBody(body: BaseResponse<DepositPaymentResultResponse>): {
    data: DepositPaymentResultResponse | null;
    error: BaseErrorResponse | null | undefined;
  } {
    if (body instanceof BaseResponse) {
      return {
        data: body.data as DepositPaymentResultResponse | null,
        error: body.error as BaseErrorResponse | undefined,
      };
    }
    if (body == null || typeof body !== 'object') {
      return { data: null, error: null };
    }
    const record = body as Record<string, unknown>;
    if ('data' in record || 'error' in record) {
      return {
        data: (record.data ?? null) as DepositPaymentResultResponse | null,
        error: record.error as BaseErrorResponse | null | undefined,
      };
    }
    return { data: body as DepositPaymentResultResponse, error: null };
  }
}
