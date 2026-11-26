import { PaymentCheckoutDepositET, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { AdyenCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import { CancelPaymentPayload, GlobalPaymentsCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-globalpayments.model';
import { PayhereCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-payhere.model';
import { RazorpayCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-razorpay.model';
import { SquareCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-square.model';
import { StripeCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-stripe.model';
import { PaymentMethod } from '@fz-original/app/modules/box-office/checkout/models/payment-method.model';
import { WebViewTypeMessage } from '@fz-original/app/shared/services/webview-messenger/models/web-view-type-message.model';

import { WebViewMessage } from '@feverup/ts-webview';

export interface PaymentConfigurationData {
  adyen?: {
    devices_ids: string[];
  };
  square?: {
    application_id: string;
    location_id: string;
  };
}

export interface CreateCheckoutParam {
  adyenCreateCheckoutBody?: AdyenCreateCheckoutBody;
  b2bUserId?: number;
  cartId: string;
  cashReceived?: number;
  cashLegAmount?: number;
  /**
   * @todo add more concrete type.
   *
   * There is in this moment in this project a naming clash
   * between the Channel enum and the Channel class.
   *
   * This is worth a refactoring ticket.
   */
  channel?: string;
  deviceId?: string;
  globalPaymentsCreateCheckoutBody?: GlobalPaymentsCreateCheckoutBody;
  overrideCapacity?: boolean;
  partnerId: number;
  payhereCreateCheckoutBody?: PayhereCreateCheckoutBody;
  paymentCheckout: PaymentCheckoutET;
  paymentMethod?: PaymentMethod;
  razorpayCreateCheckoutBody?: RazorpayCreateCheckoutBody;
  splitLegIndex?: number;
  splitPaymentFlag?: boolean;
  squareCreateCheckoutBody?: SquareCreateCheckoutBody;
  stripeCreateCheckoutBody?: StripeCreateCheckoutBody;
  userId: number;
}

export interface CreateDepositCheckoutParam {
  b2bUserId?: number;
  cartId: string;
  channel: string;
  partnerId: number;
  paymentCheckout: PaymentCheckoutDepositET;
  paymentMethod: PaymentMethod;
  stripeCreateCheckoutBody?: StripeCreateCheckoutBody;
  userId: number;
}

export interface PaymentCheckoutTransaction {
  transactionId: string;
  blockBooker?: boolean;
  blocksPurchaseOnFailure?: boolean;
}

export interface PaymentCheckoutTransactionData {
  transaction_id: string;
  block_booker?: boolean;
  blocks_purchase_on_failure?: boolean;
}

export interface PaymentCheckoutMessage<T extends PaymentCheckoutMessagePayload> extends WebViewMessage<T> {
  payload: T;
  type: WebViewTypeMessage.payment_checkout;
}

export interface PaymentCheckoutMessagePayload<T = unknown> {
  data: T;
  paymentGateway: PaymentCheckoutET;
}

export interface PaymentCheckoutMessagePayloadStatus<T = unknown> extends PaymentCheckoutMessagePayload<T> {
  status: number;
}

export interface CancelPaymentMessage<T extends CancelPaymentPayload> extends WebViewMessage<T> {
  payload: T;
  type: WebViewTypeMessage.payment_cancel;
}

export interface RefundPaymentPayload<T = unknown> {
  data: T;
  paymentGateway: string;
}

export interface RefundPaymentMessage<T extends RefundPaymentPayload> extends WebViewMessage<T> {
  payload: T;
  type: WebViewTypeMessage.payment_refund;
}

export interface BaseRefundPaymentResultData {
  data?: unknown;
  paymentGateway: PaymentCheckoutET;
  status: number;
}
