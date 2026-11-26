import { CreateOrderData } from '@fz-original/app/core/tracking/core/events/create-order';

import { PaymentMethod } from './payment-method.model';
import { PaymentProvider } from './payment-provider.enum';

export interface PurchaseCreateOrderRequestBody
  extends Pick<CreateOrderData, 'cart_id' | 'payment_type' | 'payment_transaction_id' | 'reservation_id'> {
  user_id: number;
  channel_id: string | null;
}

export class Purchase {
  constructor(
    public cartId: string,
    public userId: number,
    public paymentMethod: PaymentMethod,
    public channel: string | null,
    public paymentTransactionId?: string,
  ) {
    this.setPaymentMethodTransactionId();
  }

  private setPaymentMethodTransactionId(): void {
    this.paymentMethod.paymentTransactionId = this.paymentTransactionId ?? this.cartId;
  }

  getPaymentProvider(): PaymentProvider {
    return this.paymentMethod.paymentTransactionId === this.cartId ? PaymentProvider.DELEGATED : PaymentProvider.SQUARE;
  }
}
