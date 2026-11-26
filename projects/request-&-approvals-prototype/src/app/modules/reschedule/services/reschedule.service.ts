import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { inject, Injectable, Injector } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { RescheduleOrderData, RescheduleOrderEvent } from '@fz-original/app/core/tracking/core/events/reschedule-order';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { OnsiteSetupRequiredApiErrorService } from '@fz-original/app/modules/box-office/shared/services/onsite-setup-required-api-error.service';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import {
  OneStepPurchaseService,
  PayOneStepQuery,
  PayOneStepResponse,
} from '@fz-original/app/modules/box-office/ticketing/services/one-step-purchase/one-step-purchase.service';
import { RescheduleBookingQuestionsWriterService } from '@fz-original/app/modules/reschedule/booking-questions/reschedule-booking-questions-writer.service';
import { RescheduleModalComponent } from '@fz-original/app/modules/reschedule/components/reschedule-modal/reschedule-modal.component';
import { OrderRescheduled, SessionItem } from '@fz-original/app/modules/reschedule/models/reschedule-order.model';
import { RescheduleOrderService } from '@fz-original/app/modules/reschedule/services/reschedule-order.service';
import { ModificationCollectedBookingQuestionsAnswers } from '@fz-original/app/shared/booking-questions/modification/services/modification-booking-questions.orchestrator';
import { totalWithAdjustment } from '@fz-original/app/shared/cart/utils/cart-adjustment.util';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { SessionAvailabilitySummaryByDate } from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-date.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { CartService } from '@fz-original/app/shared/services/cart/cart.service';
import { CreateCartQuery } from '@fz-original/app/shared/services/cart/create-cart-query';
import { ReschedulePaidBy } from '@fz-original/app/shared/services/cart/reschedule-paid-by.enum';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { toActingEmployee } from '@fz-original/app/shared/utils/cart-manual-price.util';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { fixedDecimals } from '@fz-original/app/shared/utils/number.util';
import { TranslateService } from '@ngx-translate/core';
import { defer, Observable, of, throwError } from 'rxjs';
import { catchError, defaultIfEmpty, map, switchMap, tap } from 'rxjs/operators';

import { RescheduleTypeEnum } from '../models/reschedule-type.enum';

export class RescheduleModalCancelledError extends Error {
  constructor() {
    super('Modal cancelled');
    this.name = 'RescheduleModalCancelledError';
  }
}

@Injectable({
  providedIn: 'root',
})
export class RescheduleService {
  static readonly isReschedulePayByPartnerEnabled = true;
  #cartService = inject(CartService);
  readonly #datadogLogService = inject(DatadogLogService);
  #onsiteSetupRequiredApiErrorService = inject(OnsiteSetupRequiredApiErrorService);
  #dialog: Dialog = inject(Dialog);
  #enabledPayByCustomer = false;
  #isPaidByPartnerAllowedForOrder = true;
  #injector = inject(Injector);
  #oneStepPurchaseService = inject(OneStepPurchaseService);
  #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  #optimizelyService = inject(OptimizelyService);
  #rescheduleOrderService = inject(RescheduleOrderService);
  #spinnerService = inject(SpinnerService);
  #trackingService = inject(TrackingService);
  #translate = inject(TranslateService);
  readonly #userService = inject(UserService);
  previousOrder!: Order;
  rescheduleType!: RescheduleTypeEnum;

