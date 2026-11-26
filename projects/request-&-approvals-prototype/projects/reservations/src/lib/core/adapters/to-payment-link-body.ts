import type { ReservationPaymentLink } from '../models/reservation-payment-link.model';

export interface ReservationPaymentLinkBody {
  application_id: string;
  language?: string;
}

export function toPaymentLinkBody(link: ReservationPaymentLink): ReservationPaymentLinkBody {
  return {
    application_id: link.applicationId,
    ...(link.language === undefined ? {} : { language: link.language }),
  };
}
