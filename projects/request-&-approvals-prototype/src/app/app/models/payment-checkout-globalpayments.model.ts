import {
  BaseRefundPaymentResultData,
  PaymentCheckoutMessagePayload,
  PaymentCheckoutMessagePayloadStatus,
  PaymentCheckoutTransaction,
  RefundPaymentPayload,
} from '@fz-original/app/app/models/payment.model';

export interface GlobalPaymentsCreateCheckoutBody {
  channelId: string;
  currencyCode: string;
  deviceIdentifier: string;
  paymentDeviceId: string;
  paymentMethodType: string;
  totalAmount: number;
}

export interface GlobalPaymentsCheckout extends PaymentCheckoutTransaction {
  amount: number;
  currencyCode: string;
  last4cardNumbers: string;
  transactionNumber: string;
}

export interface CheckoutPaymentFinishedTransaction {
  amount: number;
  currencyCode: string;
  last4cardNumbers: string;
  transactionNumber: string;
}

export interface GlobalPaymentsCheckoutPaymentResultData extends PaymentCheckoutMessagePayloadStatus {
  data: {
    transaction: CheckoutPaymentFinishedTransaction;
  };
  paymentGateway: 'globalpayments';
}

export interface GlobalPaymentsCheckoutPaymentPayload extends PaymentCheckoutMessagePayload<GlobalPaymentsCheckoutPaymentData> {
  paymentGateway: 'globalpayments';
}

export interface GlobalPaymentsCheckoutPaymentData {
  amount: number;
  currencyCode: string;
}

export interface CancelPaymentPayload {
  paymentGateway: 'globalpayments';
}

export interface GlobalPaymentsCancelPaymentPayload extends CancelPaymentPayload {}

export interface GlobalPaymentsRefundPaymentPayload extends RefundPaymentPayload {
  paymentGateway: 'globalpayments';
}

export interface GlobalPaymentsRefundResultData extends BaseRefundPaymentResultData {
  data?: {
    transaction: GlobalPaymentsRefundPaymentFinishedTransaction;
  };
  paymentGateway: 'globalpayments';
}

export interface GlobalPaymentsRefundPaymentFinishedTransaction {
  amount: number;
  currencyCode: string;
  last4cardNumbers: string;
  transactionNumber: string;
}
