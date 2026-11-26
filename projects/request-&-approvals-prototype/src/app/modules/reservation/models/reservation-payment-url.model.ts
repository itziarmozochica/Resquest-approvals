import { PaymentOption } from './payment-option.enum';

export interface ReservationPaymentUrl {
  applicationId: string;
  applicationName: string;
  url: string;
}

export interface ReservationPaymentUrlResponse {
  application_id: string;
  application_name: string;
  url: string;
}

export interface SendReservationPaymentLinkQuery {
  applicationId: string;
  partnerId: number;
  placeId: number;
  planId: number;
  reservationId: string;
  userId: number;
  language?: string;
  paymentOption?: PaymentOption;
}
