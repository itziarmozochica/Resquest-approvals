import { Injectable } from '@angular/core';

import {
  SquareCheckout,
  SquareCreateCheckoutBody,
  SquareCreateCheckoutBodyData,
} from '@fz-original/app/app/models/payment-checkout-square.model';
import { PaymentCheckoutTransaction, PaymentCheckoutTransactionData } from '@fz-original/app/app/models/payment.model';
import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class SquareCreateCheckoutAsyncAdapter implements AdapterInterface<BaseResponse<PaymentCheckoutTransaction>> {
  fromApi(response: PaymentCheckoutTransactionData): BaseResponse<PaymentCheckoutTransaction> {
    return new BaseResponse<PaymentCheckoutTransaction>(this.#getResponseData(response), null);
  }

  toApi(body: SquareCreateCheckoutBody, userId: number): SquareCreateCheckoutBodyData {
    return {
      location_id: body.locationId,
      application_id: body.applicationId,
      device_id: body.deviceId,
      idempotency_key: body.idempotencyKey,
      user_id: userId,
      channel_id: body.channelId,
      payment_method_type: body.paymentMethodType,
      skip_receipt_screen: body.skipReceiptScreen,
    };
  }

  #getResponseData(response: PaymentCheckoutTransactionData): SquareCheckout {
    return {
      transactionId: response.transaction_id,
    };
  }
}
