import { Injectable } from '@angular/core';

import { PaymentCheckout } from '@fz-original/app/app/enums/payment.enum';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../models/base-response';
import { BookResultParams, BookResultParamsDTO } from './models/book-result-params.model';
import { BookResult, BookResultResponse, BookStatusEnum } from './models/book-result-status.model';

@Injectable({
  providedIn: 'root',
})
export class BookResultAdapter implements AdapterInterface<BaseResponse<BookResult>> {
  fromApi(response: BookResultResponse): BaseResponse<BookResult> {
    return new BaseResponse<BookResult>(this.#getResponseData(response), null);
  }

  toApi(params: BookResultParams): BookResultParamsDTO {
    const extra: Partial<BookResultParamsDTO> = {};
    if (
      params.paymentGateway == PaymentCheckout[PaymentCheckout.adyen] ||
      params.paymentGateway == PaymentCheckout[PaymentCheckout.adyen_local]
    ) {
      extra.device_id = params.deviceId;
      extra.transaction_id = params.transactionId;
    } else if (params.paymentGateway == PaymentCheckout[PaymentCheckout.payhere]) {
      extra.transaction_id = params.transactionId;
    } else if (params.paymentGateway == PaymentCheckout[PaymentCheckout.razorpay]) {
      extra.transaction_id = params.transactionId;
    } else if (params.paymentGateway == PaymentCheckout[PaymentCheckout.delegated]) {
      extra.transaction_id = params.transactionId;
    } else if (params.paymentGateway == PaymentCheckout[PaymentCheckout.square]) {
      extra.idempotency_key = params.idempotencyKey;
    }
    return {
      user_id: params.userId,
      payment_gateway: params.paymentGateway,
      seed: Math.floor(Math.random() * 10000000 + 1),
      ...extra,
    };
  }

  #getResponseData(response?: BookResultResponse): BookResult | null {
    if (!response) {
      return null;
    }

    if (response.order_id == null) {
      return { status: BookStatusEnum.InProgress };
    }

    const result: BookResult = {
      orderId: response.order_id,
      orderIds: response.order_ids ?? [response.order_id],
      status: BookStatusEnum.Completed,
    };
    if (response.fiscal_user_message != null) {
      result.fiscalUserMessage = response.fiscal_user_message;
    }
    return result;
  }

  getInProgressResponse(): BaseResponse<BookResult> {
    return new BaseResponse<BookResult>({ status: BookStatusEnum.InProgress }, null);
  }
}
