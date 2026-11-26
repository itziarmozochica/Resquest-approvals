import { PaymentCheckoutTransaction } from '@fz-original/app/app/models/payment.model';

export interface RazorpayConfiguration {
  devicesIds: string[];
}

export interface RazorpayCreateCheckoutBodyData {
  user_id: number;
  razorpay_device_id: string;
  channel_id?: string;
  payment_method_type?: string;
}

export interface RazorpayCreateCheckoutBody {
  channelId?: string;
  paymentMethodType?: string;
  razorpayDeviceId?: string;
}

export interface RazorpayCheckout extends PaymentCheckoutTransaction {
  deviceId: string;
}
