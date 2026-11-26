import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { EMPTY, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { PaymentType } from '../../../modules/box-office/checkout/models/payment-type.enum';
import { ExportTypeEnum } from '../../components/export-list-button/export-option.model';
import { BaseResponse } from '../../models/base-response';
import { ValidationOrderSummariesPage } from '../../models/order/order-summary.model';
import { Order } from '../../models/order/order.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { DistributorRouteService, scopedOrganizationHeader } from '../distributor/distributor-route.service';
import { GetOrderIncludes } from './get-order-includes';
import { OrderSummaryDTO } from './models/order-summary.dto';
import { OrderDTO } from './models/orders.dto';
import { OrderBaseResponseAdapter } from './order-base-response.adapter';
import { OrderSummariesAdapter } from './order-summaries.adapter';
import { OrdersAdapter } from './orders.adapter';
import { SearchOrderQuery } from './search-order-query';

export interface GetOrderFlags {
  hideFeverDiscount?: boolean;
  includeCancellableItems?: boolean;
  includeNotes?: boolean;
  includeOrderItems?: boolean;
  includePaymentNotes?: boolean;
  includePerItemTax?: boolean;
  includePhoneNumber?: boolean;
  includeReschedules?: boolean;
  includeReservationChannel?: boolean;
  includeUserCancellationRecords?: boolean;
}
type OrderSummariesSearchResponseData = Array<OrderSummaryDTO> | { orders: Array<OrderSummaryDTO>; total_count?: number };

export const CountriesWithPix: Array<string> = ['BR'];
export const CountriesWithCartaValorada: Array<string> = ['BR'];
export const CountriesWithUpi: Array<string> = ['IN'];
export const CountriesWithSimplePaymentsKr: Array<string> = ['KR'];
export const CountriesWithSquareQr: Array<string> = ['JP'];
export const CountriesWithIcCard: Array<string> = ['JP'];
export const CountriesWithIdPayment: Array<string> = ['JP'];
export const CountriesWithQuicpay: Array<string> = ['JP'];

/**
 * @deprecated Use `BoxOfficePaymentMethodsService.getAvailableMethods` instead.
 */
export const PaymentMethodsPerCountry = new Map<string, PaymentType[]>([
  [
    'BR',
    [
      PaymentType.CASH,
      PaymentType.CARD,
      PaymentType.CREDIT_CARD,
      PaymentType.DEBIT_CARD,
      PaymentType.PIX,
      PaymentType.CARTA_VALORADA_AATM,
      PaymentType.CARTA_VALORADA,
    ],
  ],
  ['SG', [PaymentType.CASH, PaymentType.CARD, PaymentType.PAY_NOW]],
  ['IN', [PaymentType.CASH, PaymentType.CARD, PaymentType.UPI]],
  ['KR', [PaymentType.CASH, PaymentType.CARD, PaymentType.SIMPLE_PAYMENTS_KR]],
  ['JP', [PaymentType.CASH, PaymentType.CARD, PaymentType.SQUARE_QR, PaymentType.IC_CARD, PaymentType.ID_PAYMENT, PaymentType.QUICPAY]],
  ['default', [PaymentType.CASH, PaymentType.CARD]],
]);

@Injectable({
  providedIn: 'root',
})
export class PurchaseService {
  readonly #http: HttpClient = inject(HttpClient);
  readonly #orderBaseResponseAdapter: OrderBaseResponseAdapter = inject(OrderBaseResponseAdapter);
  readonly #orderSummariesAdapter: OrderSummariesAdapter = inject(OrderSummariesAdapter);
  readonly #ordersAdapter: OrdersAdapter = inject(OrdersAdapter);
  readonly #distributorRoute: DistributorRouteService = inject(DistributorRouteService);

  /**
   * Downloads the results of an order search as a file. The search endpoint renders the export itself
   * when the `Accept` header carries the exact CSV/XLSX media type; pagination fields are ignored by it.
   */
  exportSearchedOrders(searchOrderQuery: SearchOrderQuery, fileType: ExportTypeEnum, language: string): Observable<Blob> {
    const path = this.#getSearchOrdersUrl(searchOrderQuery.partnerId);
    const params = this.#appendOrderSearchFilters(new HttpParams(), searchOrderQuery);
    const headers = new HttpHeaders({ Accept: fileType, 'Accept-Language': language });
    return this.#http.get(path, { headers, params, responseType: 'blob' });
  }

  getOrder(partnerId: number, orderId: number, orderIncludes?: GetOrderIncludes): Observable<BaseResponse<Order | null>> {
    const path = this.#getOrderUrl(partnerId, orderId);
    const params = this.#getOrderIncludesParams(orderIncludes);
    return this.#http.get<BaseResponse<OrderDTO>>(path, { params }).pipe(
      switchMap(result => {
        return of(this.#orderBaseResponseAdapter.fromApi(result));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<Order>(error);
      }),
    );
  }

  getUserOrder(partnerId: number, userId: number, orderId: number, flags: GetOrderFlags = {}): Observable<BaseResponse<Order | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }

    const target = this.#distributorRoute.pairTarget();
    const path = target !== null ? this.#getScopedOrderUrl(orderId) : this.#getUserOrderUrl(partnerId, userId, orderId);
    const params = this.#getOrderFlagsParams(flags);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    return this.#http.get<BaseResponse<OrderDTO>>(path, { headers, params }).pipe(
      switchMap(result => {
        return of(this.#orderBaseResponseAdapter.fromApi(result));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<Order>(error);
      }),
    );
  }

  searchInvitationOrders(partnerId: number, invitationId: string): Observable<BaseResponse<Order[] | null>> {
    const path = this.#getSearchInvitationOrdersUrl(partnerId, invitationId);

    return this.#http.get<BaseResponse<OrderDTO[]>>(path).pipe(
      switchMap(result => {
        return of(this.#ordersAdapter.fromApi(result));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<Order[]>(error);
      }),
    );
  }

  /**
   * Full-mode order search returning the raw {@link OrderDTO}s (no `Order` adapter). Used by the
   * unified order list, which maps the flat DTO straight to its list row (the `Order` domain model
   * is detail-shaped and does not expose list columns like total / channel name).
   */
  searchOrderDtos(searchOrderQuery: SearchOrderQuery): Observable<BaseResponse<OrderDTO[] | null>> {
    const path = this.#getSearchOrdersUrl(searchOrderQuery.partnerId);
    const params = this.#getOrderParams(searchOrderQuery);

    return this.#http.get<BaseResponse<Array<OrderDTO>>>(path, { params }).pipe(
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<OrderDTO[]>(error);
      }),
    );
  }

  searchOrders(searchOrderQuery: SearchOrderQuery): Observable<BaseResponse<Order[] | null>> {
    const path = this.#getSearchOrdersUrl(searchOrderQuery.partnerId);
    const params = this.#getOrderParams(searchOrderQuery);

    return this.#http.get<BaseResponse<Array<OrderDTO>>>(path, { params }).pipe(
      switchMap(result => {
        return of(this.#ordersAdapter.fromApi(result));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<Order[]>(error);
      }),
    );
  }

  searchOrderSummaries(searchOrderQuery: SearchOrderQuery): Observable<BaseResponse<ValidationOrderSummariesPage | null>> {
    const path = this.#getSearchOrdersUrl(searchOrderQuery.partnerId);
    const params = this.#appendOrderSearchFilters(new HttpParams(), searchOrderQuery).append('response_mode', 'summary');

    return this.#http.get<BaseResponse<OrderSummariesSearchResponseData>>(path, { observe: 'response', params }).pipe(
      map(response => this.#mapOrderSummariesResponse(response)),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<ValidationOrderSummariesPage>(error);
      }),
    );
  }

  #appendOrderInclusionFlags(params: HttpParams, flags: GetOrderFlags): HttpParams {
    params = params.append('include_notes', flags.includeNotes || false);
    params = params.append('include_reschedules', flags.includeReschedules || false);
    params = params.append('include_reservation_channel', flags.includeReservationChannel || false);
    params = params.append('include_order_items', flags.includeOrderItems || false);
    params = params.append('include_phone', flags.includePhoneNumber || false);
    params = params.append('include_payment_notes', flags.includePaymentNotes || false);
    params = params.append('include_cancellable_items', flags.includeCancellableItems || false);
    if (flags.includeUserCancellationRecords) {
      params = params.append('include_user_cancellation_records', true);
    }
    params = params.append('include_per_item_tax', flags.includePerItemTax || false);
    return params;
  }

  #appendOrderSearchFilters(params: HttpParams, searchOrderQuery: SearchOrderQuery): HttpParams {
    let next = params;
    if (searchOrderQuery.ticketId) {
      next = next.append('ticket_id', searchOrderQuery.ticketId);
    }
    if (searchOrderQuery.orderId) {
      next = next.append('order_id', searchOrderQuery.orderId);
    }
    if (searchOrderQuery.reservationId) {
      next = next.append('reservation_locator', searchOrderQuery.reservationId);
    }
    if (searchOrderQuery.code) {
      next = next.append('code', searchOrderQuery.code);
    }
    if (searchOrderQuery.email) {
      next = next.append('email', searchOrderQuery.email);
    }
    if (searchOrderQuery.phoneNumber) {
      next = next.append('phone_number', searchOrderQuery.phoneNumber);
    }
    if (searchOrderQuery.paymentCardNumberLast4Digits) {
      next = next.append('payment_card_number_last_4_digits', searchOrderQuery.paymentCardNumberLast4Digits);
    }
    if (searchOrderQuery.externalOrderId) {
      next = next.append('external_order_id', searchOrderQuery.externalOrderId);
    }
    if (searchOrderQuery.cartId) {
      next = next.append('cart_id', searchOrderQuery.cartId);
    }
    if (searchOrderQuery.hideFeverDiscount) {
      next = next.append('hide_fever_discount', searchOrderQuery.hideFeverDiscount);
    }
    if (searchOrderQuery.cityId !== undefined) {
      next = next.append('city_id', searchOrderQuery.cityId);
    }
    if (searchOrderQuery.planId !== undefined) {
      next = next.append('plan_id', searchOrderQuery.planId);
    }
    if (searchOrderQuery.venueId !== undefined) {
      next = next.append('place_id', searchOrderQuery.venueId);
    }
    if (searchOrderQuery.fullName) {
      next = next.append('full_name', searchOrderQuery.fullName);
    }
    if (searchOrderQuery.channelId) {
      next = next.append('channel_id', searchOrderQuery.channelId);
    }
    if (searchOrderQuery.ticketTypeSearch) {
      next = next.append('ticket_type_search', searchOrderQuery.ticketTypeSearch);
    }
    if (searchOrderQuery.purchaseDateFrom) {
      next = next.append('purchased_at_from', searchOrderQuery.purchaseDateFrom);
    }
    if (searchOrderQuery.purchaseDateTo) {
      next = next.append('purchased_at_to', searchOrderQuery.purchaseDateTo);
    }
    if (searchOrderQuery.sessionDateFrom) {
      next = next.append('session_date_from', searchOrderQuery.sessionDateFrom);
    }
    if (searchOrderQuery.sessionDateTo) {
      next = next.append('session_date_to', searchOrderQuery.sessionDateTo);
    }
    if (searchOrderQuery.cursor) {
      next = next.append('cursor', searchOrderQuery.cursor);
    }
    if (searchOrderQuery.itemsPerPage) {
      next = next.append('limit', searchOrderQuery.itemsPerPage);
    }
    return next;
  }

  #getOrderFlagsParams(flags: GetOrderFlags): HttpParams {
    let params = new HttpParams();
    if (flags.hideFeverDiscount) {
      params = params.append('hide_fever_discount', flags.hideFeverDiscount);
    }
    return this.#appendOrderInclusionFlags(params, flags);
  }

  #getOrderIncludesParams(includes?: GetOrderIncludes): HttpParams {
    let params = new HttpParams();
    if (!includes) {
      return params;
    }
    if (includes.includeNotes) {
      params = params.append('include_notes', true);
    }
    if (includes.includePhone) {
      params = params.append('include_phone', true);
    }
    if (includes.includeReschedules) {
      params = params.append('include_reschedules', true);
    }
    if (includes.includeReservationChannel) {
      params = params.append('include_reservation_channel', true);
    }
    if (includes.includeUserCancellationRecords) {
      params = params.append('include_user_cancellation_records', true);
    }
    return params;
  }

  #getOrderParams(searchOrderQuery: SearchOrderQuery): HttpParams {
    const params = this.#appendOrderSearchFilters(new HttpParams(), searchOrderQuery);
    return this.#appendOrderInclusionFlags(params, searchOrderQuery);
  }

  #getOrderUrl(partnerId: number, orderId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/orders/${orderId}/`;
  }

  #getScopedOrderUrl(orderId: number): string {
    return `${environment.apiBaseUrl}/3.0/orders/${orderId}/`;
  }

  #getSearchInvitationOrdersUrl(partnerId: number, invitationId: string): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/orders/invitations/${invitationId}/`;
  }

  #getSearchOrdersUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/orders/search/`;
  }

  #getUserOrderUrl(partnerId: number, userId: number, orderId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/users/${userId}/orders/${orderId}/`;
  }

  #mapOrderSummariesResponse(
    response: HttpResponse<BaseResponse<OrderSummariesSearchResponseData>>,
  ): BaseResponse<ValidationOrderSummariesPage> {
    const { orders: ordersPayload, totalCount: totalFromBody } = this.#normalizeOrderSummariesBody(response.body?.data);
    const adapted = this.#orderSummariesAdapter.fromApi(new BaseResponse(ordersPayload, response.body?.error ?? null));
    const hasMore = response.headers.get('X-Has-More') === 'true';
    const nextCursor = response.headers.get('X-Next-Cursor');
    const totalHeaderRaw = response.headers.get('X-Total-Count');
    const totalFromHeader = totalHeaderRaw != null && totalHeaderRaw !== '' ? Number.parseInt(totalHeaderRaw, 10) : Number.NaN;
    const totalCount = (Number.isFinite(totalFromHeader) ? totalFromHeader : totalFromBody) ?? adapted.data?.length ?? 0;

    return new BaseResponse<ValidationOrderSummariesPage>(
      adapted.data
        ? {
            hasMore,
            items: adapted.data,
            nextCursor,
            totalCount,
          }
        : null,
      adapted.error,
    );
  }

  #normalizeOrderSummariesBody(data: OrderSummariesSearchResponseData | null | undefined): {
    orders: Array<OrderSummaryDTO> | null;
    totalCount?: number;
  } {
    if (data == null) {
      return { orders: null };
    }
    if (Array.isArray(data)) {
      return { orders: data };
    }
    return { orders: data.orders ?? null, totalCount: data.total_count };
  }
}