  confirmReschedule(
    paymentType: RescheduleTypeEnum,
    cityId: number,
    planId: number,
    placeId: number,
    sessionItems: SessionItem[],
    order: Order,
    rescheduledSessionDate: Date,
    partnerId: number,
    channelId: string,
    channel: Channel,
    nonConfirmedCart: Cart,
    seatingToken?: string | null,
    targetSessionItemsByDatetime?: Map<string, CartSession[]>,
    bookingQuestionsAnswers?: ModificationCollectedBookingQuestionsAnswers,
  ): Observable<Cart | BaseResponse<OrderRescheduled> | PayOneStepResponse> {
    this.rescheduleType = paymentType;
    this.#spinnerService.show();

    // The `/reschedule` endpoint builds its own cart and cannot carry line prices (GAME-2287), so a priced modification always
    // goes through cart creation and states who pays.
    const isThroughCartCreationEnabled =
      this.#isRescheduleThroughCartCreationEnabled() || this.#hasTargetManualPrices(targetSessionItemsByDatetime);

    if (paymentType === RescheduleTypeEnum.PAID_BY_PARTNER && isThroughCartCreationEnabled === false) {
      return this.#reschedulePayByPartner(planId, placeId, order, sessionItems, channelId, bookingQuestionsAnswers);
    }

    const paidBy = paymentType === RescheduleTypeEnum.PAID_BY_PARTNER ? ReschedulePaidBy.PARTNER : ReschedulePaidBy.CUSTOMER;

    return this.#rescheduleThroughCart(
      isThroughCartCreationEnabled ? paidBy : undefined,
      rescheduledSessionDate,
      sessionItems,
      partnerId,
      cityId!,
      planId,
      placeId,
      channelId,
      channel,
      order,
      nonConfirmedCart,
      seatingToken,
      targetSessionItemsByDatetime,
      bookingQuestionsAnswers,
    );
  }

  determineWhoPays(
    order: Order,
    nonConfirmedCart: Cart,
    orderTotalAmount: number = this.getOrderTotalAmount(order),
  ): Observable<RescheduleTypeEnum> {
    return this.#getWhoPaidReschedule(order, nonConfirmedCart, orderTotalAmount);
  }

  getOrderTotalAmount(order: Order): number {
    return fixedDecimals((order.cart?.total?.amount ?? 0) + (order.cart?.appliedCoupon?.discount.amount ?? 0), 3);
  }

  getOrderTotalAmountKeepingTicketTypeDiscounts(order: Order): number {
    return this.#hasTicketTypeDiscounts(order) ? fixedDecimals(order.cart?.total?.amount ?? 0, 3) : this.getOrderTotalAmount(order);
  }

  getRescheduledTotal(order: Order, newCartTotal: Money): Money {
    return totalWithAdjustment(newCartTotal, order.cart?.adjustment);
  }

  getSessionItemsForReschedule(
    planId: number,
    _cartSessions: CartSession[],
    _selectedSession: SessionAvailabilitySummaryByDate,
    selectedTicketsBySessionId: Map<string, number>,
  ): SessionItem[] {
    this.#updateReschedulePricingFeatureFlags(planId);
    return this.#getSessionItemsForRescheduleAllowingDifferentTicketTypes(selectedTicketsBySessionId);
  }

  /** Whether the customer may be charged the difference of a modification of this plan (`reschedule_pay_higher_price`). */
  isPayByCustomerEnabled(planId: number): boolean {
    return (
      this.#optimizelyService.isFeatureEnabled('reschedule_pay_higher_price', {
        plan_id: planId,
      }) ?? false
    );
  }

  isRescheduleAllowingDifferentTicketType(planId: number): boolean {
    this.#updateReschedulePricingFeatureFlags(planId);
    return true;
  }

  primeReschedulePricingFeatureFlags(planId: number): void {
    this.#updateReschedulePricingFeatureFlags(planId);
  }

  #updateReschedulePricingFeatureFlags(planId: number): void {
    this.#enabledPayByCustomer = this.isPayByCustomerEnabled(planId);
  }

  sendRescheduleOrderEvent(order: Order): void {
    if (!this.previousOrder) {
      return;
    }
    const totalAmountVariation = this.getOrderTotalAmount(order) - this.getOrderTotalAmount(this.previousOrder);
    const totalTicketsVariation = order.cart!.getNumberOfTicketCounts() - this.previousOrder.cart!.getNumberOfTicketCounts();

    const mixpanelData: RescheduleOrderData = {
      order_id: order.id!,
      payment_gateway: order.paymentGateway!,
      payment_method: order.cart!.paymentMethod!,
      channel: order.channelId!,
      is_reservation: this.#isReservationOrder(order),
      paid_by_customer_is_enabled: this.#enabledPayByCustomer || !this.#isPaidByPartnerAllowedForOrder,
      paid_by_partner_is_enabled: RescheduleService.isReschedulePayByPartnerEnabled && this.#isPaidByPartnerAllowedForOrder,
      reschedule_type: this.rescheduleType,
      total_amount_variation: totalAmountVariation,
      total_tickets_variation: totalTicketsVariation,
      same_timeslot: this.previousOrder.cart!.haveSameTimeSlot(order.cart!),
      same_ticket_types: this.previousOrder.cart!.haveSameTicketTypes(order.cart!),
    };
    this.#trackingService.track(new RescheduleOrderEvent(<RescheduleOrderData>mixpanelData));
  }

  /**
   * fever2 refuses manual prices on a cart created with `reschedule_order_id`, but takes them on the update of that cart
   * (GAME-2287), so the line prices set on the modification travel in one update right after the creation.
   */
  #applyManualPrices(createdCart: Cart, partnerId: number, sessionItemsByDatetime: Map<string, CartSession[]>): Observable<Cart> {
    return this.#cartService
      .updateCart({
        actingEmployee: toActingEmployee(this.#userService.getUser()) ?? undefined,
        cartId: createdCart.id!, // A cart fever2 has just created always carries its id.
        partnerId,
        sessionItemLines: createdCart.sessionItemLines,
        sessionItemsByDatetime,
        useSessionItemLines: true,
      })
      .pipe(
        switchMap((response: BaseResponse<Cart | null>) => this.#checkResponseData(response)),
        catchError((error: unknown) => this.#discardCreatedCart(createdCart, partnerId).pipe(switchMap(() => throwError(() => error)))),
      );
  }

  /** A refused line price leaves the reschedule cart already created, so it is discarded before the error reaches the operator. */
  #discardCreatedCart(createdCart: Cart, partnerId: number): Observable<unknown> {
    const cartId = createdCart.id!; // A cart fever2 has just created always carries its id.

    return this.#cartService.discardCart({ cartId, partnerId }).pipe(
      catchError(() => of(null)),
      defaultIfEmpty(null),
    );
  }

  #hasTargetManualPrices(targetSessionItemsByDatetime: Map<string, CartSession[]> | undefined): boolean {
    return Array.from(targetSessionItemsByDatetime?.values() ?? [])
      .flat()
      .some((session: CartSession) => session.manualPrice != null);
  }

  #checkResponseData<T>(response: BaseResponse<T | null>): Observable<T> {
    return response?.data ? of(response.data) : throwError(() => response.error);
  }

  #hasTicketTypeDiscounts(order: Order): boolean {
    return order.cart?.coupons?.discounts.some(couponDiscount => couponDiscount.discounts.length > 0) ?? false;
  }

  #createFreeOrderRescheduled(cart: Cart, payOneStepQuery: PayOneStepQuery): Observable<Cart | PayOneStepResponse> {
    payOneStepQuery.cartId = cart.id!;
    cart.userId = payOneStepQuery.userId;
    return this.#oneStepPurchaseService.createFreeOrderRequest(payOneStepQuery, cart).pipe(
      map((response: PayOneStepResponse) => ({ ...response, cartId: cart.id })),
      catchError((errorResponse: BaseResponse<PayOneStepResponse>) => throwError(() => this.#toRescheduleError(errorResponse))),
    );
  }

  /**
   * Both free-order failures arrive already mapped: a `checkout/free` rejection holds the HTTP status in `code` and fever's
   * code in `errorCode`, and a book result rejection keeps the HTTP error whose body carries `user_error`. Keying on
   * `errorCode` gives `errors.reschedule.<fever code>` from both, where the group mapper alone picks the HTTP status.
   */
  #toRescheduleError(errorResponse: BaseResponse<PayOneStepResponse>): BaseErrorResponse {
    const groupError = ErrorResponseUtils.getErrorResponseFromGroupError(errorResponse, 'reschedule');
    const mappedError = errorResponse?.error;
    const feverCode = mappedError?.errorCode;
    if (feverCode == null) {
      return groupError;
    }

    const responseBody = mappedError?.error?.error;
    return {
      ...groupError,
      errorCode: feverCode,
      message: `errors.reschedule.${feverCode}`,
      userError: mappedError.userError ?? responseBody?.user_error ?? groupError.userError,
    };
  }

  #getSessionItemsForRescheduleAllowingDifferentTicketTypes(selectedTicketsBySessionId: Map<string, number>): SessionItem[] {
    return Array.from(selectedTicketsBySessionId.entries())
      .filter(([, units]: [string, number]) => units > 0)
      .map(([sessionId, units]: [string, number]) => ({
        sessionId: Number.parseInt(sessionId),
        ticketNumber: units,
      }));
  }

  #getWhoPaidReschedule(order: Order, nonConfirmedCart: Cart, orderTotalAmount: number): Observable<RescheduleTypeEnum> {
    this.#isPaidByPartnerAllowedForOrder = true;
    const hasNewOrderSameOrLowerPrice = this.#hasNewOrderSameOrLowerPrice(order, nonConfirmedCart, orderTotalAmount);

    // A raised manual price is charged to the customer without asking, as in Reservations (GAME-2287), but only where the
    // partner lets the customer be charged; any other priced modification decides who pays as an unpriced one does.
    if (
      !hasNewOrderSameOrLowerPrice &&
      this.#enabledPayByCustomer &&
      this.#hasTargetManualPrices(nonConfirmedCart?.sessionItemsByDatetime)
    ) {
      return of(RescheduleTypeEnum.PAID_BY_CUSTOMER);
    }

    if (this.#isReservationOrder(order) && hasNewOrderSameOrLowerPrice) {
      return of(RescheduleTypeEnum.PAID_BY_PARTNER);
    }

    if (hasNewOrderSameOrLowerPrice) {
      return of(this.#enabledPayByCustomer ? RescheduleTypeEnum.PAID_BY_CUSTOMER : RescheduleTypeEnum.PAID_BY_PARTNER);
    }

    return this.#isPaidByPartnerAllowed(order).pipe(
      switchMap(isPaidByPartnerAllowed => {
        this.#isPaidByPartnerAllowedForOrder = isPaidByPartnerAllowed;
        if (!isPaidByPartnerAllowed) {
          return of(RescheduleTypeEnum.PAID_BY_CUSTOMER);
        }

        if (!this.#enabledPayByCustomer) {
          return of(RescheduleTypeEnum.PAID_BY_PARTNER);
        }

        if (this.#hasSeating(nonConfirmedCart)) {
          return of(RescheduleTypeEnum.PAID_BY_CUSTOMER);
        }

        return this.#showRescheduleModal();
      }),
    );
  }

  #hasNewOrderSameOrLowerPrice(order: Order, nonConfirmedCart: Cart, orderTotalAmount: number): boolean {
    const nonConfirmedCartTotal = nonConfirmedCart?.total;
    const nonConfirmedCartTotalAmount = nonConfirmedCartTotal ? this.getRescheduledTotal(order, nonConfirmedCartTotal).amount : 0;
    return nonConfirmedCartTotalAmount <= orderTotalAmount;
  }

  /**
   * The global spinner covers the request so Confirm cannot be clicked again while it is in flight.
   * It drops before the answer goes downstream: the who-pays modal and `confirmReschedule` take over.
   */
  #isPaidByPartnerAllowed(order: Order): Observable<boolean> {
    const orderId = order.id;
    if (orderId == null) {
      return of(true);
    }

    return defer(() => {
      let isSpinnerShown = true;
      const hideSpinner = (): void => {
        if (isSpinnerShown) {
          isSpinnerShown = false;
          this.#spinnerService.hide();
        }
      };
      this.#spinnerService.show();

      return this.#rescheduleOrderService.isPaidByPartnerAllowed(orderId).pipe(
        catchError((error: BaseErrorResponse) => {
          this.#datadogLogService.logWarn('[Reschedule] Reschedule settings not loaded', {
            code: error?.code,
            orderId,
          });
          return of(true);
        }),
        tap({ next: hideSpinner, unsubscribe: hideSpinner }),
      );
    });
  }

  /**
   * Off, pay-by-partner keeps going through `/reschedule` and the field is never sent, so the
   * backend sees exactly the requests it sees today.
   */
  #isRescheduleThroughCartCreationEnabled(): boolean {
    return (
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.RESCHEDULE_THROUGH_CART_CREATION,
        team: 'b2b-onsite',
      }) ?? false
    );
  }

  #isReservationOrder(order: Order): boolean {
    return order.reservationId != null;
  }

  #hasSeating(nonConfirmedCart: Cart): boolean {
    return nonConfirmedCart?.hasSeating ?? false;
  }

  /**
   * Every reschedule now goes through cart creation, whoever pays.
   *
   * `reschedule_paid_by` is what tells the backend to move the outstanding amount onto the partner's
   * share of the reschedule coupon, so the cart lands at zero and the free-order path below closes
   * it. Before this, that only happened inside the `/reschedule` endpoint, which built its own cart
   * server-side and left the front end with nowhere to write the booking questions answers.
   *
   * `reschedulePaidBy` arrives undefined while the flag is off, and the field is then never sent.
   */
  #rescheduleThroughCart(
    reschedulePaidBy: ReschedulePaidBy | undefined,
    rescheduledSessionDate: Date,
    sessionItems: SessionItem[],
    partnerId: number,
    cityId: number,
    planId: number,
    placeId: number,
    channelId: string,
    channel: Channel,
    order: Order,
    nonConfirmedCart: Cart,
    seatingToken?: string | null,
    targetSessionItemsByDatetime?: Map<string, CartSession[]>,
    bookingQuestionsAnswers?: ModificationCollectedBookingQuestionsAnswers,
  ): Observable<Cart | PayOneStepResponse> {
    let sessionItemsByDatetime: Map<string, CartSession[]>;

    if (nonConfirmedCart?.hasSeating && nonConfirmedCart.sessionItemsByDatetime) {
      sessionItemsByDatetime = nonConfirmedCart.sessionItemsByDatetime;
    } else if (targetSessionItemsByDatetime && targetSessionItemsByDatetime.size > 0) {
      sessionItemsByDatetime = targetSessionItemsByDatetime;
    } else {
      sessionItemsByDatetime = new Map<string, CartSession[]>();
      sessionItemsByDatetime.set(
        rescheduledSessionDate.toISOString(),
        sessionItems.map(sessionItem => new CartSession(sessionItem.sessionId, sessionItem.ticketNumber)),
      );
    }
    const createCartQuery: CreateCartQuery = {
      partnerId,
      channel,
      channelId,
      sessionItemsByDatetime,
      locale: this.#translate.currentLang,
      seatingToken: seatingToken ?? null,
      rescheduleOrderId: order.id,
      ...(reschedulePaidBy !== undefined && { reschedulePaidBy }),
    };

    let cart: Cart;
    let resolvedChannel: Channel | string;
    return this.#cartService.createCart(createCartQuery).pipe(
      switchMap((response: BaseResponse<Cart | null>) => this.#checkResponseData(response) as Observable<Cart>),
      switchMap((createdCart: Cart) =>
        this.#hasTargetManualPrices(targetSessionItemsByDatetime)
          ? this.#applyManualPrices(createdCart, partnerId, sessionItemsByDatetime)
          : of(createdCart),
      ),
      // The swapped cart starts with no answers group, so the collected answers are written before
      // prepareCart — otherwise a reschedule silently drops every booking-questions answer, which is
      // exactly the gap B2BO-7601 is about.
      switchMap((createdCart: Cart) =>
        this.#writeBookingQuestionsAnswers(createdCart.id, bookingQuestionsAnswers, channelId, true).pipe(map(() => createdCart)),
      ),
      switchMap((response: Cart) => {
        cart = response;
        resolvedChannel = channelId ?? channel ?? cart.channel!.id;
        const prepareCartQuery = {
          partnerId,
          cartId: cart.id!,
          userId: order.user!.id,
          planId: planId,
          placeId: placeId,
          onsiteSetupId: this.#onsiteSetupsStorageService.getConfiguration()?.id,
          channel: resolvedChannel,
        };
        return this.#cartService.prepareCart(prepareCartQuery).pipe(
          tap(prepareResponse =>
            this.#onsiteSetupRequiredApiErrorService.logPrepareCartResponseIfOnsiteSetupIdRequired(
              'reschedule_service_prepare_cart',
              prepareResponse,
              {
                cartId: cart.id,
                channel: resolvedChannel,
                partnerId,
                placeId,
                planId,
                userId: order.user!.id,
              },
            ),
          ),
        );
      }),
      switchMap((response: BaseResponse<Cart | null>) => this.#checkResponseData(response) as Observable<Cart>),
      switchMap(() =>
        cart.total?.amount === 0
          ? this.#createFreeOrderRescheduled(cart, {
              partnerId,
              cartId: '',
              userId: order.user!.id,
              cityId,
              planId,
              placeId,
              onsiteSetupId: this.#onsiteSetupsStorageService.getConfiguration()?.id,
              channel: resolvedChannel,
              user: order.user!,
              paymentType: PaymentType.FREE,
              paymentConfiguration: new PaymentConfiguration(),
            })
          : of(cart),
      ),
    );
  }

  #reschedulePayByPartner(
    planId: number,
    placeId: number,
    order: Order,
    sessionItems: SessionItem[],
    channelId?: string,
    bookingQuestionsAnswers?: ModificationCollectedBookingQuestionsAnswers,
  ): Observable<BaseResponse<OrderRescheduled>> {
    const onsiteSetupId = this.#onsiteSetupsStorageService.getConfiguration()?.id;
    const rescheduleOrder = (): Observable<BaseResponse<OrderRescheduled>> =>
      this.#rescheduleOrderService.rescheduleOrder(planId, placeId, order.id!, sessionItems, onsiteSetupId);

    if (bookingQuestionsAnswers === undefined) {
      return rescheduleOrder();
    }

    // This endpoint does not accept `booking_questions_answers` yet. Meanwhile the answers are
    // written to the *source* cart before the swap, betting that
    // the backend carries the answers group over to the new cart (FRM shipped copying
    // `answers_group_id` blindly, so it should). If it does not, this endpoint needs the payload:
    // `bookingQuestionsAnswers.compiled` is already in the `/modify/` full-final shape.
    return this.#writeBookingQuestionsAnswers(order.cart?.id, bookingQuestionsAnswers, channelId, false).pipe(switchMap(rescheduleOrder));
  }

  #showRescheduleModal(): Observable<RescheduleTypeEnum> {
    const dialog: DialogRef<RescheduleTypeEnum, RescheduleModalComponent> = this.#dialog.open(RescheduleModalComponent, {});
    return dialog.closed.pipe(switchMap(result => (result ? of(result) : throwError(() => new RescheduleModalCancelledError()))));
  }

  /**
   * No-op when booking questions were skipped or there is no cart to write to.
   *
   * The writer is resolved lazily on purpose: it pulls the booking-questions form-group graph, and
   * this service is `providedIn: 'root'` and injected by several flows that never collect answers.
   * Resolving it eagerly would push that cost — and its providers — onto all of them.
   */
  #writeBookingQuestionsAnswers(
    cartId: string | undefined | null,
    bookingQuestionsAnswers: ModificationCollectedBookingQuestionsAnswers | undefined,
    channelId: string | undefined,
    stopWhenRejected: boolean,
  ): Observable<unknown> {
    if (bookingQuestionsAnswers === undefined || cartId == null || cartId === '') {
      return of(null);
    }

    return this.#injector
      .get(RescheduleBookingQuestionsWriterService)
      .writeToCart(cartId, bookingQuestionsAnswers, channelId)
      .pipe(
        // A rejected answers group comes back as a response error, not a thrown one. Stop here, before
        // anything is charged or confirmed: going on charges the card and then fails the booking on the
        // missing answers, which fever2 refunds (B2C-11591).
        switchMap((response: BaseResponse<string | null>) => {
          if (response.error === null) {
            return of(response);
          }

          const error: BaseErrorResponse = response.error;
          this.#datadogLogService.logWarn('[Reschedule] Booking questions answers not saved', {
            cartId,
            code: error.code,
            userError: error.userError,
            stopped: stopWhenRejected,
          });

          // A partner-paid modify charges nobody, and its answers go to the source cart, which fever2 checks
          // against the source session types: keep going, as before, instead of blocking the modify.
          if (!stopWhenRejected) {
            return of(response);
          }

          return throwError(
            (): BaseErrorResponse => ({ ...error, message: error.userError ?? 'reschedule.error.bookingQuestionsAnswersNotSaved' }),
          );
        }),
      );
  }
}
