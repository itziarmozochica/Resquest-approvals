import { PaymentCheckoutTransaction } from '@fz-original/app/app/models/payment.model';

export class AdyenConfiguration {
  constructor(public devicesIds: string[]) {}

  clone(): AdyenConfiguration {
    return new AdyenConfiguration(this.devicesIds);
  }

  isEqual(other?: AdyenConfiguration): boolean {
    return this.devicesIds.every((val, index) => val === other?.devicesIds[index]);
  }
}

export interface AdyenCreateCheckoutBodyData {
  channel_id?: string;
  device_id: string;
  payment_card_type?: string;
  payment_method_type?: string;
  place_id?: number;
  split_payment_flag?: boolean;
  user_id: number;
}

export interface AdyenCreateCheckoutBody {
  channelId?: string;
  deviceId?: string;
  paymentCardType?: string;
  paymentType?: string;
  placeId?: number;
  splitPaymentFlag?: boolean;
}

export interface AdyenCheckout extends PaymentCheckoutTransaction {
  deviceId: string;
}
