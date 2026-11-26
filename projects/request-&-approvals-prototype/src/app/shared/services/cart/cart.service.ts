import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import type { DistributorTarget } from '@fz/reservations';
import { defer, EMPTY, Observable, of, throwError, timer } from 'rxjs';
import { catchError, map, retry, switchMap, tap } from 'rxjs/operators';

import packageJson from '../../../../../package.json';
import { environment } from '../../../../environments/environment';
import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import {
  CartAdjustmentPrice,
  CartAdjustmentPriceData,
  CartAdjustmentPriceWithOperationData,
} from '../../cart/models/cart-adjustment-price.model';
import { CUSTOM_HEADERS } from '../../interceptors/custom-headers';
import { SKIP_RETRY_INTERCEPTOR } from '../../interceptors/skip-retry.token';
import { BaseErrorResponse, BaseResponse, HttpErrorResponseWithBaseError } from '../../models/base-response';
import { CartSessionFiscalLines } from '../../models/cart/cart-session-fiscal-lines.model';
import { CartSessionItemLineRequestBody } from '../../models/cart/cart-session-item-line.model';
import {
  CartSession,
  CartSessionItemRequestBody,
  CreateCartRequestBody,
  UpdateCartRequestBody,
} from '../../models/cart/cart-session.model';
import { Cart, CartData } from '../../models/cart/cart.model';
import { Coupon } from '../../models/cart/coupon.model';
import { PrepareCartForCustomerData, PreparedCartWithBookingQuestions } from '../../models/cart/prepare-cart-for-customer-data.model';
import { PreparedCartBookingQuestionsStatus } from '../../models/cart/prepared-cart-booking-questions-status.enum';
import { Customer } from '../../models/customer/customer.model';
import { mapFiscalLinesFromApi } from '../../models/order/fiscal-line.model';
import { SessionPack, SessionPackDTO } from '../../models/session/session-pack.model';
import { User } from '../../models/user/user.model';
import { buildManualPriceRequestBodies, holdsManualPriceState } from '../../utils/cart-manual-price.util';
import { buildCartSessionItemLines, canUseCartSessionItemLines } from '../../utils/cart-session-item-line.util';
import { CartUtil } from '../../utils/cart.util';
import { isRetriableDiscardError, PARTNERS_DISCARD_RETRY_DELAY_MS, pickDiscardError } from '../../utils/discard-cart-retry.util';
import { ErrorResponseUtils, getHttpBaseErrorResponseError } from '../../utils/error-response.utils';
import { readCartData, readPreparedCartBookingQuestions } from '../../utils/prepare-cart-for-customer-data.util';
import { hasContactDetails } from '../customer/customer.service';
import { DistributorRouteService, distributorSegment, scopedOrganizationHeader } from '../distributor/distributor-route.service';
import { OnBehalfScopeStore } from '../distributor/on-behalf-scope.store';
import { OnBehalfTargetService } from '../distributor/on-behalf-target.service';
import { Channel } from '../session-availability/channel.enum';
import { Permissions } from '../user/permissions';
import { UserService } from '../user/user.service';
import { ApplyCouponToCartBusinessBodyParam } from './apply-coupon-to-cart-business-query';
import { ApplyCouponToCartBodyParam } from './apply-coupon-to-cart-query';
import { CartAdapter } from './cart.adapter';
import { CouponAdapter } from './coupon.adapter';
import { CreateCartQuery } from './create-cart-query';
import { DiscardCartQuery, DiscardCartRoute } from './discard-cart-query';
import { DiscardCartAdapter } from './discard-cart.adapter';
import {
  PrepareCarBody,
  PrepareCartBodyV2,
  PrepareCartCustomerBody,
  PrepareCartForCustomerBody,
  PrepareCartForCustomerQuery,
  PrepareCartQuery,
  PrepareCartQueryV2,
  UserPrepareCarBody,
} from './prepare-cart-query';
import { RemovePlanFromCartQuery } from './remove-plan-from-cart-query';
import { UpdateCartQuery } from './update-cart-query';

