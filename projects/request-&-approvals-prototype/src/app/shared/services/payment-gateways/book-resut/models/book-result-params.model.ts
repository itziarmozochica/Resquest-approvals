import { PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';

export interface BookResultParams {
  paymentGateway: PaymentCheckoutET;
  userId: number;
  idempotencyKey?: string;
  transactionId?: string;
  deviceId?: string;
}

export interface BookResultParamsDTO {
  payment_gateway: string;
  user_id: number;
  idempotency_key?: string;
  transaction_id?: string;
  device_id?: string;
  seed?: number;
}

export interface QueryParamBookResult {
  partnerId: number;
  planId: number;
  placeId: number;
  cartId: string;
  userId: number;
  paymentGateway: PaymentCheckoutET;
  transactionId?: string;
  deviceId?: string;
  idempotencyKey?: string;
}
