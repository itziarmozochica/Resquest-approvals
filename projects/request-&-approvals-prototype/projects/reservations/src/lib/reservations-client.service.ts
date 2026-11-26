import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import type { BaseResponse } from '@fz/http-models';
import { map, type Observable } from 'rxjs';

import {
  adaptNewReservation,
  adaptReservationExternalLocator,
  adaptReservationPayment,
  adaptReservationPurchaseUrls,
  adaptReservationRead,
  adaptReservationsList,
  parseLinkPagination,
  scopedOrganizationHeader,
  toContactBody,
  toEndCustomerBody,
  toExternalLocatorBody,
  toPaymentBody,
  toPaymentLinkBody,
  toPurchaseUrlsParams,
  toReservationsQueryParams,
  toReserveBody,
  type NewReservation,
  type NewReservationApi,
  type ReservationContactUpdate,
  type ReservationDetail,
  type ReservationEndCustomerUpdate,
  type ReservationExternalLocator,
  type ReservationExternalLocatorApi,
  type ReservationPayment,
  type ReservationPaymentApi,
  type ReservationPaymentLink,
  type ReservationPurchaseUrl,
  type ReservationPurchaseUrlsApi,
  type ReservationPurchaseUrlsQuery,
  type ReservationReadApi,
  type ReservationsListApi,
  type ReservationsPage,
  type ReservationsQuery,
  type ReservePayload,
  type ReservePayment,
} from './core';
import { RESERVATIONS_CONFIG } from './reservations.config';

export type ReservationsDownloadFormat = 'csv' | 'pdf';

const DOWNLOAD_ACCEPT: Readonly<Record<ReservationsDownloadFormat, string>> = {
  csv: 'text/csv',
  pdf: 'application/pdf',
};

@Injectable()
export class ReservationsClient {
  readonly #config = inject(RESERVATIONS_CONFIG);
  readonly #http = inject(HttpClient);

  clearEndCustomer(organizationId: number, reservationId: string): Observable<void> {
    const url = `${this.#config.baseUrl}/3.0/reservations/${reservationId}/end-customer/`;

    return this.#http.delete(url, { headers: scopedOrganizationHeader(organizationId) }).pipe(map((): void => undefined));
  }

