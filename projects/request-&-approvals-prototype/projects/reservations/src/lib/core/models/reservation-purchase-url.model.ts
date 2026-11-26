export interface ReservationPurchaseUrlApi {
  application_id: string;
  application_name: string;
  url: string;
}

export interface ReservationPurchaseUrlsApi {
  urls: ReservationPurchaseUrlApi[];
}

export interface ReservationPurchaseUrl {
  readonly applicationId: string;
  readonly applicationName: string;
  readonly url: string;
}

export interface ReservationPurchaseUrlsQuery {
  readonly language?: string;
  readonly reservationId: string;
}
