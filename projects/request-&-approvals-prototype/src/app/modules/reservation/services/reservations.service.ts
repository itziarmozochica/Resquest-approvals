import { HttpClient, HttpContext, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SendReservationPaymentLinkQuery } from '@fz-original/app/modules/reservation/models/reservation-payment-url.model';
import {
  CartAdjustmentPrice,
  CartAdjustmentPriceOperation,
  CartAdjustmentPriceWithOperation,
  CartAdjustmentPriceWithOperationData,
} from '@fz-original/app/shared/cart/models/cart-adjustment-price.model';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import {
  ReservationsClient,
  type NewReservation as DistributorNewReservation,
  type DistributorTarget,
  type ReservationEndCustomerUpdate,
  type ReservationExternalLocator,
  type ReservationPayment,
  type ReserveB2bEmployee,
  type ReservePayment,
  type ReservePaymentGateway,
  type ReservePaymentMethod,
} from '@fz/reservations';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { CartPreview } from '../../../shared/cart/models/cart-preview.model';
import { ExportTypeEnum } from '../../../shared/components/export-list-button/export-option.model';
import { SKIP_RETRY_INTERCEPTOR } from '../../../shared/interceptors/skip-retry.token';
import { BaseErrorResponse, BaseResponse, BaseResponseDTO } from '../../../shared/models/base-response';
import { LinkPaginationResponse } from '../../../shared/models/link-pagination-response';
import { User } from '../../../shared/models/user/user.model';
import { DistributorRouteService, scopedOrganizationHeader } from '../../../shared/services/distributor/distributor-route.service';
import {
  DISTRIBUTOR_PARTNER_NOT_SELECTED,
  DistributorTargetService,
} from '../../../shared/services/distributor/distributor-target.service';
import { OnBehalfScopeStore } from '../../../shared/services/distributor/on-behalf-scope.store';
import { OnBehalfTargetService } from '../../../shared/services/distributor/on-behalf-target.service';
import { ReservationContextService } from '../../../shared/services/distributor/reservation-context.service';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { UserService } from '../../../shared/services/user/user.service';
import { ErrorResponseUtils } from '../../../shared/utils/error-response.utils';
import { SessionItem, SessionItemData } from '../../sessions/session-item.model';
import { BusinessPaymentTypeEnum } from '../../settings/shared/models/business-payment-type.enum';
import { Business } from '../../settings/shared/models/business.model';
import { EXTERNAL_RESERVATION_ID_PERSIST_TIMEOUT_MS } from '../components/reservation-checkout-payment-selector/reservation-checkout-payment-selector.component';
import { ReservationsListAudience } from '../enums/reservations-list-audience.enum';
import { NewPaidReservation } from '../models/new-paid-reservation.model';
import { NewReservation } from '../models/new-reservation.model';
import { PaymentMethod } from '../models/payment-methods.enum';
import { ReservationFlowTypeEnum } from '../models/reservation_flow_type.enum';
import { UpdateReservationContactRequest, UpdateReservationContactRequestDTO } from '../models/reservation-contact-edit.model';
import { ReservationDetail } from '../models/reservation-detail.model';
import { ReservationDetailQuery } from '../models/reservation-detail.query';
import { ReservationPaymentResponse, ReservationPaymentResponseDTO } from '../models/reservation-payment-response.model';
import { ReservationsSummaryData } from '../models/reservation-summary.model';
import { Reservation } from '../models/reservation.model';
import { ReservationsSummaryQuery, ReservationsSummaryQueryDTO } from '../models/reservations-summary.query';
import { ProformaInvoiceRequest, ProformaInvoiceRequestDTO } from '../proforma-invoice/models/proforma-invoice-request.model';
import { getPartySummariesUrl, getReservationsListUrl } from '../utils/get-reservations-api-base-url.util';
import { ReservationDetailDTO } from './models/reservation-detail.dto';
import { NewPaidReservationAdapter, NewPaidReservationApiResponse } from './new-paid-reservation.adapter';
import { NewReservationAdapter } from './new-reservation.adapter';
import { ReservationDetailAdapter } from './reservation-detail.adapter';
import { ReservationsAdapter } from './reservations.adapter';
import { SetProductServingTimeQuery } from './set-product-serving-time-query';

@Injectable({
  providedIn: 'root',
})
export class ReservationsService {
  #distributorRoute = inject(DistributorRouteService);
  readonly #onBehalfTarget = inject(OnBehalfTargetService);
  #onBehalfScope = inject(OnBehalfScopeStore);
  #distributorTarget = inject(DistributorTargetService);
  #httpClient = inject(HttpClient);
  #reservationsClient = inject(ReservationsClient);
  #newPaidReservationAdapter = inject(NewPaidReservationAdapter);
  #newReservationAdapter = inject(NewReservationAdapter);
  #partnerService = inject(PartnerService);
  #reservationContext = inject(ReservationContextService);
  #reservationDetailAdapter = inject(ReservationDetailAdapter);
  #reservationsSummaryAdapter = inject(ReservationsAdapter);
  #translate = inject(TranslateService);
  #userService = inject(UserService);

  business: Business | null = this.getBusiness();
  maxReservationsToPrint = 100;
  maxReservationsInPartySummaries = 500;
  maxReservationsInRunsheet = 500;

