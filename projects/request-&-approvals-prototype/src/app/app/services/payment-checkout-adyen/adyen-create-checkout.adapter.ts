import { Injectable } from '@angular/core';

import { AdyenCreateCheckoutBody, AdyenCreateCheckoutBodyData } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import { PaymentCheckoutTransaction, PaymentCheckoutTransactionData } from '@fz-original/app/app/models/payment.model';
import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class AdyenCreateCheckoutAdapter implements AdapterInterface<BaseResponse<PaymentCheckoutTransaction>> {
  fromApi(response: PaymentCheckoutTransactionData): BaseResponse<PaymentCheckoutTransaction> {
    return new BaseResponse<PaymentCheckoutTransaction>(this.getResponseData(response), null);
  }

  toApi(body: AdyenCreateCheckoutBody, userId: number): AdyenCreateCheckoutBodyData {
    const bodyRequest: AdyenCreateCheckoutBodyData = {
      channel_id: body.channelId,
      device_id: body.deviceId ?? '',
      user_id: userId,
    };
    if (body.paymentType) {
      bodyRequest.payment_method_type = body.paymentType;
    }
    if (body.paymentCardType) {
      bodyRequest.payment_card_type = body.paymentCardType;
    }
    if (body.splitPaymentFlag) {
      bodyRequest.split_payment_flag = body.splitPaymentFlag;
    }
    if (body.placeId !== undefined) {
      bodyRequest.place_id = body.placeId;
    }
    return bodyRequest;
  }

  private getResponseData(response: PaymentCheckoutTransactionData): PaymentCheckoutTransaction {
    return {
      transactionId: response.transaction_id,
      ...(response.block_booker === true && { blockBooker: true }),
      ...(response.blocks_purchase_on_failure === true && { blocksPurchaseOnFailure: true }),
    };
  }
}
