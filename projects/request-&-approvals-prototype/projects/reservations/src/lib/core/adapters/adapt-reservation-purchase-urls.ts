import type { BaseResponse } from '@fz/http-models';

import type {
  ReservationPurchaseUrl,
  ReservationPurchaseUrlApi,
  ReservationPurchaseUrlsApi,
  ReservationPurchaseUrlsQuery,
} from '../models/reservation-purchase-url.model';

function adaptReservationPurchaseUrl(purchaseUrl: ReservationPurchaseUrlApi): ReservationPurchaseUrl {
  return { applicationId: purchaseUrl.application_id, applicationName: purchaseUrl.application_name, url: purchaseUrl.url };
}

export function adaptReservationPurchaseUrls(response: BaseResponse<ReservationPurchaseUrlsApi> | null): readonly ReservationPurchaseUrl[] {
  return (response?.data?.urls ?? []).map(adaptReservationPurchaseUrl);
}

export function toPurchaseUrlsParams(query: ReservationPurchaseUrlsQuery): Record<string, string> {
  return {
    reservation_id: query.reservationId,
    ...(query.language === undefined ? {} : { language: query.language }),
  };
}