  buyNowReservation(
    partnerId: number,
    cartId: string,
    b2bUser: User,
    paymentInfo: Record<string, unknown>,
    externalReservationId?: string | null,
  ): Observable<BaseResponse<NewPaidReservation | null>> {
    if (this.#distributorTarget.isDistributorSession() && this.#distributorTarget.target() === null) {
      return this.#noPartnerChosen<NewPaidReservation>();
    }

    const reservationChannelId = this.#reservationContext.reservationChannel();
    const throughDistributor = this.#distributorTarget.throughDistributor(target =>
      this.#reservationsClient.reserve(target.distributorId, cartId, {
        ...(reservationChannelId && { channelId: reservationChannelId }),
        payment: this.#toReservePayment(paymentInfo),
      }),
    );
    if (throughDistributor !== null) {
      return throughDistributor.pipe(
        map(reservation => this.#toPaidReservation(reservation)),
        switchMap(response => this.#persistExternalReservationIdAfterReserve(response, partnerId, externalReservationId)),
        catchError(error =>
          of(
            new BaseResponse<NewPaidReservation | null>(
              null,
              this.#toPaidReservationError(ErrorResponseUtils.getErrorResponseError(error), paymentInfo),
            ),
          ),
        ),
      );
    }

    const onBehalfTarget = this.#onBehalfScope.forCart(cartId);
    if (onBehalfTarget !== null) {
      const onBehalfChannelId = this.#onBehalfScope.channelForCart(cartId) ?? reservationChannelId;
      return this.#reservationsClient
        .reserve(onBehalfTarget.distributorId, cartId, {
          ...(onBehalfChannelId && { channelId: onBehalfChannelId }),
          ...this.#onBehalfEmployee(),
          payment: this.#toReservePayment(paymentInfo),
        })
        .pipe(
          map(reservation => {
            const paid = this.#toPaidReservation(reservation);
            if (paid.data?.id) {
              this.#onBehalfScope.rememberReservation(String(paid.data.id), onBehalfTarget);
            }
            return paid;
          }),
          switchMap(response => this.#persistExternalReservationIdAfterReserve(response, partnerId, externalReservationId)),
          catchError(error =>
            of(
              new BaseResponse<NewPaidReservation | null>(
                null,
                this.#toPaidReservationError(ErrorResponseUtils.getErrorResponseError(error), paymentInfo),
              ),
            ),
          ),
        );
    }

    const user = this.#userService.getUser();
    const b2bEmployee = this.#userService.hasPermission('can_reserve_cart_on_behalf_of_business') ? this.#userService.getUser() : null;

    const url = `${environment.apiBaseUrl}/partners/${partnerId}/users/${user?.id}/carts/${cartId}/reserve/`;
    const body: Record<string, unknown> = this.getB2BUserBody(b2bUser);
    if (this.getBusiness()) {
      body.channel_id = this.getBusiness()!.channel;
    }
    if (paymentInfo) {
      body.payment = paymentInfo;
    }
    if (b2bEmployee) {
      body.b2b_employee = this.getB2BEmployee(b2bEmployee);
    }

    return this.#httpClient.post(url, body).pipe(
      map((response: unknown) => this.#newPaidReservationAdapter.fromApi(response as NewPaidReservationApiResponse)),
      switchMap(response => this.#persistExternalReservationIdAfterReserve(response, partnerId, externalReservationId)),
      catchError(error =>
        ErrorResponseUtils.getErrorResponse<NewPaidReservation>(error).pipe(
          switchMap(errorResponse => {
            errorResponse.error.message = this.#translate.instant(errorResponse.error?.message);

            if (paymentInfo['payment_gateway'] == BusinessPaymentTypeEnum.STRIPE) {
              errorResponse.error.message = errorResponse.error.message + this.#translate.instant('errors.REFUND_MESSAGE');
              errorResponse.error.code = errorResponse.error.code + '-REFUND_MESSAGE';
            }

            return of(errorResponse);
          }),
        ),
      ),
    );
  }

  #persistExternalReservationIdAfterReserve(
    response: BaseResponse<NewPaidReservation | null>,
    partnerId: number,
    externalReservationId?: string | null,
  ): Observable<BaseResponse<NewPaidReservation | null>> {
    if (!externalReservationId || !response.data?.id) {
      return of(response);
    }
    const userId = this.#userService.getUserId() ?? 0;
    return this.setExternalReservationId(partnerId, userId, response.data.id, externalReservationId).pipe(
      timeout(EXTERNAL_RESERVATION_ID_PERSIST_TIMEOUT_MS),
      map(persistResponse => (persistResponse.error ? this.#markExternalReservationIdPersistFailed(response) : response)),
      catchError(error => {
        console.error('Failed to persist external reservation id after reserve', error);
        return of(this.#markExternalReservationIdPersistFailed(response));
      }),
    );
  }

  #markExternalReservationIdPersistFailed(response: BaseResponse<NewPaidReservation | null>): BaseResponse<NewPaidReservation | null> {
    if (!response.data) {
      return response;
    }
    return new BaseResponse<NewPaidReservation | null>({ ...response.data, externalReservationIdPersistFailed: true }, response.error);
  }

  cancelReservation(reservationId: string, distributorId?: number | null): Observable<BaseResponse<unknown>> {
    if (this.#distributorRoute.isBlocked()) {
      return this.#noPartnerChosen<unknown>();
    }

    const target = this.#reservationScope(reservationId, distributorId);
    const url =
      target !== null
        ? `${environment.apiBaseUrl}/3.0/reservations/${reservationId}/cancel/`
        : this.#userService.getReservationFlowType() === ReservationFlowTypeEnum.as_business
          ? this.getCancelUserReservationUrl(reservationId)
          : this.getCancelReservationUrl(reservationId);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});

    return this.#httpClient.post<unknown>(url, null, { headers, observe: 'response' }).pipe(
      switchMap((response: HttpResponse<unknown>) => {
        if (response.status === 200) {
          return of(new BaseResponse({}, null));
        }
        const body = response.body as { error?: { code: string } } | null;
        const error = body?.error ? { code: body.error.code, message: 'errors.generic' } : null;
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<unknown>(error);
      }),
    );
  }

  cancelUserReservation(reservationId: string): Observable<BaseResponse<unknown>> {
    const url = this.getCancelUserReservationUrl(reservationId);

    return this.#httpClient.post<unknown>(url, null, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<unknown>) => {
        if (response.status === 200) {
          return of(new BaseResponse({}, null));
        }
        const body = response.body as { error?: { code: string } } | null;
        const error = body?.error ? { code: body.error.code, message: 'errors.generic' } : null;
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<unknown>(error);
      }),
    );
  }

  createGuestReservation(
    partnerId: number,
    cartId: string,
    leadId: string,
    channelId: string,
    includeDeliveryNoteAttachment: boolean,
  ): Observable<BaseResponse<NewReservation | null>> {
    // Guest reserve (GAME-1201): the union payload carries `lead_id` and NEVER a `business`. The URL
    // user segment is the **coordinator's** id (the authenticated principal) — same as `createReservation`
    // — because `BasePartnerView` validates it against the token (a guest id there → 403). The guest is
    // the cart owner (`cart.user.id`, set by `prepare`) and is derived server-side from the cart + lead
    // (GAME-1190, `customer_user_id`). The coordinator also travels as a flat `b2b_user` (same 4-field
    // shape as `b2b_employee`); the channel is the one the conversion resolver picked for the lead. No
    // `expiration_reminders` (backend TTL) and no `b2b_employee` (backend derives the acting pair).
    const coordinator = this.#userService.getUser();
    const url = `${environment.apiBaseUrl}/partners/${partnerId}/users/${coordinator?.id}/carts/${cartId}/reserve/`;
    const body: Record<string, unknown> = {
      b2b_user: coordinator ? this.getB2BEmployee(coordinator) : null,
      channel_id: channelId,
      include_delivery_note_attachment: includeDeliveryNoteAttachment,
      lead_id: leadId,
    };

    return this.#httpClient.post(url, body).pipe(
      map(response => this.#newReservationAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<NewReservation>(error)),
    );
  }

  createReservation(
    partnerId: number,
    cartId: string,
    b2bUser: User,
    includeDeliveryNoteAttachment: boolean,
    externalReservationId?: string | null,
  ): Observable<BaseResponse<NewReservation | null>> {
    if (this.#distributorTarget.isDistributorSession() && this.#distributorTarget.target() === null) {
      return this.#noPartnerChosen<NewReservation>();
    }

    const reservationChannelId = this.#reservationContext.reservationChannel();
    // No `b2b_user` / `b2b_employee`: the scoped header addresses the organization, so the body asserts no identity.
    const throughDistributor = this.#distributorTarget.throughDistributor(target =>
      this.#reservationsClient.reserve(target.distributorId, cartId, {
        ...(reservationChannelId && { channelId: reservationChannelId }),
        expirationReminders: this.getExpirationReminders().map(reminder => ({ hoursLeft: reminder.hours_left })),
        ...(externalReservationId && { externalLocatorId: externalReservationId }),
        includeDeliveryNoteAttachment,
      }),
    );
    if (throughDistributor !== null) {
      return throughDistributor.pipe(
        map(reservation => new BaseResponse<NewReservation | null>(reservation, null)),
        catchError(error => ErrorResponseUtils.getErrorResponse<NewReservation>(error)),
      );
    }

    const onBehalfReserveTarget = this.#onBehalfScope.forCart(cartId);
    if (onBehalfReserveTarget !== null) {
      const onBehalfChannelId = this.#onBehalfScope.channelForCart(cartId) ?? reservationChannelId;
      return this.#reservationsClient
        .reserve(onBehalfReserveTarget.distributorId, cartId, {
          ...(onBehalfChannelId && { channelId: onBehalfChannelId }),
          ...this.#onBehalfEmployee(),
          expirationReminders: this.getExpirationReminders().map(reminder => ({ hoursLeft: reminder.hours_left })),
          ...(externalReservationId && { externalLocatorId: externalReservationId }),
          includeDeliveryNoteAttachment,
        })
        .pipe(
          map(reservation => {
            if (reservation?.id) {
              this.#onBehalfScope.rememberReservation(String(reservation.id), onBehalfReserveTarget);
            }
            return new BaseResponse<NewReservation | null>(reservation, null);
          }),
          catchError(error => ErrorResponseUtils.getErrorResponse<NewReservation>(error)),
        );
    }

    const user = this.#userService.getUser();
    const b2bEmployee = this.#userService.hasPermission('can_reserve_cart_on_behalf_of_business') ? this.#userService.getUser() : null;
    const url = `${environment.apiBaseUrl}/partners/${partnerId}/users/${user?.id}/carts/${cartId}/reserve/`;
    const body: Record<string, unknown> = this.getB2BUserBody(b2bUser);

    body.expiration_reminders = this.getExpirationReminders();
    if (this.getBusiness()) {
      body.channel_id = this.getBusiness()!.channel;
    }
    if (b2bEmployee) {
      body.b2b_employee = this.getB2BEmployee(b2bEmployee);
    }
    body.include_delivery_note_attachment = includeDeliveryNoteAttachment;
    if (externalReservationId) {
      body.external_locator_id = externalReservationId;
    }
    return this.#httpClient.post(url, body).pipe(
      map(response => this.#newReservationAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<NewReservation>(error)),
    );
  }

  /** `currency` is not in the distributor reserve schema, so the Stripe cancel compensation runs without it. */
  /**
   * A distributor session with no partner chosen cannot reserve for anyone, and this is a call that acts
   * rather than reads - so it answers an error instead of an empty envelope. `{ data: null, error: null }`
   * dead-ends every caller: `ReservationCheckoutPaymentMethodsService.confirm` branches on the data and
   * then on the error, matches neither, and leaves the user on the page with no navigation and no
   * message - after the payment intent has already been created.
   */
  #noPartnerChosen<T>(): Observable<BaseResponse<T>> {
    return of(new BaseResponse<T>(null, { code: DISTRIBUTOR_PARTNER_NOT_SELECTED, message: 'errors.generic' }));
  }

  #reservationTarget(): DistributorTarget | null {
    return this.#distributorRoute.pairTarget();
  }

  #onBehalfEmployee(): { b2bEmployee: ReserveB2bEmployee } | Record<string, never> {
    if (!this.#userService.hasPermission(Permissions.CAN_RESERVE_ON_BEHALF)) {
      return {};
    }
    const user = this.#userService.getUser();
    if (user?.email == null || user.name == null || user.username == null) {
      return {};
    }
    return { b2bEmployee: { email: user.email, id: user.id, name: user.name, username: user.username } };
  }

  isScopedToAnotherOrganization(reservationId: string): boolean {
    return this.#reservationScope(reservationId) !== null;
  }

  #reservationScope(reservationId: string, distributorId?: number | null): DistributorTarget | null {
    return (
      this.#distributorRoute.pairTarget() ?? this.#onBehalfScope.forReservation(reservationId) ?? this.#onBehalfTargetFrom(distributorId)
    );
  }

  #toExternalLocatorResponse(
    source: Observable<ReservationExternalLocator | null>,
  ): Observable<BaseResponse<{ externalReservationId: string | null }>> {
    return source.pipe(
      // A `null` answer means the envelope carried no data, which is not a cleared reference — see
      // `ReservationExternalLocator`. Answering `{ externalReservationId: null }` here would blank the input
      // and toast success on a response that never confirmed a stored value.
      map(result =>
        result === null
          ? new BaseResponse<{ externalReservationId: string | null }>(null, { code: 'UNKNOWN', message: 'errors.generic' })
          : new BaseResponse<{ externalReservationId: string | null }>({ externalReservationId: result.externalReservationId }, null),
      ),
      catchError(error =>
        of(new BaseResponse<{ externalReservationId: string | null }>(null, ErrorResponseUtils.getErrorResponseError(error))),
      ),
    );
  }

  #toReservePayment(paymentInfo: Record<string, unknown>): ReservePayment {
    return {
      paymentGateway: paymentInfo['payment_gateway'] as ReservePaymentGateway,
      ...(paymentInfo['payment_intent_id'] !== undefined && { paymentIntentId: paymentInfo['payment_intent_id'] as string }),
      ...(paymentInfo['payment_method'] !== undefined && { paymentMethod: paymentInfo['payment_method'] as ReservePaymentMethod }),
    };
  }

  #toPaidReservation(data: DistributorNewReservation | null): BaseResponse<NewPaidReservation | null> {
    // A reply without an order is not a purchase, so it answers no data - as the legacy adapter does.
    if (data === null || data.order === null) {
      return new BaseResponse<NewPaidReservation | null>(null, null);
    }
    return new BaseResponse<NewPaidReservation | null>(
      { expiresAt: data.expiresAt, id: data.id, locator: data.locator, order: data.order, orderIds: [...data.orderIds] },
      null,
    );
  }

  #toPaidReservationError(error: BaseErrorResponse, paymentInfo: Record<string, unknown>): BaseErrorResponse {
    const message: string = this.#translate.instant(error.message);
    if (paymentInfo['payment_gateway'] !== BusinessPaymentTypeEnum.STRIPE) {
      return { ...error, message };
    }
    return { ...error, code: `${error.code}-REFUND_MESSAGE`, message: message + this.#translate.instant('errors.REFUND_MESSAGE') };
  }

  exportPDFDeliveryNote(reservationId: string, language: string): Observable<Blob> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#reservationScope(reservationId);
    const url = this.exportPDFDeliveryNoteUrl(reservationId, target);
    const headers = new HttpHeaders({
      Accept: ExportTypeEnum.PDF,
      'Accept-Language': language,
      ...(target !== null ? scopedOrganizationHeader(target) : {}),
    });

    return this.#httpClient.get(url, { headers: headers, responseType: 'blob' }).pipe(map(result => result as Blob));
  }

  exportUserPDFDeliveryNote(reservationId: string, language: string): Observable<Blob> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#reservationScope(reservationId);
    const url = this.exportUserPDFDeliveryNoteUrl(reservationId, target);
    const headers = new HttpHeaders({
      Accept: ExportTypeEnum.PDF,
      'Accept-Language': language,
      ...(target !== null ? scopedOrganizationHeader(target) : {}),
    });

    return this.#httpClient.get(url, { headers: headers, responseType: 'blob' }).pipe(map(result => result as Blob));
  }

  exportPDFBulkPartySummaries(query: ReservationsSummaryQuery, language: string): Observable<Blob> {
    if (this.#distributorRoute.isBlocked()) {
      // Errors rather than completing empty: this one is joined with its twin, and an inner that
      // never emits would take the other file down with it without anything reaching the screen.
      return throwError(() => new Error('party summaries cannot be exported without a chosen organization'));
    }
    const url = getPartySummariesUrl(this.#partnerService.getPartner()?.id, query.audience);
    const headers = new HttpHeaders({ Accept: ExportTypeEnum.PDF, 'Accept-Language': language });
    const params = this.getReservationsParameters(query, false);
    return this.#httpClient.get(url, { headers, params, responseType: 'blob' }).pipe(map(result => result as Blob));
  }

  exportPDFRunsheet(query: ReservationsSummaryQuery, language: string): Observable<Blob> {
    const partnerId = this.#partnerService.getPartner()?.id;
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/reservations/runsheet/`;
    const headers = new HttpHeaders({ Accept: ExportTypeEnum.PDF, 'Accept-Language': language });
    const params = this.getReservationsParameters(query, false);
    return this.#httpClient.get(url, { headers, params, responseType: 'blob' }).pipe(map(result => result as Blob));
  }

  exportPDFPartySummary(reservationId: string, language: string, timezone?: string): Observable<Blob> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#reservationScope(reservationId);
    const url = this.exportPDFPartySummaryUrl(reservationId, target);
    const headers = new HttpHeaders({
      Accept: ExportTypeEnum.PDF,
      'Accept-Language': language,
      ...(target !== null ? scopedOrganizationHeader(target) : {}),
    });
    const params = timezone ? new HttpParams().set('timezone', timezone) : undefined;

    return this.#httpClient.get(url, { headers: headers, params: params, responseType: 'blob' }).pipe(map(result => result as Blob));
  }

  exportPDFProformaInvoice(reservationId: string, request: ProformaInvoiceRequest, language: string): Observable<Blob> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const partnerId = this.#partnerService.getPartner()?.id;
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/reservations/${reservationId}/proforma-invoice/`;
    const headers = new HttpHeaders({ Accept: ExportTypeEnum.PDF, 'Accept-Language': language });
    const { recipient } = request;
    const body: ProformaInvoiceRequestDTO = {
      payment_notes: request.paymentNotes,
      recipient: {
        address: recipient.address,
        billing_name: recipient.billingName,
        country: recipient.country,
        email: recipient.email,
        name: recipient.name,
        postal_code: recipient.postalCode,
        region: recipient.region,
        tax_id: recipient.taxId,
      },
    };
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);

    return this.#httpClient.post(url, body, { context, headers, responseType: 'blob' });
  }

  exportUserPDFPartySummary(reservationId: string, language: string, timezone?: string): Observable<Blob> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#reservationScope(reservationId);
    const url = this.exportUserPDFPartySummaryUrl(reservationId, target);
    const headers = new HttpHeaders({
      Accept: ExportTypeEnum.PDF,
      'Accept-Language': language,
      ...(target !== null ? scopedOrganizationHeader(target) : {}),
    });
    const params = timezone ? new HttpParams().set('timezone', timezone) : undefined;

    return this.#httpClient.get(url, { headers: headers, params: params, responseType: 'blob' }).pipe(map(result => result as Blob));
  }

  getReservation(parameters: ReservationDetailQuery): Observable<BaseResponse<ReservationDetail>> {
    const { partnerId, reservationId, userId } = parameters;
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }

    // Same endpoint as the client's, read here: its `Reservation` is not this adapter's `ReservationDetail`.
    const target = this.#reservationScope(reservationId);
    const path =
      target !== null
        ? `${environment.apiBaseUrl}/3.0/reservations/${reservationId}/`
        : userId
          ? `${environment.apiBaseUrl}/partners/${partnerId}/users/${userId}/reservations/${reservationId}/`
          : `${environment.apiBaseUrl}/partners/${partnerId}/reservations/${reservationId}/`;
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});

    return this.#httpClient.get<BaseResponse<ReservationDetailDTO>>(path, { headers }).pipe(
      map(result => {
        if (!result) {
          return new BaseResponse<ReservationDetail>(null, null);
        }
        return this.#reservationDetailAdapter.fromApi(result);
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getReservations(
    parameters: ReservationsSummaryQuery,
    fileType: ExportTypeEnum = ExportTypeEnum.JSON,
  ): Observable<LinkPaginationResponse<Reservation[] | null> | Blob> {
    const path = this.getReservationsUrl(parameters.audience);
    const headers = new HttpHeaders({ Accept: fileType });
    const isJsonResponse = fileType === ExportTypeEnum.JSON;
    const query = parameters.audience === ReservationsListAudience.MARKETPLACE ? { ...parameters, includeCount: undefined } : parameters;
    const keepsTimezone = isJsonResponse || query.audience === ReservationsListAudience.MARKETPLACE;
    const params = this.getReservationsParameters(keepsTimezone ? query : { ...query, timezone: undefined }, isJsonResponse);
    return isJsonResponse ? this.jsonRequest(path, params, headers) : this.exportRequest(path, params, headers);
  }

  getUserReservations(
    parameters: ReservationsSummaryQuery,
    fileType: ExportTypeEnum = ExportTypeEnum.JSON,
  ): Observable<LinkPaginationResponse<Reservation[] | null> | Blob> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }

    const target = this.#reservationTarget();
    const path = this.getUserReservationsUrl(target);
    const headers = new HttpHeaders({
      Accept: fileType,
      ...(target !== null ? scopedOrganizationHeader(target) : {}),
    });

    const isJsonResponse = fileType === ExportTypeEnum.JSON;
    const query = target !== null ? { ...parameters, partnerId: parameters.partnerId ?? target.targetOrganizationId } : parameters;
    const params = this.getReservationsParameters(isJsonResponse ? query : { ...query, timezone: undefined }, isJsonResponse);

    return isJsonResponse ? this.jsonRequest(path, params, headers) : this.exportRequest(path, params, headers);
  }

  increaseReservationItems(
    reservationId: string,
    sessionItems: SessionItem[],
    adjustment?: CartAdjustmentPrice | null,
  ): Observable<BaseResponse<Record<string, never> | null>> {
    const url = this.getIncreaseReservationItemsUrl(reservationId);

    const body: CartPreview = {
      session_items: sessionItems.map(sessionItem => this.getSessionItemBody(sessionItem)),
      ...(adjustment && { adjustment: this.getAdjustmentBody(adjustment) }),
    };

    return this.#httpClient.post<never>(url, body, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<BaseResponse<never>>) => {
        if (response.status === 204) {
          return of(new BaseResponse({}, null));
        }
        if (!response.body) {
          return of(new BaseResponse(null, { code: 'UNKNOWN', message: 'errors.generic' }));
        }
        const body = response.body;
        let error = null;
        if (body.error) {
          error = { code: body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<never>(error);
      }),
    );
  }

  increaseUserReservationItems(reservationId: string, sessionItems: SessionItem[]): Observable<BaseResponse<Record<string, never> | null>> {
    const url = this.getIncreaseUserReservationItemsUrl(reservationId);
    const body: CartPreview = {
      session_items: sessionItems.map(sessionItem => this.getSessionItemBody(sessionItem)),
    };

    return this.#httpClient.post<never>(url, body, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<BaseResponse<never>>) => {
        if (response.status === 204) {
          return of(new BaseResponse({}, null));
        }
        if (!response.body) {
          return of(new BaseResponse(null, { code: 'UNKNOWN', message: 'errors.generic' }));
        }
        const body = response.body;
        let error = null;
        if (body.error) {
          error = { code: body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<never>(error);
      }),
    );
  }

  payFreeReservation(
    partnerId: number,
    userId: number,
    reservationId: string,
  ): Observable<BaseResponse<ReservationPaymentResponse | null>> {
    return this.payReservation(partnerId, userId, reservationId, { paymentGateway: 'free' });
  }

  payReservationWithBalance(partnerId: number, reservationId: string): Observable<BaseResponse<ReservationPaymentResponse | null>> {
    return this.payReservation(partnerId, this.#userService.getUser()!.id, reservationId, {
      paymentGateway: 'fever',
      paymentMethod: PaymentMethod.BALANCE,
    });
  }

  payReservationWithInvoicing(
    partnerId: number,
    userId: number,
    reservationId: string,
  ): Observable<BaseResponse<ReservationPaymentResponse | null>> {
    return this.payReservation(partnerId, userId, reservationId, { paymentGateway: 'fever', paymentMethod: 'invoicing' });
  }

  payReservationWithStripe(
    partnerId: number,
    userId: number,
    reservationId: string,
    paymentIntentId: string,
  ): Observable<BaseResponse<ReservationPaymentResponse | null>> {
    return this.payReservation(partnerId, userId, reservationId, { paymentGateway: 'stripe', paymentIntentId });
  }

  reduceReservationItems(
    reservationId: string,
    sessionItems: SessionItem[],
    adjustment?: CartAdjustmentPrice | null,
  ): Observable<BaseResponse<Record<string, never> | null>> {
    const url = this.getReduceReservationItemsUrl(reservationId);
    const body: CartPreview = {
      session_items: sessionItems.map(sessionItem => this.getSessionItemBody(sessionItem)),
      ...(adjustment && { adjustment: this.getAdjustmentBody(adjustment) }),
    };

    return this.#httpClient.post<never>(url, body, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<BaseResponse<never>>) => {
        if (response.status === 204) {
          return of(new BaseResponse({}, null));
        }
        if (!response.body) {
          return of(new BaseResponse(null, { code: 'UNKNOWN', message: 'errors.generic' }));
        }
        const body = response.body;
        let error = null;
        if (body.error) {
          error = { code: body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<never>(error);
      }),
    );
  }

  reduceUserReservationItems(reservationId: string, sessionItems: SessionItem[]): Observable<BaseResponse<Record<string, never> | null>> {
    const url = this.getReduceUserReservationItemsUrl(reservationId);
    const body: Record<string, SessionItemData[]> = {
      session_items: sessionItems.map(sessionItem => this.getSessionItemBody(sessionItem)),
    };

    return this.#httpClient.post<never>(url, body, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<BaseResponse<never>>) => {
        if (response.status === 204) {
          return of(new BaseResponse({}, null));
        }
        if (!response.body) {
          return of(new BaseResponse(null, { code: 'UNKNOWN', message: 'errors.generic' }));
        }
        const body = response.body;
        let error = null;
        if (body.error) {
          error = { code: body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<never>(error);
      }),
    );
  }

  refundDeposit(partnerId: number, reservationId: string): Observable<BaseResponse<null>> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/reservations/${reservationId}/deposits/refund/`;

    return this.#httpClient.post<BaseResponse<null>>(url, null, { observe: 'response' }).pipe(
      map((response: HttpResponse<BaseResponse<null>>) => {
        const body = response.body;
        if (body?.error) {
          return new BaseResponse(null, body.error);
        }

        if (response.status === 204 || response.status === 200) {
          return new BaseResponse(null, null);
        }

        return new BaseResponse(null, null);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<null>(error)),
    );
  }

  skipDeposit(partnerId: number, reservationId: string): Observable<BaseResponse<null>> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/reservations/${reservationId}/deposits/skip/`;

    return this.#httpClient.post<BaseResponse<null>>(url, null, { observe: 'response' }).pipe(
      map((response: HttpResponse<BaseResponse<null>>) => {
        const body = response.body;
        if (body?.error) {
          return new BaseResponse(null, body.error);
        }

        return new BaseResponse(null, null);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<null>(error)),
    );
  }

  rescheduleReservation(reservationId: string, sessionItems: SessionItem[]): Observable<BaseResponse<NewReservation | null>> {
    const url = this.getRescheduleReservationUrl(reservationId);
    const body: Record<string, unknown> = {
      session_items: sessionItems.map(sessionItem => this.getSessionItemBody(sessionItem)),
    };

    const b2bEmployee = this.#userService.hasPermission('can_reserve_cart_on_behalf_of_business') ? this.#userService.getUser() : null;
    if (b2bEmployee) {
      body.b2b_employee = this.getB2BEmployee(b2bEmployee);
    }
    return this.#httpClient.post(url, body).pipe(
      map(response => this.#newReservationAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<NewReservation>(error)),
    );
  }

  rescheduleUserReservation(reservationId: string, sessionItems: SessionItem[]): Observable<BaseResponse<NewReservation | null>> {
    const url = this.getRescheduleUserReservationUrl(reservationId);
    const body: Record<string, SessionItemData[]> = {
      session_items: sessionItems.map(sessionItem => this.getSessionItemBody(sessionItem)),
    };

    return this.#httpClient.post(url, body).pipe(
      map(response => this.#newReservationAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<NewReservation>(error)),
    );
  }

  resetBusiness(): void {
    this.business = this.#userService.isBusiness() ? (this.#userService.getUser()?.business ?? null) : null;
  }

  sendReservationPaymentLinkEmail({
    applicationId,
    language,
    partnerId,
    paymentOption,
    placeId,
    planId,
    reservationId,
    userId,
  }: SendReservationPaymentLinkQuery): Observable<void> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }

    const target = this.#reservationScope(reservationId);
    const body: Record<string, string> = {
      application_id: applicationId,
    };
    if (paymentOption) {
      body.payment_option = paymentOption;
    }
    if (language) {
      body.language = language;
    }

    if (target !== null) {
      const url = `${environment.apiBaseUrl}/3.0/reservations/${reservationId}/send-payment-email/`;
      const headers = new HttpHeaders(scopedOrganizationHeader(target));
      return this.#httpClient
        .post<void>(url, body, { headers })
        .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
    }

    let url: string;
    if (this.#userService.hasPermission(Permissions.CAN_RESERVE_ON_BEHALF)) {
      url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/places/${placeId}/reservations/${reservationId}/send-payment-email`;
    } else {
      url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/places/${placeId}/users/${userId}/reservations/${reservationId}/send-payment-email`;
    }

    return this.#httpClient
      .post<void>(url, body)
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  setArrivedStatus(reservationId: string): Observable<BaseResponse<unknown>> {
    const url = this.getArrivedUrl(reservationId);
    return this.#httpClient.post(url, null, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<unknown>) => {
        if (response.status === 204) {
          return of(new BaseResponse({}, null));
        }
        const body = response.body as { error?: { code: string } } | null;
        const error = body?.error ? { code: body.error.code, message: 'errors.generic' } : null;
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<unknown>(error);
      }),
    );
  }

  setBusiness(business: Business): void {
    this.business = business;
  }

  setExternalReservationId(
    partnerId: number,
    userId: number,
    reservationId: string,
    value: string,
  ): Observable<BaseResponse<{ externalReservationId: string | null }>> {
    if (this.#distributorRoute.isBlocked()) {
      return this.#noPartnerChosen<{ externalReservationId: string | null }>();
    }

    const throughDistributor = this.#distributorTarget.throughDistributor(target =>
      this.#reservationsClient.setExternalReservationId(target.distributorId, reservationId, value),
    );
    if (throughDistributor !== null) {
      return this.#toExternalLocatorResponse(throughDistributor);
    }

    const onBehalfTarget = this.#onBehalfScope.forReservation(reservationId);
    if (onBehalfTarget !== null) {
      return this.#toExternalLocatorResponse(
        this.#reservationsClient.setExternalReservationId(onBehalfTarget.distributorId, reservationId, value),
      );
    }

    const url = this.#userService.hasPermission(Permissions.CAN_RESERVE_ON_BEHALF)
      ? `${environment.apiBaseUrl}/3.0/partners/${partnerId}/reservations/${reservationId}/external-locator/`
      : `${environment.apiBaseUrl}/partners/${partnerId}/users/${userId}/reservations/${reservationId}/external-locator/`;

    return this.#httpClient.patch<BaseResponse<{ external_locator_id: string | null }>>(url, { external_locator_id: value }).pipe(
      map(
        response =>
          new BaseResponse<{ externalReservationId: string | null }>(
            { externalReservationId: response?.data?.external_locator_id ?? null },
            response?.error ?? null,
          ),
      ),
      catchError(error =>
        of(new BaseResponse<{ externalReservationId: string | null }>(null, ErrorResponseUtils.getErrorResponseError(error))),
      ),
    );
  }

  setProductServingTime(query: SetProductServingTimeQuery): Observable<BaseResponse<{ servingAt: string | null; sessionId: number }>> {
    if (this.#distributorRoute.isBlocked()) {
      return this.#noPartnerChosen<{ servingAt: string | null; sessionId: number }>();
    }

    const url = this.#getSetProductServingTimeUrl(query);

    return this.#httpClient.put<BaseResponse<{ serving_at: string | null; session_id: number }>>(url, { serving_at: query.servingAt }).pipe(
      map(
        response =>
          new BaseResponse<{ servingAt: string | null; sessionId: number }>(
            { servingAt: response?.data?.serving_at ?? null, sessionId: response?.data?.session_id ?? query.sessionId },
            response?.error ?? null,
          ),
      ),
      catchError(error =>
        of(new BaseResponse<{ servingAt: string | null; sessionId: number }>(null, ErrorResponseUtils.getErrorResponseError(error))),
      ),
    );
  }

  #getSetProductServingTimeUrl(query: SetProductServingTimeQuery): string {
    const scope = query.userId != null ? `partners/${query.partnerId}/users/${query.userId}` : `partners/${query.partnerId}`;
    return `${environment.apiBaseUrl}/3.0/${scope}/reservations/${query.reservationId}/products/${query.sessionId}/serving-time/`;
  }

  updateReservationContact(
    reservationId: string,
    contact: UpdateReservationContactRequest,
    distributorId?: number | null,
  ): Observable<BaseResponse<ReservationDetail>> {
    if (this.#distributorRoute.isBlocked()) {
      return this.#noPartnerChosen<ReservationDetail>();
    }

    const target = this.#reservationScope(reservationId, distributorId);
    const url = this.#getUpdateReservationContactUrl(reservationId, target);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});

    return this.#httpClient.patch<BaseResponse<ReservationDetailDTO>>(url, this.#toUpdateReservationContactDTO(contact), { headers }).pipe(
      map(result => {
        if (!result) {
          return new BaseResponse<ReservationDetail>(null, null);
        }
        return this.#reservationDetailAdapter.fromApi(result);
      }),
      catchError(error => of(new BaseResponse<ReservationDetail>(null, ErrorResponseUtils.getErrorResponseError(error)))),
    );
  }

  updateReservationEndCustomer(reservationId: string, endCustomer: ReservationEndCustomerUpdate): Observable<BaseResponse<null>> {
    if (this.#distributorRoute.isBlocked()) {
      return this.#noPartnerChosen<null>();
    }

    const update =
      this.#distributorTarget.throughDistributor(target =>
        this.#reservationsClient.updateEndCustomer(target.distributorId, reservationId, endCustomer),
      ) ?? this.#updateOwnReservationEndCustomer(reservationId, endCustomer);
    if (update === null) {
      return this.#noPartnerChosen<null>();
    }

    return update.pipe(
      map(() => new BaseResponse<null>(null, null)),
      catchError(error => of(new BaseResponse<null>(null, ErrorResponseUtils.getErrorResponseError(error)))),
    );
  }

  #updateOwnReservationEndCustomer(reservationId: string, endCustomer: ReservationEndCustomerUpdate): Observable<unknown> | null {
    const organizationId = this.#sellingOrganizationId();
    return organizationId === null ? null : this.#reservationsClient.updateEndCustomer(organizationId, reservationId, endCustomer);
  }

  #getUpdateReservationContactUrl(reservationId: string, target: DistributorTarget | null): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/reservations/${reservationId}/contact/`;
    }
    const partnerId = this.#partnerService.getPartner()?.id;
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/reservations/${reservationId}/contact/`;
  }

  #onBehalfTargetFrom(distributorId?: number | null): DistributorTarget | null {
    if (distributorId == null || this.#userService.isBusiness() || !this.#onBehalfTarget.actsOnBehalf()) {
      return null;
    }

    const actingPartnerId = this.#partnerService.getActingOrganizationId();

    return actingPartnerId === null || distributorId === actingPartnerId ? null : { distributorId, targetOrganizationId: actingPartnerId };
  }

  #sellingOrganizationId(): number | null {
    if (this.#userService.isBusiness()) {
      return this.#userService.getUser()?.business?.organizationId ?? null;
    }
    return this.#partnerService.getActingOrganizationId();
  }

  #toUpdateReservationContactDTO(contact: UpdateReservationContactRequest): UpdateReservationContactRequestDTO {
    const dto: UpdateReservationContactRequestDTO = {
      email: contact.email,
    };
    const firstName = contact.firstName.trim();
    const lastName = contact.lastName.trim();

    if (firstName) {
      dto.first_name = firstName;
    }

    if (lastName) {
      dto.last_name = lastName;
    }

    return dto;
  }

  private exportPDFDeliveryNoteUrl(reservationId: string, target: DistributorTarget | null): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/reservations/${reservationId}/delivery-note/`;
    }
    const partnerId = this.#partnerService.getPartner()?.id;
    return `${environment.apiBaseUrl}/partners/${partnerId}/reservations/${reservationId}/delivery-note/`;
  }

  private exportRequest(
    path: string,
    params: HttpParams,
    headers: HttpHeaders,
  ): Observable<Blob | LinkPaginationResponse<Reservation[] | null>> {
    return this.#httpClient.get(path, { headers: headers, params: params, responseType: 'blob' }).pipe(
      map(result => result as Blob),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<Reservation[]>(error)),
    );
  }

  private exportUserPDFDeliveryNoteUrl(reservationId: string, target: DistributorTarget | null): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/reservations/${reservationId}/delivery-note/`;
    }
    const partnerId = this.#partnerService.getPartner()?.id;
    const userId = this.#userService.getUserId();
    return `${environment.apiBaseUrl}/partners/${partnerId}/users/${userId}/reservations/${reservationId}/delivery-note/`;
  }

  private exportPDFPartySummaryUrl(reservationId: string, target: DistributorTarget | null): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/reservations/${reservationId}/party-summary/`;
    }
    const partnerId = this.#partnerService.getPartner()?.id;
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/reservations/${reservationId}/party-summary/`;
  }

  private exportUserPDFPartySummaryUrl(reservationId: string, target: DistributorTarget | null): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/reservations/${reservationId}/party-summary/`;
    }
    const partnerId = this.#partnerService.getPartner()?.id;
    const userId = this.#userService.getUserId();
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/users/${userId}/reservations/${reservationId}/party-summary/`;
  }

  private getAdjustmentBody(adjustment: CartAdjustmentPrice): CartAdjustmentPrice {
    if ((adjustment as CartAdjustmentPriceWithOperation).operation === CartAdjustmentPriceOperation.SUBTRACT) {
      return {
        amount: adjustment.amount ?? 0,
        calculation: adjustment.calculation,
        concept: adjustment.concept,
        operation: (adjustment as CartAdjustmentPriceWithOperationData)?.operation,
      };
    }

    return {
      amount: adjustment.amount ?? 0,
      calculation: adjustment.calculation,
      concept: adjustment.concept,
      operation: (adjustment as CartAdjustmentPriceWithOperationData)?.operation,
    };
  }

  private getArrivedUrl(reservationId: string): string {
    const partnerId = this.#partnerService.getPartner()?.id;
    return `${environment.apiBaseUrl}/partners/${partnerId}/reservations/${reservationId}/mark_attendance_as_arrived/`;
  }

  private getB2BEmployee(b2bEmployee: User): Record<string, unknown> {
    return {
      email: b2bEmployee.email,
      id: b2bEmployee.id,
      name: b2bEmployee.name,
      username: b2bEmployee.username,
    };
  }

  private getB2BUserBody(b2bUser: User): Record<string, unknown> {
    return {
      b2b_user: {
        business: {
          email: b2bUser.business?.email,
          id: b2bUser.business?.id,
          locale: b2bUser.language?.replace('_', '-'),
          name: b2bUser.business?.name,
          phone: b2bUser.business?.phone,
          type: b2bUser.business?.type,
        },
        email: b2bUser.email,
        id: b2bUser.id,
        name: b2bUser.business?.contactName,
        username: b2bUser.username,
      },
    };
  }

  private getBusiness(): Business | null {
    if (this.business) {
      return this.business;
    }
    const isBusiness = this.#userService.isBusiness();
    return isBusiness ? (this.#userService.getUser()?.business ?? null) : null;
  }

  private getCancelReservationUrl(reservationId: string): string {
    const partnerId = this.#partnerService.getPartner()?.id;
    return `${environment.apiBaseUrl}/partners/${partnerId}/reservations/${reservationId}/cancel/`;
  }

  private getCancelUserReservationUrl(reservationId: string): string {
    const partnerId = this.#partnerService.getPartner()?.id;
    const userId = this.#userService.getUserId();
    return `${environment.apiBaseUrl}/partners/${partnerId}/users/${userId}/reservations/${reservationId}/cancel/`;
  }

  private getExpirationReminders(): { hours_left: number }[] {
    return [{ hours_left: 24 }, { hours_left: 48 }];
  }

  private getIncreaseReservationItemsUrl(reservationId: string): string {
    const partnerId = this.#partnerService.getPartner()?.id;
    return `${environment.apiBaseUrl}/partners/${partnerId}/reservations/${reservationId}/increase_items/`;
  }

  private getIncreaseUserReservationItemsUrl(reservationId: string): string {
    const partnerId = this.#partnerService.getPartner()?.id;
    const userId = this.#userService.getUserId();
    return `${environment.apiBaseUrl}/partners/${partnerId}/users/${userId}/reservations/${reservationId}/increase_items/`;
  }

  private getReduceReservationItemsUrl(reservationId: string): string {
    const partnerId = this.#partnerService.getPartner()?.id;
    return `${environment.apiBaseUrl}/partners/${partnerId}/reservations/${reservationId}/cancel_items/`;
  }

  private getReduceUserReservationItemsUrl(reservationId: string): string {
    const partnerId = this.#partnerService.getPartner()?.id;
    const userId = this.#userService.getUserId();
    return `${environment.apiBaseUrl}/partners/${partnerId}/users/${userId}/reservations/${reservationId}/cancel_items/`;
  }

  private getRescheduleReservationUrl(reservationId: string): string {
    const partnerId = this.#partnerService.getPartner()?.id;
    return `${environment.apiBaseUrl}/partners/${partnerId}/reservations/${reservationId}/reschedule/`;
  }

  private getRescheduleUserReservationUrl(reservationId: string): string {
    const partnerId = this.#partnerService.getPartner()?.id;
    const userId = this.#userService.getUserId();
    return `${environment.apiBaseUrl}/partners/${partnerId}/users/${userId}/reservations/${reservationId}/reschedule/`;
  }

  private getReservationsParameters(parameters: ReservationsSummaryQuery, isJsonResponse: boolean): HttpParams {
    const queryDTO = this.getReservationsSummaryQueryDTO(parameters, isJsonResponse);
    return Object.entries(queryDTO)
      .filter(([, value]) => value !== undefined && value !== null)
      .reduce((httpParams: HttpParams, [key, value]) => httpParams.append(key, value), new HttpParams()) as unknown as HttpParams;
  }

  private getReservationsSummaryQueryDTO(query: ReservationsSummaryQuery, isJsonResponse: boolean): ReservationsSummaryQueryDTO {
    let queryDTO: ReservationsSummaryQueryDTO = {
      business_types: query.businessTypes,
      city_id: query.cityId,
      items_per_page: isJsonResponse ? query.itemsPerPage : this.maxReservationsToPrint,
      order_by: query.orderBy,
      order_id: query.orderId?.trim() || undefined,
      page: isJsonResponse ? query.page : undefined,
      partner_id: query.partnerId,
      place_id: query.placeId,
      plan_id: query.planId,
      reservation_locator: query.reservationLocator,
      reservation_status: query.status,
      search_term: query.search,
      starts_at_from: query.startsAtFrom && this.parseDate(query.startsAtFrom),
      starts_at_to: query.startsAtTo && this.parseDate(query.startsAtTo),
      timezone: query.timezone,
    };

    if (query.includeBookingAnswers !== undefined) {
      queryDTO = { ...queryDTO, include_booking_answers: query.includeBookingAnswers };
    }
    if (query.includeCount !== undefined) {
      queryDTO = { ...queryDTO, include_count: query.includeCount };
    }
    if (query.includeStaffNotes !== undefined) {
      queryDTO = { ...queryDTO, include_staff_notes: query.includeStaffNotes };
    }

    return queryDTO;
  }

  private getReservationsUrl(audience?: ReservationsSummaryQuery['audience']): string {
    return getReservationsListUrl(this.#partnerService.getPartner()?.id, audience);
  }

  private getSessionItemBody(sessionItem: SessionItem): SessionItemData {
    const body: SessionItemData = {
      session_id: sessionItem.sessionId,
      ticket_number: sessionItem.ticketNumber,
    };

    if (sessionItem.seats !== undefined) {
      body.seats = sessionItem.seats.map(seat => ({
        label: seat.seatLabel || seat.seatReference,
        reference: seat.seatReference,
      }));
    }

    return body;
  }

  private getUserReservationsUrl(target: DistributorTarget | null): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/reservations/`;
    }
    const partnerId = this.#partnerService.getPartner()?.id;
    const userId = this.#userService.getUserId();
    return `${environment.apiBaseUrl}/partners/${partnerId}/users/${userId}/reservations/`;
  }

  private jsonRequest(path: string, params: HttpParams, headers: HttpHeaders): Observable<LinkPaginationResponse<Reservation[] | null>> {
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);
    return this.#httpClient.get<BaseResponse<ReservationsSummaryData>>(path, { context, headers, observe: 'response', params }).pipe(
      switchMap((result: HttpResponse<BaseResponse<ReservationsSummaryData>>) => {
        return of(this.#reservationsSummaryAdapter.fromApi(result));
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<Reservation[]>(error)),
    );
  }

  private parseDate(date: Date): string {
    date.setMilliseconds(0);
    return date.toISOString().split('.000Z')[0];
  }

  private payReservation(
    partnerId: number,
    userId: number,
    reservationId: string,
    payment: ReservePayment,
  ): Observable<BaseResponse<ReservationPaymentResponse | null>> {
    const isManager = this.#userService.getReservationFlowType() === ReservationFlowTypeEnum.on_behalf;

    if (!isManager) {
      if (this.#distributorTarget.isDistributorSession() && this.#distributorTarget.target() === null) {
        return this.#noPartnerChosen<ReservationPaymentResponse>();
      }

      const throughDistributor = this.#distributorTarget.throughDistributor(target =>
        this.#reservationsClient.pay(target.distributorId, reservationId, payment),
      );
      if (throughDistributor !== null) {
        return this.#toPaymentEnvelope(throughDistributor);
      }
    }

    const onBehalfDistributorId = this.#onBehalfScope.forReservation(reservationId)?.distributorId ?? null;
    if (onBehalfDistributorId !== null) {
      return this.#toPaymentEnvelope(this.#reservationsClient.pay(onBehalfDistributorId, reservationId, payment));
    }

    const url = `${environment.apiBaseUrl}/partners/${partnerId}/users/${userId}/reservations/${reservationId}/pay/`;

    return this.#httpClient.post<BaseResponseDTO<ReservationPaymentResponseDTO>>(url, this.#toPayBody(payment)).pipe(
      map(response => {
        if (response.data) {
          return new BaseResponse(this.#mapPaymentResponse(response.data), null);
        }
        return new BaseResponse(null, response.error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<ReservationPaymentResponse>(error)),
    );
  }

  #toPayBody(payment: ReservePayment): Record<string, unknown> {
    return {
      payment_gateway: payment.paymentGateway,
      ...(payment.paymentIntentId !== undefined && { payment_intent_id: payment.paymentIntentId }),
      ...(payment.paymentMethod !== undefined && { payment_method: payment.paymentMethod }),
    };
  }

  #toPaymentEnvelope(source: Observable<ReservationPayment | null>): Observable<BaseResponse<ReservationPaymentResponse | null>> {
    return source.pipe(
      map(result =>
        result === null
          ? new BaseResponse<ReservationPaymentResponse | null>(null, { code: 'UNKNOWN', message: 'errors.generic' })
          : new BaseResponse<ReservationPaymentResponse | null>(this.#toPaymentResponse(result), null),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<ReservationPaymentResponse>(error)),
    );
  }

  #toPaymentResponse(payment: ReservationPayment | null): ReservationPaymentResponse | null {
    if (payment === null) {
      return null;
    }
    return { order: payment.order, orderIds: [...payment.orderIds] };
  }

  #mapPaymentResponse(data: ReservationPaymentResponseDTO): ReservationPaymentResponse {
    const orderId = data.order?.id;
    return {
      order: orderId != null ? { id: orderId } : data.order,
      orderIds: data.order_ids ?? (orderId != null ? [orderId] : []),
    };
  }
}