  /** The file as the backend rendered it, for the filters and order of the list but not its page. */
  download(organizationId: number, query: ReservationsQuery, format: ReservationsDownloadFormat): Observable<Blob> {
    const url = `${this.#config.baseUrl}/3.0/reservations/`;
    const filters: ReservationsQuery = { ...query, itemsPerPage: undefined, page: undefined };

    return this.#http.get(url, {
      headers: new HttpHeaders({ ...scopedOrganizationHeader(organizationId), Accept: DOWNLOAD_ACCEPT[format] }),
      params: toReservationsQueryParams(filters),
      responseType: 'blob',
    });
  }

  /** The PDF as the backend rendered it: the bytes are the answer, so there is no envelope to adapt. */
  getDeliveryNote(organizationId: number, reservationId: string): Observable<Blob> {
    const url = `${this.#config.baseUrl}/3.0/reservations/${reservationId}/delivery-note/`;

    return this.#http.get(url, { headers: scopedOrganizationHeader(organizationId), responseType: 'blob' });
  }

  getPurchaseUrls(
    organizationId: number,
    cartId: string,
    query: ReservationPurchaseUrlsQuery,
  ): Observable<readonly ReservationPurchaseUrl[]> {
    const url = `${this.#config.baseUrl}/3.0/carts/${cartId}/purchase-urls/`;

    return this.#http
      .get<BaseResponse<ReservationPurchaseUrlsApi>>(url, {
        headers: scopedOrganizationHeader(organizationId),
        params: toPurchaseUrlsParams(query),
      })
      .pipe(map(adaptReservationPurchaseUrls));
  }

  /**
   * Keyed by the reservation's id, which is what the route accepts: fever2 declares
   * `/reservations/{uuid:reservation_id}/`, so a locator does not match the path at all.
   */
  getReservation(organizationId: number, reservationId: string): Observable<ReservationDetail | null> {
    const url = `${this.#config.baseUrl}/3.0/reservations/${reservationId}/`;
    return this.#http
      .get<BaseResponse<ReservationReadApi>>(url, { headers: scopedOrganizationHeader(organizationId) })
      .pipe(map(adaptReservationRead));
  }

  list(organizationId: number, query: ReservationsQuery = {}): Observable<ReservationsPage | null> {
    const url = `${this.#config.baseUrl}/3.0/reservations/`;

    return this.#http
      .get<BaseResponse<ReservationsListApi>>(url, {
        headers: scopedOrganizationHeader(organizationId),
        observe: 'response',
        params: toReservationsQueryParams(query),
      })
      .pipe(map(response => adaptReservationsList(response.body, parseLinkPagination(response.headers.get('Link')))));
  }

  pay(organizationId: number, reservationId: string, payment: ReservePayment): Observable<ReservationPayment | null> {
    const url = `${this.#config.baseUrl}/3.0/reservations/${reservationId}/pay/`;

    return this.#http
      .post<BaseResponse<ReservationPaymentApi>>(url, toPaymentBody(payment), {
        headers: scopedOrganizationHeader(organizationId),
      })
      .pipe(map(adaptReservationPayment));
  }

  reserve(organizationId: number, cartId: string, payload: ReservePayload = {}): Observable<NewReservation | null> {
    const url = `${this.#config.baseUrl}/3.0/carts/${cartId}/reserve/`;
    return this.#http
      .post<BaseResponse<NewReservationApi>>(url, toReserveBody(payload), { headers: scopedOrganizationHeader(organizationId) })
      .pipe(map(adaptNewReservation));
  }

  sendPaymentLink(organizationId: number, reservationId: string, link: ReservationPaymentLink): Observable<void> {
    const url = `${this.#config.baseUrl}/3.0/reservations/${reservationId}/send-payment-email/`;

    return this.#http
      .post(url, toPaymentLinkBody(link), { headers: scopedOrganizationHeader(organizationId) })
      .pipe(map((): void => undefined));
  }

  /**
   * `null` sets no reference and clears the one there is — the body always carries the key, because an absent
   * one is a 400. The answer is what the backend stored after normalizing, not the argument echoed back.
   *
   * A **404** here means the reservation belongs to a colleague at the same business; a **403** covers a missing
   * header, no concession on the reservation's partner, and an id that does not exist, which the backend
   * deliberately does not distinguish.
   */
  setExternalReservationId(
    organizationId: number,
    reservationId: string,
    externalReservationId: string | null,
  ): Observable<ReservationExternalLocator | null> {
    const url = `${this.#config.baseUrl}/3.0/reservations/${reservationId}/external-locator/`;

    return this.#http
      .patch<BaseResponse<ReservationExternalLocatorApi>>(url, toExternalLocatorBody(externalReservationId), {
        headers: scopedOrganizationHeader(organizationId),
      })
      .pipe(map(adaptReservationExternalLocator));
  }

  updateContact(organizationId: number, reservationId: string, update: ReservationContactUpdate): Observable<ReservationDetail | null> {
    const url = `${this.#config.baseUrl}/3.0/reservations/${reservationId}/contact/`;

    return this.#http
      .patch<BaseResponse<ReservationReadApi>>(url, toContactBody(update), { headers: scopedOrganizationHeader(organizationId) })
      .pipe(map(adaptReservationRead));
  }

  updateEndCustomer(
    organizationId: number,
    reservationId: string,
    update: ReservationEndCustomerUpdate,
  ): Observable<ReservationDetail | null> {
    const url = `${this.#config.baseUrl}/3.0/reservations/${reservationId}/end-customer/`;

    return this.#http
      .put<BaseResponse<ReservationReadApi>>(url, toEndCustomerBody(update), { headers: scopedOrganizationHeader(organizationId) })
      .pipe(map(adaptReservationRead));
  }
}