const CUSTOMER_CREATION_ERROR_CODE = '933';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  readonly #distributorRoute = inject(DistributorRouteService);
  readonly #onBehalfTarget = inject(OnBehalfTargetService);
  readonly #onBehalfScope = inject(OnBehalfScopeStore);
  readonly #datadogLogService = inject(DatadogLogService);

  constructor(
    private httpClient: HttpClient,
    private cartAdapter: CartAdapter,
    private couponAdapter: CouponAdapter,
    private discardCartAdapter: DiscardCartAdapter,
    private userService: UserService,
    private authenticationService: AuthenticationService,
  ) {}

  addGiftCardCombination(query: {
    partnerId: number;
    cartId: string;
    couponCodes: string[];
    userId: number;
  }): Observable<BaseResponse<Cart | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const url = this.addGiftCardCombinationUrl(query.partnerId, query.cartId);
    const body = { coupon_codes: query.couponCodes, user_id: query.userId };
    return this.httpClient.post<BaseResponse<CartData>>(url, body).pipe(
      map((result: BaseResponse<CartData>) => this.cartAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Cart>(error)),
    );
  }

  removeGiftCardCombination(query: {
    partnerId: number;
    cartId: string;
    couponCodes: string[];
    userId: number;
  }): Observable<BaseResponse<Cart | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const url = this.removeGiftCardCombinationUrl(query.partnerId, query.cartId);
    const body = { coupon_codes: query.couponCodes, user_id: query.userId };
    return this.httpClient.post<BaseResponse<CartData>>(url, body).pipe(
      map((result: BaseResponse<CartData>) => this.cartAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Cart>(error)),
    );
  }

  applyCouponToCart(
    query: ApplyCouponToCartBodyParam,
    continueWithErrorAsObservable: boolean = true,
  ): Observable<BaseResponse<Cart | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#cartScope(query.cartId);
    const url: string = this.applyCouponToCartUrl(query.partnerId, query.cartId, target);
    const body = { coupon_code: query.couponCode, ...(target === null && { user_id: query.userId }) };
    const request$: Observable<BaseResponse<Cart>> = this.httpClient
      .post<BaseResponse<CartData>>(url, body, { headers: new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {}) })
      .pipe(map((result: BaseResponse<CartData>) => this.cartAdapter.fromApi(result)));
    if (continueWithErrorAsObservable) {
      return request$.pipe(catchError(error => ErrorResponseUtils.getErrorResponse<Cart>(error)));
    } else {
      return request$.pipe(
        catchError((error: HttpErrorResponseWithBaseError) => {
          throw getHttpBaseErrorResponseError(error);
        }),
      );
    }
  }

  applyCouponToCartBusiness(
    query: ApplyCouponToCartBusinessBodyParam,
    continueWithErrorAsObservable: boolean = true,
  ): Observable<BaseResponse<Cart | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#distributorRoute.pairTarget();
    const url: string = this.applyCouponToCartBusinessUrl(query.partnerId, query.userId, query.cartId, target);
    const body = { coupon_code: query.couponCode };
    const request$: Observable<BaseResponse<Cart>> = this.httpClient
      .post<BaseResponse<CartData>>(url, body, { headers: new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {}) })
      .pipe(map((result: BaseResponse<CartData>) => this.cartAdapter.fromApi(result)));
    if (continueWithErrorAsObservable) {
      return request$.pipe(catchError(error => ErrorResponseUtils.getErrorResponse<Cart>(error)));
    } else {
      return request$.pipe(
        catchError((error: HttpErrorResponseWithBaseError) => {
          throw getHttpBaseErrorResponseError(error);
        }),
      );
    }
  }

  createCart(query: CreateCartQuery): Observable<BaseResponse<Cart | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#cartTarget();
    const path: string = this.getCreateCartUrl(query.partnerId, target);
    const body: CreateCartRequestBody = this.getCreateCartBody(query, target);
    const localeHeader: Record<string, string> =
      query.locale !== undefined && query.locale.length > 0 ? { 'Accept-Language': query.locale } : {};
    const headers = new HttpHeaders({ ...localeHeader, ...(target !== null ? scopedOrganizationHeader(target) : {}) });

    const seatLabelsBySessionId = this.#buildSeatLabelsMap(body.session_items ?? []);
    const seatDisplayLabelsBySessionId = this.#buildSeatDisplayLabelsMap(query.sessionItemsByDatetime);

    return this.httpClient.post<BaseResponse<CartData>>(path, body, { headers }).pipe(
      tap({ subscribe: () => this.#logCreateCartComposition(query, body) }),
      map((result: BaseResponse<CartData>) => {
        const mappedResult = this.cartAdapter.fromApi(result, this.#allSessions(query.sessionItemsByDatetime));
        this.#preserveSeatInfoInCart(mappedResult, seatLabelsBySessionId, seatDisplayLabelsBySessionId);
        if (target !== null && mappedResult.data?.id) {
          this.#onBehalfScope.rememberCart(String(mappedResult.data.id), target, query.channelId ?? query.channel ?? null);
        }
        return mappedResult;
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<Cart>(error)),
    );
  }

  discardCart(query: DiscardCartQuery): Observable<BaseResponse<boolean | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#cartScope(query.cartId);
    const viaPartners = this.#discardsViaPartners(query, target);
    const path = this.#discardCartUrl(query, target, viaPartners);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    const request$ = viaPartners ? this.#postPartnersDiscard(path, headers) : this.httpClient.post(path, null, { headers });
    return request$.pipe(
      map(result => this.discardCartAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse<boolean>(error)),
    );
  }

  discardCartRoute(query: DiscardCartQuery): DiscardCartRoute {
    return this.#discardsViaPartners(query, this.#cartScope(query.cartId)) ? 'partners' : 'fever2';
  }

  discardCartKeepalive(query: DiscardCartQuery): void {
    if (typeof globalThis.fetch !== 'function') {
      return;
    }
    if (this.#distributorRoute.isBlocked()) {
      return;
    }
    const target = this.#cartScope(query.cartId);
    const viaPartners = this.#discardsViaPartners(query, target);
    const path = this.#discardCartUrl(query, target, viaPartners);
    const headers: Record<string, string> = target !== null ? scopedOrganizationHeader(target) : {};
    if (this.authenticationService.hasApiKey()) {
      headers['x-api-key'] = this.authenticationService.getApiKey() ?? '';
    } else if (this.authenticationService.isLoggedIn()) {
      headers['Authorization'] = `B2bToken ${this.authenticationService.getToken()}`;
    }
    if (viaPartners) {
      headers[CUSTOM_HEADERS.clientVersion] = `w.${packageJson.version}`;
      headers[CUSTOM_HEADERS.applicationId] = environment.feverzoneApplicationId;
    }
    void globalThis.fetch(path, {
      headers,
      keepalive: true,
      method: 'POST',
    });
  }

  /** `heldSessions`: the lines of the cart the response replaces, whose unconfirmed manual prices survive the repaint. */
  getCart(partnerId: number, cartId: string, heldSessions: readonly CartSession[] = []): Observable<BaseResponse<Cart | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#distributorRoute.pairTarget();
    const path = this.getCartUrl(partnerId, cartId, target);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    return this.httpClient.get<BaseResponse<CartData>>(path, { headers }).pipe(
      map((result: BaseResponse<CartData>) => this.cartAdapter.fromApi(result, heldSessions)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Cart>(error)),
    );
  }

  getCartFiscalLines(partnerId: number, cartId: string): Observable<CartSessionFiscalLines[]> {
    return this.httpClient.get<BaseResponse<CartData>>(`${this.getCartUrl(partnerId, cartId, null)}?include_fiscal_lines=true`).pipe(
      map((result: BaseResponse<CartData>) =>
        (result.data?.session_items ?? []).map(sessionItem => ({
          fiscalLines: mapFiscalLinesFromApi(sessionItem.fiscal_lines),
          isPack: sessionItem.is_pack,
          sessionId: sessionItem.id,
          total: ((sessionItem.unit_price?.amount ?? 0) + (sessionItem.surcharge_per_ticket?.amount ?? 0)) * sessionItem.units,
        })),
      ),
    );
  }

  getCouponForCart(
    {
      cartId,
      couponCode,
      lazyCouponType,
      partnerId,
    }: {
      cartId: Cart['id'];
      couponCode: string;
      lazyCouponType: string | null;
      partnerId: number;
    },
    continueWithErrorAsObservable: boolean = true,
  ): Observable<BaseResponse<Coupon | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const url: string = this.getCouponForCartUrl(partnerId, cartId!, couponCode, lazyCouponType);
    const request$ = this.httpClient
      .get<BaseResponse<Coupon>>(url)
      .pipe(map((result: BaseResponse<Coupon>) => this.couponAdapter.fromApi(result)));
    if (continueWithErrorAsObservable) {
      return request$.pipe(catchError(error => ErrorResponseUtils.getErrorResponse<Coupon>(error)));
    } else {
      return request$.pipe(
        catchError((error: HttpErrorResponseWithBaseError) => {
          throw getHttpBaseErrorResponseError(error);
        }),
      );
    }
  }

  getSessionPacksDetails(partnerId: number, id: Cart['id']): Observable<BaseResponse<SessionPack[] | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#distributorRoute.pairTarget();
    const url = this.#getSessionPacksDetailsUrl(partnerId, id, target);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    return this.httpClient.get<BaseResponse<SessionPackDTO[]>>(url, { headers }).pipe(
      map((result: BaseResponse<SessionPackDTO[]>) => {
        const dto = result.data;
        let sessionPack: SessionPack[] | null = null;
        if (dto) {
          sessionPack = dto.map(this.cartAdapter.adaptSessionPack);
        }
        return new BaseResponse(sessionPack, result.error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<SessionPack[]>(error)),
    );
  }

  /**
   * @deprecated Use the prepareAndGetCartV2 method instead, see (internal ticket)
   */
  prepareAndGetCart(query: PrepareCartQuery): Observable<BaseResponse<Cart | null>> {
    const { cartId, channel, kioskSerialNumber, onsiteSetupId, overrideCapacity, partnerId, placeId, planId, user, userId } = query;
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#distributorRoute.pairTarget();
    const path: string = this.getPrepareCartUrl(partnerId, planId ?? 0, placeId, cartId);
    const body = this.getPrepareCartBody(userId, onsiteSetupId, channel, user, kioskSerialNumber, overrideCapacity);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    return this.httpClient.post(path, body, { headers }).pipe(
      switchMap(() => this.getCart(partnerId, cartId)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Cart>(error)),
    );
  }

  prepareAndGetCartV2(query: PrepareCartQueryV2): Observable<BaseResponse<Cart | null>> {
    const { adjustment, cartId, channel, kioskSerialNumber, onsiteSetupId, partnerId, placeId, planId, user } = query;
    const userPrepareCarBody: UserPrepareCarBody = {
      city: query.customer?.cityStandardId ?? null,
      email: query.customer?.email ?? null,
      first_name: query.customer?.firstName ?? null,
      last_name: query.customer?.lastName ?? null,
      terms: ['on-site-privacy-22032022'],
    };
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#distributorRoute.pairTarget();
    const path: string = this.getPrepareCartUrl(partnerId, planId ?? 0, placeId, cartId, '2.0');
    const body = this.getPrepareCartBodyV2(onsiteSetupId, channel, user, kioskSerialNumber, userPrepareCarBody, adjustment);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    return this.httpClient.post(path, body, { headers }).pipe(
      switchMap(() => this.getCart(partnerId, cartId)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Cart>(error)),
    );
  }

  canPrepareInOneCall(): boolean {
    return this.#distributorRoute.pairTarget() === null;
  }

  prepareAndGetCartForCustomer(query: PrepareCartForCustomerQuery): Observable<BaseResponse<Cart | null>> {
    return this.prepareAndGetCartWithBookingQuestionsForCustomer(query).pipe(map(prepared => prepared.cart));
  }

  /**
   * The same 2.1 prepare as {@link prepareAndGetCartForCustomer}, whose cart answer it carries unchanged, plus the
   * booking questions partners reads with it (B2BO-9578). A failed prepare reads no questions.
   */
  prepareAndGetCartWithBookingQuestionsForCustomer(query: PrepareCartForCustomerQuery): Observable<PreparedCartWithBookingQuestions> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const path: string = this.getPrepareCartUrl(query.partnerId, query.planId ?? 0, query.placeId, query.cartId, '2.1');
    return this.httpClient.post<BaseResponse<PrepareCartForCustomerData>>(path, this.#getPrepareCartForCustomerBody(query)).pipe(
      map(
        (result: BaseResponse<PrepareCartForCustomerData>): PreparedCartWithBookingQuestions => ({
          bookingQuestions: readPreparedCartBookingQuestions(result?.data),
          cart: this.#withPreparedBuyer(this.cartAdapter.fromApi(this.#toCartResponse(result)), query),
        }),
      ),
      catchError(error =>
        this.#isCustomerCreationError(error)
          ? throwError(() => this.#getCustomerCreationError(error))
          : ErrorResponseUtils.getErrorResponse<Cart>(error).pipe(
              map(
                (cart: BaseResponse<null>): PreparedCartWithBookingQuestions => ({
                  bookingQuestions: { status: PreparedCartBookingQuestionsStatus.UNAVAILABLE },
                  cart,
                }),
              ),
            ),
      ),
    );
  }

  prepareCart(query: PrepareCartQuery): Observable<BaseResponse<any>> {
    const { cartId, channel, onsiteSetupId, overrideCapacity, partnerId, placeId, planId, userId } = query;
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#distributorRoute.pairTarget();
    const path: string = this.getPrepareCartUrl(partnerId, planId ?? 0, placeId, cartId);
    const body = this.getPrepareCartBody(userId, onsiteSetupId, channel, undefined, undefined, overrideCapacity);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    return this.httpClient.post(path, body, { headers }).pipe(
      switchMap(() => {
        return of(new BaseResponse({}, null));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }

  /**
   * Removes all sessions for the given mainPlanId from the cart and persists via API.
   * Use for confirmed carts. For unconfirmed carts, use CartUtil.removeSessionsByMainPlanId directly.
   */
  removePlanFromCart(query: RemovePlanFromCartQuery): Observable<BaseResponse<Cart | null>> {
    const filteredCart = CartUtil.removeSessionsByMainPlanId(query.cart, query.mainPlanId);
    const sessionItemsByDatetime = filteredCart?.sessionItemsByDatetime ?? new Map();
    return this.updateCart({
      cartId: query.cartId,
      hasSeating: filteredCart?.hasSeating,
      partnerId: query.partnerId,
      sessionItemLines: filteredCart?.sessionItemLines,
      sessionItemsByDatetime,
      useSessionItemLines: query.useSessionItemLines,
    });
  }

  updateCart(query: UpdateCartQuery): Observable<BaseResponse<Cart | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#cartScope(query.cartId);
    const path: string = this.updateCartUrl(query.partnerId, query.cartId, target);
    const body: UpdateCartRequestBody = this.getUpdateCartBody(query, target);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    const seatLabelsBySessionId = this.#buildSeatLabelsMap(body.session_items ?? []);
    const seatDisplayLabelsBySessionId = this.#buildSeatDisplayLabelsMap(query.sessionItemsByDatetime);

    return this.httpClient.put<BaseResponse<CartData>>(path, body, { headers }).pipe(
      tap({ subscribe: () => this.#logUpdateCartComposition(query, body) }),
      map((result: BaseResponse<CartData>) => {
        const mappedResult = this.cartAdapter.fromApi(result, this.#allSessions(query.sessionItemsByDatetime));
        this.#preserveSeatInfoInCart(mappedResult, seatLabelsBySessionId, seatDisplayLabelsBySessionId);
        return mappedResult;
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<Cart>(error)),
    );
  }

  updateCartLocale({
    cartId,
    locale,
    partnerId,
    userId,
  }: {
    cartId: string;
    locale: string;
    partnerId: number;
    userId: number;
  }): Observable<void> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#distributorRoute.pairTarget();
    const path = this.getUpdateCartLocaleUrl(partnerId, userId, cartId, target);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});
    const body = { locale };
    return this.httpClient
      .patch<void>(path, body, { headers })
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  #buildSeatLabelsMap(sessionItems: CartSessionItemRequestBody[]): Map<number, { labels: string[]; references: string[] }> {
    const seatLabelsBySessionId = new Map<number, { labels: string[]; references: string[] }>();
    sessionItems.forEach(item => {
      if (item.seats && item.seats.length > 0) {
        seatLabelsBySessionId.set(item.session_id, {
          labels: item.seats.map(seat => seat.label),
          references: item.seats.map(seat => seat.reference),
        });
      }
    });
    return seatLabelsBySessionId;
  }

  #buildSeatDisplayLabelsMap(sessionItemsByDatetime: Map<string, CartSession[]>): Map<number, string[]> {
    const map = new Map<number, string[]>();
    sessionItemsByDatetime.forEach(sessions => {
      sessions.forEach(session => {
        if (session.seatDisplayLabels && session.seatDisplayLabels.length > 0) {
          map.set(session.sessionId, [...session.seatDisplayLabels]);
        }
      });
    });
    return map;
  }

  #allSessions(sessionItemsByDatetime: Map<string, CartSession[]>): CartSession[] {
    return Array.from(sessionItemsByDatetime.values()).flat();
  }

  /** A cart holding manual price state always goes as lines: the `session_items` shape cannot carry a price (GAME-1722). */
  #canSendSessionItemLines(query: CreateCartQuery | UpdateCartQuery): boolean {
    const hasManualPriceState = this.#allSessions(query.sessionItemsByDatetime).some(holdsManualPriceState);
    return (
      (query.useSessionItemLines === true || hasManualPriceState) &&
      query.hasSeating !== true &&
      (query.seatingHoldTokensBySessionId?.size ?? 0) === 0 &&
      canUseCartSessionItemLines(query.sessionItemsByDatetime, { allowAddOns: query.allowAddOnLines === true })
    );
  }

  /** `manual_prices` and the acting employee travel together: the backend refuses one without the other. */
  #getManualPricesPayload(query: CreateCartQuery | UpdateCartQuery): Pick<UpdateCartRequestBody, 'b2b_employee' | 'manual_prices'> {
    const manualPrices = buildManualPriceRequestBodies(query.sessionItemsByDatetime);
    if (manualPrices.length === 0) {
      return {};
    }
    return {
      ...(query.actingEmployee !== undefined && { b2b_employee: query.actingEmployee }),
      manual_prices: manualPrices,
    };
  }

  #getCreateBundleIdsPayload(query: CreateCartQuery, target: DistributorTarget | null): Pick<CreateCartRequestBody, 'bundle_ids'> {
    return target === null && query.bundleIds !== undefined && query.bundleIds.length > 0 ? { bundle_ids: query.bundleIds } : {};
  }

  #getUpdateBundleIdsPayload(query: UpdateCartQuery, target: DistributorTarget | null): Pick<UpdateCartRequestBody, 'bundle_ids'> {
    return target === null && query.bundleIds !== undefined ? { bundle_ids: query.bundleIds } : {};
  }

  #cartTarget(): DistributorTarget | null {
    return this.#distributorRoute.pairTarget() ?? this.#onBehalfTarget.target();
  }

  #cartScope(cartId: string | null | undefined): DistributorTarget | null {
    return this.#distributorRoute.pairTarget() ?? this.#onBehalfScope.forCart(cartId);
  }

  #discardCartUrl(query: DiscardCartQuery, target: DistributorTarget | null, viaPartners: boolean): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/carts/${query.cartId}/discard/`;
    }
    if (viaPartners) {
      return `${environment.apiGWBaseUrl}/1.0/partners/${query.partnerId}/carts/${query.cartId}/discard`;
    }
    return `${environment.apiBaseUrl}/partners/${query.partnerId}/carts/${query.cartId}/discard/`;
  }

  #postPartnersDiscard(path: string, headers: HttpHeaders): Observable<object> {
    return defer(() => {
      let firstError: unknown = null;
      return this.httpClient.post(path, null, { context: new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true), headers }).pipe(
        retry({
          count: 1,
          delay: error => {
            firstError = error;
            return isRetriableDiscardError(error) ? timer(PARTNERS_DISCARD_RETRY_DELAY_MS) : throwError(() => error);
          },
        }),
        catchError(error => throwError(() => pickDiscardError(firstError, error))),
      );
    });
  }

  #discardsViaPartners(query: DiscardCartQuery, target: DistributorTarget | null): boolean {
    return target === null && query.viaCashRegister === true;
  }

  /** Box office only: the log exists to confirm the real-time flag on POS sales (GIT-1264 spec section 10). */
  /** Logged for box office, and for any cart sent as lines (the reservation with manual prices, GAME-1722). */
  #logCreateCartComposition(query: CreateCartQuery, body: CreateCartRequestBody): void {
    if (query.channel !== Channel.BoxOffice && body.session_item_lines === undefined) {
      return;
    }
    this.#datadogLogService.logInfo('[Cart][Create] create-cart payload composed', {
      channel: body.channel,
      isRealTimeSeating: body.is_real_time_seating === true,
      partnerId: query.partnerId,
      ...this.#summariseManualPricesComposition(body),
      ...this.#summariseSessionItemsComposition(this.#sessionItemsForComposition(body)),
    });
  }

  #logUpdateCartComposition(query: UpdateCartQuery, body: UpdateCartRequestBody): void {
    this.#datadogLogService.logInfo('[Cart][Update] update-cart payload composed', {
      cartId: query.cartId,
      partnerId: query.partnerId,
      ...this.#summariseManualPricesComposition(body),
      ...this.#summariseSessionItemsComposition(this.#sessionItemsForComposition(body)),
    });
  }

  /** How many lines carry a manual price and how many ticket types have one; nothing when the body sends no manual prices. */
  #summariseManualPricesComposition(
    body: CreateCartRequestBody | UpdateCartRequestBody,
  ): { pricedLineCount: number; pricedTicketTypeCount: number } | Record<string, never> {
    if (body.manual_prices === undefined) {
      return {};
    }
    return {
      pricedLineCount: (body.session_item_lines ?? []).filter((line: CartSessionItemLineRequestBody) => line.manual_ticket_price != null)
        .length,
      pricedTicketTypeCount: body.manual_prices.length,
    };
  }

  #sessionItemsForComposition(body: CreateCartRequestBody | UpdateCartRequestBody): CartSessionItemRequestBody[] {
    return (
      body.session_items ??
      (body.session_item_lines ?? []).map((line: CartSessionItemLineRequestBody) => ({
        main_plan_id: line.main_plan_id,
        session_id: line.session_id,
        units: 1,
      }))
    );
  }

  #summariseSessionItemsComposition(sessionItems: CartSessionItemRequestBody[]): {
    itemsWithoutPlan: number;
    mainPlanIds: number[];
    perPlan: { items: number; mainPlanId: number; units: number }[];
    sessionItemCount: number;
    totalUnits: number;
  } {
    const byPlan = new Map<number, { items: number; units: number }>();
    let totalUnits = 0;
    let itemsWithoutPlan = 0;

    sessionItems.forEach((item: CartSessionItemRequestBody) => {
      totalUnits += item.units;
      if (item.main_plan_id == null) {
        itemsWithoutPlan += 1;
        return;
      }
      const entry = byPlan.get(item.main_plan_id) ?? { items: 0, units: 0 };
      entry.items += 1;
      entry.units += item.units;
      byPlan.set(item.main_plan_id, entry);
    });

    return {
      itemsWithoutPlan,
      mainPlanIds: [...byPlan.keys()],
      perPlan: [...byPlan.entries()].map(([mainPlanId, counts]) => ({ items: counts.items, mainPlanId, units: counts.units })),
      sessionItemCount: sessionItems.length,
      totalUnits,
    };
  }

  #getSessionItems(
    sessionItemsByDatetime: Map<string, CartSession[]>,
    seatingToken?: string | null,
    seatingHoldTokensBySessionId?: Map<string, string>,
  ): CartSessionItemRequestBody[] {
    let sessionItems: CartSessionItemRequestBody[] = [];
    sessionItemsByDatetime.forEach((cartSession: CartSession[]) => {
      const sessionItem = cartSession.map((session: CartSession) => {
        let item: CartSessionItemRequestBody = {
          session_id: session.sessionId,
          units: session.units,
        };
        if (session.mainPlanId != null) {
          item = { ...item, main_plan_id: session.mainPlanId };
        }
        if (session.seats != null) {
          const labels: string[] = session.seatLabels ? session.seatLabels : session.seats;
          item = {
            ...item,
            seats: session.seats.map((reference, index) => ({
              label: labels[index],
              reference: reference,
            })),
          };
          const holdToken = seatingHoldTokensBySessionId?.get(session.sessionId.toString()) ?? session.seatingHoldToken ?? seatingToken;
          if (holdToken != null) {
            item = { ...item, seating_hold_token: holdToken };
          }
        }
        return item;
      });
      sessionItems = sessionItems.concat(sessionItem);
    });
    return sessionItems;
  }

  #getSessionPacksDetailsUrl(partnerId: number, id: Cart['id'], target: DistributorTarget | null): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/carts/${id}/sessions/?including_packed_sessions=true`;
    }
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/carts/${id}/sessions/?including_packed_sessions=true`;
  }

  #preserveSeatInfoInCart(
    mappedResult: BaseResponse<Cart | null>,
    seatLabelsBySessionId: Map<number, { labels: string[]; references: string[] }>,
    seatDisplayLabelsBySessionId?: Map<number, string[]>,
  ): void {
    if (!mappedResult.data) {
      return;
    }
    const hasWireSeatInfo = seatLabelsBySessionId.size > 0;
    const hasDisplaySeatInfo = (seatDisplayLabelsBySessionId?.size ?? 0) > 0;
    if (!hasWireSeatInfo && !hasDisplaySeatInfo) {
      return;
    }
    mappedResult.data.sessionItemsByDatetime.forEach((cartSessions: CartSession[]) => {
      cartSessions.forEach((cartSession: CartSession) => {
        const seatInfo = seatLabelsBySessionId.get(cartSession.sessionId);
        if (seatInfo) {
          cartSession.seatLabels = seatInfo.labels;
          cartSession.seats = seatInfo.references;
        }
        const displayLabels = seatDisplayLabelsBySessionId?.get(cartSession.sessionId);
        if (displayLabels && displayLabels.length > 0) {
          cartSession.seatDisplayLabels = displayLabels;
        }
      });
    });
  }

  private addGiftCardCombinationUrl(partnerId: number, cartId: string): string {
    const target = this.#distributorRoute.pairTarget();
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/${distributorSegment(target)}/carts/${cartId}/gift-cards/add/`;
    }
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/carts/${cartId}/gift-cards/add/`;
  }

  private removeGiftCardCombinationUrl(partnerId: number, cartId: string): string {
    const target = this.#distributorRoute.pairTarget();
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/${distributorSegment(target)}/carts/${cartId}/gift-cards/remove/`;
    }
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/carts/${cartId}/gift-cards/remove/`;
  }

  private applyCouponToCartBusinessUrl(partnerId: number, userId: number, cartId: string, target: DistributorTarget | null): string {
    if (target !== null) {
      // No user segment: the acting organization is resolved from the cart, not the user.
      return `${environment.apiBaseUrl}/3.0/carts/${cartId}/coupons/apply/`;
    }
    return `${environment.apiBaseUrl}/partners/${partnerId}/users/${userId}/carts/${cartId}/coupons/apply/`;
  }

  private applyCouponToCartUrl(partnerId: number, cartId: string, target: DistributorTarget | null): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/carts/${cartId}/coupons/apply/`;
    }
    return `${environment.apiBaseUrl}/partners/${partnerId}/carts/${cartId}/coupons/apply/`;
  }

  private getAdjustmentData(adjustment: CartAdjustmentPrice): CartAdjustmentPriceData {
    return {
      amount: adjustment.amount,
      calculation: adjustment.calculation,
      concept: adjustment.concept,
      operation: (adjustment as CartAdjustmentPriceWithOperationData).operation,
    };
  }

  private getCartUrl(partnerId: number, cartId: string, target: DistributorTarget | null): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/carts/${cartId}/`;
    }
    return `${environment.apiBaseUrl}/partners/${partnerId}/carts/${cartId}/`;
  }

  private getCouponForCartUrl(partnerId: number, cartId: string, couponCode: string, lazyCouponType: string | null): string {
    const target = this.#distributorRoute.pairTarget();
    let url =
      target !== null
        ? `${environment.apiBaseUrl}/3.0/${distributorSegment(target)}/carts/${cartId}/coupons/${couponCode}/`
        : `${environment.apiBaseUrl}/partners/${partnerId}/carts/${cartId}/coupons/${couponCode}/`;
    if (lazyCouponType) {
      url += `?lazy_coupon_type=${lazyCouponType}`;
    }
    return url;
  }

  private getCreateCartBody(query: CreateCartQuery, target: DistributorTarget | null): CreateCartRequestBody {
    const hasSeatingToken = query.seatingToken != null && query.seatingToken.length > 0;
    const canUseSessionItemLines =
      this.#canSendSessionItemLines(query) &&
      query.rescheduleOrderId == null &&
      hasSeatingToken === false &&
      query.isRealTimeSeating !== true;
    if (canUseSessionItemLines) {
      return {
        ...(target !== null && { partner_id: target.targetOrganizationId }),
        channel: query.channelId ?? query.channel,
        session_item_lines: buildCartSessionItemLines(query.sessionItemsByDatetime),
        ...this.#getManualPricesPayload(query),
        ...this.#getCreateBundleIdsPayload(query, target),
        ...(query.overrideCapacity === true && { override_capacity: true }),
      };
    }

    const sessionItems: CartSessionItemRequestBody[] = this.#getSessionItems(
      query.sessionItemsByDatetime,
      query.seatingToken,
      query.seatingHoldTokensBySessionId,
    );
    return {
      ...(target !== null && { partner_id: target.targetOrganizationId }),
      channel: query.channelId ?? query.channel,
      session_items: sessionItems,
      ...this.#getCreateBundleIdsPayload(query, target),
      ...(query.isRealTimeSeating === true && { is_real_time_seating: true }),
      ...(query.rescheduleOrderId != null && { reschedule_order_id: query.rescheduleOrderId }),
      ...(query.reschedulePaidBy !== undefined && { reschedule_paid_by: query.reschedulePaidBy }),
      ...(query.overrideCapacity === true && { override_capacity: true }),
    };
  }

  private getCreateCartUrl(partnerId: number, target: DistributorTarget | null): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/carts/`;
    }
    return `${environment.apiBaseUrl}/partners/${partnerId}/carts/`;
  }

  private getPrepareCartBody(
    userId?: number,
    onsiteSetupId?: string,
    channel?: string,
    user?: User,
    kioskSerialNumber?: string,
    overrideCapacity?: boolean,
  ): PrepareCarBody {
    const userCart: User | null = user || this.userService.getUser();
    let body: PrepareCarBody = {
      b2b_user: {
        b2b_user_email: userCart?.email ?? null,
        b2b_user_id: userCart?.id ?? null,
        b2b_user_interface: userCart?.interfaceType ?? null,
        b2b_user_name: userCart?.name ?? null,
        b2b_user_username: userCart?.username ?? null,
      },
    };
    if (onsiteSetupId) {
      body = { ...body, onsite_setup_id: onsiteSetupId };
    }
    if (channel) {
      body = { ...body, channel_id: channel };
    }
    if (kioskSerialNumber) {
      body = { ...body, kiosk_serial_number: kioskSerialNumber };
    }
    if (overrideCapacity === true) {
      body = { ...body, override_capacity: true };
    }
    return userId ? { ...body, user_id: userId } : body;
  }

  #toCartResponse(result: BaseResponse<PrepareCartForCustomerData>): BaseResponse<CartData> {
    return new BaseResponse<CartData>(readCartData(result?.data), result?.error);
  }

  #withPreparedBuyer(response: BaseResponse<Cart | null>, query: PrepareCartForCustomerQuery): BaseResponse<Cart | null> {
    const cart = response.data;
    if (cart == null || cart.userId != null) {
      return response;
    }
    if (!hasContactDetails(query.customer)) {
      cart.userId = environment.OBO.GENERIC_USER_ID;
      return response;
    }
    this.#datadogLogService.logWarn('[Cart][Prepare] 2.1 prepare answered a cart without a buyer', {
      cartId: query.cartId,
      partnerId: query.partnerId,
    });
    return new BaseResponse<Cart>(null, { code: 'CART_WITHOUT_BUYER', message: 'errors.generic' });
  }

  #getPrepareCartForCustomerBody(query: PrepareCartForCustomerQuery): PrepareCartForCustomerBody {
    const { channel, customer, kioskSerialNumber, onsiteSetupId, overrideCapacity, user } = query;
    if (!hasContactDetails(customer)) {
      return this.getPrepareCartBody(environment.OBO.GENERIC_USER_ID, onsiteSetupId, channel, user, kioskSerialNumber, overrideCapacity);
    }
    const body = this.getPrepareCartBody(undefined, onsiteSetupId, channel, user, kioskSerialNumber, overrideCapacity);
    return { ...body, user: this.#getPrepareCartCustomerBody(customer) };
  }

  #getPrepareCartCustomerBody(customer: Customer): PrepareCartCustomerBody {
    return {
      terms: customer.acceptedTerms ?? [],
      ...(customer.cityStandardId != null && { city: customer.cityStandardId }),
      ...(Boolean(customer.email) && { email: customer.email }),
      ...(Boolean(customer.firstName) && { first_name: customer.firstName }),
      ...(Boolean(customer.lastName) && { last_name: customer.lastName }),
      ...(Boolean(customer.phoneNumber) && { phone_number: customer.phoneNumber }),
    };
  }

  #getCustomerCreationError(error: HttpErrorResponseWithBaseError): BaseErrorResponse {
    const isRejectedEmail = error.status === HttpStatusCode.UnprocessableEntity && /email/i.test(error.error?.error?.message ?? '');
    return { code: error.status, error, message: isRejectedEmail ? 'form.error.invalidEmail' : 'errors.generic' };
  }

  #isCustomerCreationError(error: unknown): error is HttpErrorResponseWithBaseError {
    return error instanceof HttpErrorResponse && String(error.error?.error?.code) === CUSTOMER_CREATION_ERROR_CODE;
  }

  private getPrepareCartBodyV2(
    onsiteSetupId?: string,
    channel?: string,
    b2bUser?: User,
    kioskSerialNumber?: string,
    user?: UserPrepareCarBody,
    adjustment?: CartAdjustmentPrice,
  ): PrepareCartBodyV2 {
    const userCart: User | null = b2bUser || this.userService.getUser();
    let body: PrepareCartBodyV2 = {
      b2b_user: {
        b2b_user_email: userCart?.email ?? null,
        b2b_user_id: userCart?.id ?? null,
        b2b_user_interface: userCart?.interfaceType ?? null,
        b2b_user_name: userCart?.name ?? null,
        b2b_user_username: userCart?.username ?? null,
      },
    };
    if (onsiteSetupId) {
      body = { ...body, onsite_setup_id: onsiteSetupId };
    }
    if (channel) {
      body = { ...body, channel_id: channel };
    }
    if (kioskSerialNumber) {
      body = { ...body, kiosk_serial_number: kioskSerialNumber };
    }
    if (adjustment) {
      body = { ...body, adjustment: this.getAdjustmentData(adjustment) };
    }

    return user ? { ...body, user: user } : body;
  }

  private getPrepareCartUrl(partnerId: number, planId: number, placeId: number, cartId: string, version: string = '1.0'): string {
    const target = this.#distributorRoute.pairTarget();
    if (target !== null) {
      // The distributor route serves prepare only at 3.0, so the caller's version is ignored; the distributor is read from a header.
      return `${environment.apiGWBaseUrl}/3.0/partners/${target.targetOrganizationId}/plans/${planId}/places/${placeId}/carts/${cartId}/prepare`;
    }
    return `${environment.apiGWBaseUrl}/${version}/partners/${partnerId}/plans/${planId}/places/${placeId}/carts/${cartId}/prepare`;
  }

  private getUpdateCartBody(query: UpdateCartQuery, target: DistributorTarget | null): UpdateCartRequestBody {
    const canUseSessionItemLines = this.#canSendSessionItemLines(query) && query.seatingMapState == null;
    if (canUseSessionItemLines) {
      return {
        session_item_lines: buildCartSessionItemLines(query.sessionItemsByDatetime, query.sessionItemLines),
        ...this.#getManualPricesPayload(query),
        ...this.#getUpdateBundleIdsPayload(query, target),
        ...(query.overrideCapacity === true && { override_capacity: true }),
        ...(query.adjustment !== undefined && { adjustment: this.getAdjustmentData(query.adjustment) }),
      };
    }

    const seatingToken = query.seatingMapState?.hold_token;
    const sessionItems: CartSessionItemRequestBody[] = this.#getSessionItems(
      query.sessionItemsByDatetime,
      seatingToken,
      query.seatingHoldTokensBySessionId,
    );
    return {
      session_items: sessionItems,
      ...this.#getUpdateBundleIdsPayload(query, target),
      ...(query.overrideCapacity === true && { override_capacity: true }),
      ...(query.adjustment !== undefined && { adjustment: this.getAdjustmentData(query.adjustment) }),
    };
  }

  private getUpdateCartLocaleUrl(partnerId: number, userId: number, cartId: string, target: DistributorTarget | null): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/carts/${cartId}/locale/`;
    }

    const userCanReserveOnBehalf = this.userService.hasPermission(Permissions.CAN_RESERVE_ON_BEHALF);
    if (userCanReserveOnBehalf) {
      return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/carts/${cartId}/locale/`;
    }

    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/users/${userId}/carts/${cartId}/locale/`;
  }

  private updateCartUrl(partnerId: number, cartId: string, target: DistributorTarget | null): string {
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/carts/${cartId}/update/`;
    }
    return `${environment.apiBaseUrl}/partners/${partnerId}/carts/${cartId}/update/`;
  }
}
