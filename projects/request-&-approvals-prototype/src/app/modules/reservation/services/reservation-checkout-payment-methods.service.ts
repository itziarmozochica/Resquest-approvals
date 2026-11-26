import { computed, DestroyRef, inject, Injectable, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationExtras, Router } from '@angular/router';

import { PaymentCheckout, PaymentCheckoutDepositET, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { StripeCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-stripe.model';
import { CreateCheckoutParam } from '@fz-original/app/app/models/payment.model';
import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { ClickReservationPayEvent } from '@fz-original/app/core/tracking/core/events/click-reservation-pay';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { Reservation } from '@fz-original/app/modules/reservation/models/reservation.model';
import { BookingQuestionsModalService } from '@fz-original/app/shared/booking-questions/booking-questions-modal.service';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { User } from '@fz-original/app/shared/models/user/user.model';
import { ErrorModalService } from '@fz-original/app/shared/services/error-modal/error-modal.service';
import { PartnerConfigService } from '@fz-original/app/shared/services/partner-config/partner-config.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { BookResultService } from '@fz-original/app/shared/services/payment-gateways/book-resut/book-result.service';
import { PaymentNotesService } from '@fz-original/app/shared/services/payment-gateways/payment-notes/payment-notes.service';
import { StripeError } from '@fz-original/app/shared/services/stripe/stripe.error';
import { StripeService } from '@fz-original/app/shared/services/stripe/stripe.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { StripeKeys } from '@fz-original/environments/environment.model';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateService } from '@ngx-translate/core';
import { catchError, defer, EMPTY, finalize, iif, map, mergeMap, Observable, of, Subject, switchMap, take, tap, throwError } from 'rxjs';

import { CardElement } from '@feverup/ts-stripe-sdk';

import { DistributorRouteService } from '../../../shared/services/distributor/distributor-route.service';
import { DISTRIBUTOR_PARTNER_NOT_SELECTED } from '../../../shared/services/distributor/distributor-target.service';
import { OnBehalfScopeStore } from '../../../shared/services/distributor/on-behalf-scope.store';
import { PaymentMethod as CheckoutPaymentMethod } from '../../box-office/checkout/models/payment-method.model';
import { PaymentType } from '../../box-office/checkout/models/payment-type.enum';
import { Purchase } from '../../box-office/checkout/models/purchase.model';
import { BusinessPaymentTypeEnum } from '../../settings/shared/models/business-payment-type.enum';
import { NewPaidReservation } from '../models/new-paid-reservation.model';
import { NewReservation } from '../models/new-reservation.model';
import { PaymentMethod as PaymentMethodEnum } from '../models/payment-methods.enum';
import { PaymentOption } from '../models/payment-option.enum';
import { ReservationFlowTypeEnum } from '../models/reservation_flow_type.enum';
import { reservationErrorCodes } from '../models/reservation-error-codes';
import { ReservationPaymentResponse } from '../models/reservation-payment-response.model';
import { depositPaymentCompleted } from '../tracking/events/deposit-payment-completed.event';
import { depositPaymentFailed } from '../tracking/events/deposit-payment-failed.event';
import { depositTrackingContextFromCart } from '../tracking/models/deposit-tracking-context.model';
import { DepositPaymentResultService } from './deposit-payment-result.service';
import { ReservationCheckoutStateService } from './reservation-checkout-state/reservation-checkout-state.service';
import { ReservationNavigateService } from './reservation-navigate.service';
import { ReservationsService } from './reservations.service';

/** Matches i18n keys like `errors.123` or `errors.foo.456` to resolve numeric code for fallback translation. */
const CHECKOUT_ERROR_MESSAGE_NUMERIC_CODE = /^errors\.(?:\w+\.)?(\d+)$/;

@Injectable()
export class ReservationCheckoutPaymentMethodsService {
  #bookingQuestionsModalService = inject(BookingQuestionsModalService);
  #bookResultService = inject(BookResultService);
  #depositPaymentResultService = inject(DepositPaymentResultService);
  #destroyRef = inject(DestroyRef);
  #errorModalService = inject(ErrorModalService);
  #checkoutPaymentIdle$ = new Subject<void>();
  #checkoutErrorMessage$ = new Subject<string>();
  #checkoutPaymentInProgress = false;
  #partnerConfigService = inject(PartnerConfigService);
  #partnerService = inject(PartnerService);
  #paymentNotesService = inject(PaymentNotesService);
  #paymentService = inject(PaymentService);
  #reservationCheckoutStateService = inject(ReservationCheckoutStateService);
  #reservationNavigateService = inject(ReservationNavigateService);
  readonly #reservationsService = inject(ReservationsService);
  readonly #router = inject(Router);
  #spinnerService = inject(SpinnerService);
  #stripeService = inject(StripeService);
  #toastService = inject(ToastService);

  /**
   * Translated error copy for the checkout's danger toast, handed to `ReservationCheckoutComponent` to render:
   * the copy can carry an anchor mid-clause, only a template renders that, and a service owns no template.
   *
   * ponytail: a workaround, not a pattern — do not extend it, and do not copy the hand-off into another service.
   * The fix is to stop producing view copy here at all: emit the `BaseErrorResponse` and let the container own
   * `#resolveCheckoutErrorToastMessage` and the rendering, so no part of a toast is this service's business.
   * Ceiling: a `TemplateRef` dies with the component that declared it, so a toast raised just before a navigation
   * can outlive its template and render an empty body — the one thing no amount of orchestration fixes. If that
   * bites, make the toast outlet own the rendered view; a component-based `show()` would only make raising a
   * toast from a service comfortable again.
   */
  readonly checkoutErrorMessage$ = this.#checkoutErrorMessage$.asObservable();
  readonly #fzTracking = inject(FzTrackingService);
  #trackingService = inject(TrackingService);
  #translate = inject(TranslateService);
  #distributorRoute = inject(DistributorRouteService);
  readonly #onBehalfScope = inject(OnBehalfScopeStore);
  #userService = inject(UserService);

  card: CardElement | null = null;
  cart = computed(() => this.#reservationCheckoutStateService.state().reservationCart);
  externalReservationId = computed(() => this.#reservationCheckoutStateService.state().externalReservationId);
  partner: Partner | null = null;
  paymentNote: string | null = null;
  paymentType: BusinessPaymentTypeEnum | null = null;
  plan = computed(() => this.#reservationCheckoutStateService.state().plan);
  reservation: Signal<Reservation | null> = computed(() => this.#reservationCheckoutStateService.state().reservation);
  user: User | null = null;

  constructor() {
    this.partner = this.#partnerService.getPartner();
    this.user = this.#userService.getUser();
  }

  /** Clears the stored card reference when leaving checkout without an active payment. */
  clearStaleCardReference(): void {
    this.card = null;
  }

  isCheckoutPaymentInProgress(): boolean {
    return this.#checkoutPaymentInProgress;
  }

  waitUntilCheckoutPaymentIdle(): Observable<void> {
    return this.#checkoutPaymentIdle$.pipe(take(1));
  }

  confirm(paymentType: BusinessPaymentTypeEnum, paymentNote: string | null = null): void {
    const cart = this.cart();
    const partner = this.partner;
    const user = this.user;
    const reservation = this.reservation();
    if (!cart || !partner || !user) {
      return;
    }
    if (this.#checkoutPaymentInProgress) {
      return;
    }
    this.paymentNote = paymentNote;
    const checkoutPaymentIdle$ = new Subject<void>();
    this.#checkoutPaymentInProgress = true;
    this.#checkoutPaymentIdle$ = checkoutPaymentIdle$;
    const pay$: () => Observable<BaseResponse<NewPaidReservation | NewReservation | ReservationPaymentResponse | null>> = () =>
      cart.total === undefined || cart.total?.amount === 0 ? this.#payFreeCart() : this.#payCart(paymentType);
    this.#handleReaskMandatoryPreBookingQuestions()
      .pipe(
        tap(() => this.#spinnerService.show()),
        switchMap(() => defer(pay$)),
        finalize(() => {
          // Clear in-progress before completing the idle Subject so subscribers that
          // observed isCheckoutPaymentInProgress() are guaranteed a next emission.
          this.#checkoutPaymentInProgress = false;
          this.#spinnerService.hide();
          checkoutPaymentIdle$.next();
          checkoutPaymentIdle$.complete();
        }),
        takeUntilDestroyed(this.#destroyRef),
        catchError(error => {
          if (error instanceof BaseResponse) {
            return of(error);
          }
          if (error instanceof StripeError) {
            return of(new BaseResponse(null, { code: error.code, error, message: error.message }));
          }
          return ErrorResponseUtils.getErrorResponse(error);
        }),
      )
      .subscribe((response: BaseResponse<NewPaidReservation | NewReservation | ReservationPaymentResponse> | BaseResponse<null>) => {
        const isDepositPayment = this.#reservationCheckoutStateService.state().selectedPaymentOption === PaymentOption.DEPOSIT;
        const paymentOption = this.#reservationCheckoutStateService.state().selectedPaymentOption ?? PaymentOption.FULL_PAYMENT;

        if (response.data !== null) {
          if (isDepositPayment) {
            this.#trackDepositPaymentCompleted(paymentType, paymentOption);
          }
          const reservationId = isDepositPayment ? reservation?.id : (response.data as NewReservation).id || reservation?.id;

          const navigationExtras: NavigationExtras = isDepositPayment
            ? {
                queryParams: {
                  channelId: reservation?.channelId,
                  cityId: reservation?.cityId,
                  planId: this.plan()?.id,
                  venueId: reservation?.placeId,
                },
                replaceUrl: true,
              }
            : {
                queryParamsHandling: 'merge',
                replaceUrl: true,
                state: {
                  plan: this.plan(),
                },
              };
          this.#reservationCheckoutStateService.updateStateProp('paymentDone', true);
          const route = isDepositPayment
            ? [this.#reservationNavigateService.getReservationListUrl(), reservationId]
            : ['/reservations', reservationId, 'order'];

          this.#router.navigate(route, navigationExtras);
          if ((response.data as NewPaidReservation).externalReservationIdPersistFailed) {
            this.#showExternalReservationIdErrorToast();
          }
        }
        if (response.error !== null) {
          if (isDepositPayment) {
            this.#trackDepositPaymentFailed(paymentType, paymentOption, response.error);
          }
          this.#showErrorModal(response.error);
        }
      });
  }

  saveCard(card: CardElement | null): void {
    this.card = card;
  }

  // Ten `errors.*` translations wrap the partner's support address in an anchor that sits mid-clause, e.g.
  // "… Please <a href='{{ supportEmailLink }}'>contact us</a> for help". Only a template can render that, and a
  // service owns none, so the message is handed to `ReservationCheckoutComponent`, which does.
  #addDangerCheckoutToast(message: string): void {
    this.#checkoutErrorMessage$.next(message);
  }

  #showExternalReservationIdErrorToast(): void {
    this.#toastService.add({
      autoHide: true,
      message: this.#translate.instant('reservation.externalReservationId.toast.errorMessage'),
      sentiment: AlertSentiment.danger,
      title: this.#translate.instant('reservation.externalReservationId.toast.errorTitle'),
    });
  }

  #addOtherPaymentNote(newPaidReservation: BaseResponse<NewPaidReservation>): Observable<BaseResponse<NewPaidReservation>> {
    const data = newPaidReservation.data;
    if (!data?.order?.id) return of(newPaidReservation);
    return this.#paymentNotesService
      .setNote(data.order.id, {
        message: this.paymentNote || '',
        title: this.#translate.instant('boxOffice.receiptDocument.title'),
      })
      .pipe(map(() => newPaidReservation));
  }

  #checkResponseData<T>(response: BaseResponse<T>): Observable<BaseResponse<T>> {
    return response?.data ? of(response) : throwError(response);
  }

  #createDelegatedOrderRequest(cart: Cart, paymentType: PaymentType): Observable<BaseResponse<NewPaidReservation>> {
    return this.#createOrderRequest(cart, paymentType, 'delegated');
  }

  #createDepositPaymentRequest<T extends PaymentCheckoutDepositET>(
    cart: Cart,
    paymentCheckout: T,
    paymentMethodFields: CheckoutPaymentMethod,
    options?: { b2bUserId?: number; stripeCreateCheckoutBody?: StripeCreateCheckoutBody },
  ): Observable<BaseResponse<NewReservation>> {
    const userId = cart.userId ?? this.cart()?.userId ?? null;
    if (userId == null || userId === 0) {
      return throwError(() => new Error('Missing cart user for deposit checkout'));
    }

    if (cart.channel === undefined) {
      return throwError(() => new Error('Missing cart channel for deposit checkout'));
    }

    const reservation = this.reservation();
    const partner = this.partner!;
    return this.#paymentService
      .createDepositCheckout({
        b2bUserId: options?.b2bUserId,
        cartId: cart.id ?? '',
        channel: cart.channel!.id,
        partnerId: partner.id,
        paymentCheckout,
        paymentMethod: paymentMethodFields,
        userId,
        ...(options?.stripeCreateCheckoutBody && { stripeCreateCheckoutBody: options.stripeCreateCheckoutBody }),
      })
      .pipe(
        switchMap(() =>
          this.#depositPaymentResultService.getDepositPaymentResult({
            b2bUserId: options?.b2bUserId,
            cart,
            partnerId: partner.id,
            paymentGateway: paymentCheckout,
          }),
        ),
        mergeMap(response => this.#checkResponseData(response)),
        map(
          () =>
            new BaseResponse<NewReservation>(
              {
                expiresAt: reservation?.expirationDate ?? null,
                id: reservation?.id ?? '',
                locator: reservation?.locator ?? '',
              },
              null,
            ),
        ),
      );
  }

  #createOrderRequest<T extends PaymentCheckoutET>(
    cart: Cart,
    paymentType: PaymentType,
    paymentCheckout: T,
    options?: { b2bUserId?: number; paymentTransactionId?: string },
  ): Observable<BaseResponse<NewPaidReservation>> {
    const cartRef = this.cart();
    const userId = cart.userId ?? cartRef?.userId ?? null;
    if (userId == null || userId === 0) {
      return throwError(() => new Error('Missing cart user for checkout; cannot create order without a valid userId')) as Observable<
        BaseResponse<NewPaidReservation>
      >;
    }
    const purchase = new Purchase(
      cart.id ?? cartRef?.id ?? '',
      userId,
      { paymentType: paymentType },
      cart.channel?.id ?? null,
      options?.paymentTransactionId,
    );
    const partner = this.partner!;
    const plan = this.plan();
    const reservation = this.reservation();
    return this.#paymentService
      .createCheckout({
        b2bUserId: options?.b2bUserId,
        cartId: cart.id ?? '',
        channel: cart.channel!.id,
        partnerId: partner.id,
        paymentCheckout,
        paymentMethod: purchase.paymentMethod,
        userId,
      } as CreateCheckoutParam)
      .pipe(
        switchMap(response => {
          return this.#bookResultService.getBookResult(
            paymentCheckout,
            partner.id,
            plan?.id ?? 0,
            reservation?.placeId ?? 0,
            cart,
            response,
          );
        }),
        mergeMap(response => this.#checkResponseData(response)),
        map(response => {
          const res = this.reservation();
          const data: NewPaidReservation = {
            expiresAt: res?.expirationDate ?? null,
            id: res?.id ?? '',
            locator: res?.locator ?? '',
            order: { id: response.data!.orderId ?? 0 },
            orderIds: response.data!.orderIds!,
          };
          return new BaseResponse<NewPaidReservation>(data, null);
        }),
      );
  }

  #createPartnerFreeOrderRequest(cart: Cart, reservation: Reservation): Observable<BaseResponse<NewPaidReservation>> {
    const partner = this.partner!;
    const planId = this.plan()?.id ?? 0;
    return this.#paymentService
      .createCheckout({
        cartId: cart.id ?? '',
        channel: cart.channel!.id,
        partnerId: partner.id,
        paymentCheckout: PaymentType.FREE,
        userId: (cart.userId ?? 0) as number,
      })
      .pipe(
        switchMap(response => {
          return this.#bookResultService.getBookResult(
            PaymentCheckout[PaymentCheckout.delegated] as PaymentCheckoutET,
            partner.id,
            planId,
            reservation.placeId,
            cart,
            response,
          );
        }),
        mergeMap(response => this.#checkResponseData(response)),
        map(response => {
          const data: NewPaidReservation = {
            expiresAt: reservation.expirationDate ?? null,
            id: reservation.id,
            locator: reservation.locator ?? '',
            order: { id: response.data!.orderId ?? 0 },
            orderIds: response.data!.orderIds!,
          };
          return new BaseResponse<NewPaidReservation>(data, null);
        }),
        catchError(error => of(error)),
      );
  }

  /**
   * @todo check on the existence of cart and reservation id.
   */
  #actingOrganizationId(cartId?: string | null): number | null {
    const onBehalfPair = this.#onBehalfScope.forCart(cartId);
    if (onBehalfPair !== null) {
      return onBehalfPair.distributorId;
    }
    if (this.#userService.getReservationFlowType() === ReservationFlowTypeEnum.on_behalf) {
      return null;
    }
    return this.#distributorRoute.pairTarget()?.distributorId ?? null;
  }

  /**
   * A distributor session with nothing chosen: mirrors the guard `payReservation` already applies before
   * it ever creates a payment intent. Without it, a Stripe call here falls through to the partner-rooted
   * URL with the distributor's own id standing in for the partner - after the token or order already
   * exists, with no way back.
   */
  #distributorPartnerNotChosen(): boolean {
    return this.#userService.getReservationFlowType() !== ReservationFlowTypeEnum.on_behalf && this.#distributorRoute.isBlocked();
  }

  #noPartnerChosen<T>(): Observable<BaseResponse<T>> {
    return of(new BaseResponse<T>(null, { code: DISTRIBUTOR_PARTNER_NOT_SELECTED, message: 'errors.generic' }));
  }

  #createPaymentStripeFlow(paymentIntentId: string): Observable<BaseResponse<NewPaidReservation>> {
    const cart = this.cart()!;
    const partner = this.partner!;
    const plan = this.plan();
    const reservation = this.reservation();
    const cartUserId = cart.userId;
    if (cartUserId == null || cartUserId === 0) {
      return throwError(() => new Error('Missing cart user for Stripe payment flow')) as Observable<BaseResponse<NewPaidReservation>>;
    }
    const isBusiness = this.#userService.isBusiness();
    const createCheckout$ = this.#paymentService.createCheckout({
      b2bUserId: isBusiness && this.user ? this.user.id : undefined,
      cartId: cart.id ?? '',
      channel: cart.channel!.id,
      partnerId: partner.id,
      paymentCheckout: 'stripe',
      paymentMethod: {
        paymentTransactionId: reservation?.id ?? '',
        paymentType: PaymentType.CARD,
      },
      stripeCreateCheckoutBody: { paymentIntentId },
      userId: cartUserId,
    });

    return createCheckout$.pipe(
      switchMap(() =>
        this.#stripeService.stripeLegacyOrderCreation(
          partner.id,
          cart.id ?? '',
          cartUserId,
          reservation?.id ?? '',
          paymentIntentId,
          this.#actingOrganizationId(cart.id),
        ),
      ),
      switchMap(response =>
        this.#bookResultService.getBookResult('stripe', partner.id, plan?.id ?? 0, reservation?.placeId ?? 0, cart, response),
      ),
      mergeMap(response => this.#checkResponseData(response)),
      map(response => {
        const res = this.reservation()!;
        const data: NewPaidReservation = {
          expiresAt: res.expirationDate ?? null,
          id: res.id,
          locator: res.locator ?? '',
          order: { id: response.data!.orderId ?? 0 },
          orderIds: response.data!.orderIds!,
        };
        return new BaseResponse<NewPaidReservation>(data, null);
      }),
      catchError(error => {
        this.#showErrorModal(error);
        return throwError(() => error);
      }),
    );
  }

  #getEffectiveCheckoutErrorCode(error: BaseErrorResponse): string | null | undefined {
    const code = error.code?.toString();
    const codeFromGroup = error.message?.match(CHECKOUT_ERROR_MESSAGE_NUMERIC_CODE)?.[1] ?? null;
    return codeFromGroup ?? code;
  }

  #handleReaskMandatoryPreBookingQuestions(): Observable<boolean> {
    const cart = this.cart();
    if (!cart) return of(true);
    return this.#bookingQuestionsModalService.shouldReaskMandatoryBookingQuestions(cart).pipe(
      switchMap(shouldReask => {
        if (shouldReask) {
          return this.#bookingQuestionsModalService.handlePreBookingQuestions(cart);
        }
        return of(true);
      }),
      switchMap(v => iif(() => v, of(v), EMPTY)),
    );
  }

  #isIndexedReservation(): boolean {
    return this.reservation() !== null && this.reservation()!.id !== undefined && this.reservation()!.id.length > 0;
  }

  #payCart(
    paymentType: BusinessPaymentTypeEnum,
  ): Observable<BaseResponse<NewPaidReservation | NewReservation | ReservationPaymentResponse>> {
    switch (paymentType) {
      case BusinessPaymentTypeEnum.INVOICING:
        return this.#payCartWithInvoicing();
      case BusinessPaymentTypeEnum.BALANCE:
        return this.#payCartWithBalance();
      case BusinessPaymentTypeEnum.RECEIPT_DOCUMENT:
        return this.#payCartWithDelegated(BusinessPaymentTypeEnum.RECEIPT_DOCUMENT, PaymentType.RECEIPT_DOCUMENT);
      case BusinessPaymentTypeEnum.FEVER_RECEIPT_DOCUMENT:
        return this.#payCartWithDelegated(BusinessPaymentTypeEnum.FEVER_RECEIPT_DOCUMENT, PaymentType.FEVER_RECEIPT_DOCUMENT);
      case BusinessPaymentTypeEnum.BANK_TRANSFER:
        return this.#payCartWithDelegated(BusinessPaymentTypeEnum.BANK_TRANSFER, PaymentType.BANK_TRANSFER);
      case BusinessPaymentTypeEnum.DELEGATED_CARD:
        return this.#payCartWithDelegated(BusinessPaymentTypeEnum.DELEGATED_CARD, PaymentType.CARD);
      case BusinessPaymentTypeEnum.CASH:
        return this.#payCartWithDelegated(BusinessPaymentTypeEnum.CASH, PaymentType.CASH);
      case BusinessPaymentTypeEnum.BON_ADMIN:
        return this.#payCartWithDelegated(BusinessPaymentTypeEnum.BON_ADMIN, PaymentType.BON_ADMIN);
      default: {
        const isCustomDelegated = (this.#partnerConfigService.config?.payments?.customMethods ?? []).some(
          m => m.gateway === 'delegated' && m.method === paymentType,
        );
        if (isCustomDelegated) {
          return this.#payCartWithDelegated(paymentType, paymentType as unknown as PaymentType);
        }
        return this.#payCartWithStripe() as Observable<BaseResponse<NewPaidReservation | ReservationPaymentResponse>>;
      }
    }
  }

  #payCartWithBalance(): Observable<BaseResponse<NewPaidReservation | NewReservation | ReservationPaymentResponse>> {
    const user = this.#userService.getUser();
    const cart = this.cart();
    const partner = this.partner;
    const plan = this.plan();
    const reservation = this.reservation();
    if (
      this.#isIndexedReservation() &&
      cart !== null &&
      cart.channel !== null &&
      cart.channel!.id.length > 0 &&
      cart.userId != null &&
      user !== null &&
      partner !== null &&
      reservation !== null
    ) {
      this.#sendReservationPayEvent(cart.id ?? '', plan?.id ?? 0, 'fever', PaymentMethodEnum.BALANCE, reservation.id);

      const isDepositPayment = this.#reservationCheckoutStateService.state().selectedPaymentOption === PaymentOption.DEPOSIT;
      const isBusiness = this.#userService.isBusiness();
      const b2bUserId = isBusiness ? user.id : undefined;
      if (isDepositPayment) {
        return this.#createDepositPaymentRequest(
          cart,
          'fever',
          {
            paymentTransactionId: reservation.id,
            paymentType: PaymentType.BALANCE,
          },
          { b2bUserId },
        );
      }

      return this.#createOrderRequest(cart, PaymentType.BALANCE, 'fever', {
        b2bUserId,
        paymentTransactionId: reservation.id,
      });
    } else if (!this.#isIndexedReservation() && cart !== null && user !== null && partner !== null) {
      this.#sendReservationPayEvent(cart.id ?? '', plan?.id ?? 0, 'fever', PaymentMethodEnum.BALANCE);
      return this.#reservationsService
        .buyNowReservation(
          partner.id,
          cart.id ?? '',
          user,
          {
            currency: cart.total?.currency,
            payment_gateway: 'fever',
            payment_method: PaymentMethodEnum.BALANCE,
          },
          this.externalReservationId(),
        )
        .pipe(map(r => r as BaseResponse<NewPaidReservation | ReservationPaymentResponse>));
    }
    return throwError(
      () => new Error('Missing required checkout data for balance payment (cart, partner, user, or reservation)'),
    ) as Observable<BaseResponse<NewPaidReservation | NewReservation | ReservationPaymentResponse>>;
  }

  #payCartWithDelegated(
    businessPaymentType: BusinessPaymentTypeEnum,
    paymentType: PaymentType,
  ): Observable<BaseResponse<NewPaidReservation | NewReservation>> {
    const cart = this.cart();
    const partner = this.partner!;
    const planId = this.plan()?.id ?? 0;
    if (this.reservation()?.id && cart) {
      const reservationId = this.reservation()!.id;
      const isDepositPayment = this.#reservationCheckoutStateService.state().selectedPaymentOption === PaymentOption.DEPOSIT;
      this.#sendReservationPayEvent(cart.id ?? '', planId, businessPaymentType, undefined, reservationId);
      if (isDepositPayment) {
        return this.#createDepositPaymentRequest(cart, 'delegated', {
          paymentType: paymentType,
        });
      }
      return this.#createDelegatedOrderRequest(cart, paymentType).pipe(
        switchMap((response: BaseResponse<NewPaidReservation>) =>
          this.paymentNote && response.data ? this.#addOtherPaymentNote(response) : of(response),
        ),
      );
    } else if (cart && this.user) {
      this.#sendReservationPayEvent(cart.id ?? '', planId, businessPaymentType);
      return this.#reservationsService
        .buyNowReservation(
          partner.id,
          cart.id ?? '',
          this.user,
          {
            currency: cart.total?.currency ?? undefined,
            payment_gateway: PaymentCheckout[PaymentCheckout.delegated],
            payment_intent_id: cart.id ?? '',
            payment_method: paymentType,
          },
          this.externalReservationId(),
        )
        .pipe(
          map(r => r as BaseResponse<NewPaidReservation>),
          switchMap(response => {
            return this.paymentNote && response.data ? this.#addOtherPaymentNote(response) : of(response);
          }),
        );
    }
    return throwError(() => new Error('Missing required checkout data for delegated payment (reservation or cart and user)')) as Observable<
      BaseResponse<NewPaidReservation>
    >;
  }

  #payCartWithInvoicing(): Observable<BaseResponse<NewPaidReservation | ReservationPaymentResponse>> {
    const cart = this.cart();
    const partner = this.partner;
    const user = this.user;
    const reservation = this.reservation();
    const planId = this.plan()?.id ?? 0;
    if (!partner?.id || !user?.id) {
      return throwError(() => new Error('Missing required checkout data for invoicing payment (partner or user)')) as Observable<
        BaseResponse<NewPaidReservation | ReservationPaymentResponse>
      >;
    }
    if (reservation?.id) {
      this.#sendReservationPayEvent(cart?.id ?? '', planId, 'fever', 'invoicing', reservation.id);
      return this.#reservationsService
        .payReservationWithInvoicing(partner.id, user.id, reservation.id)
        .pipe(map(r => r as BaseResponse<NewPaidReservation | ReservationPaymentResponse>));
    }

    if (!cart) {
      return throwError(() => new Error('Missing cart for invoicing payment')) as Observable<
        BaseResponse<NewPaidReservation | ReservationPaymentResponse>
      >;
    }
    this.#sendReservationPayEvent(cart.id ?? '', planId, 'fever', 'invoicing');
    return this.#reservationsService
      .buyNowReservation(
        partner.id,
        cart.id ?? '',
        user,
        {
          currency: cart.total?.currency,
          payment_gateway: 'fever',
          payment_method: 'invoicing',
        },
        this.externalReservationId(),
      )
      .pipe(map(r => r as BaseResponse<NewPaidReservation | ReservationPaymentResponse>));
  }

  #payCartWithStripe(): Observable<BaseResponse<NewPaidReservation | ReservationPaymentResponse>> {
    if (this.#distributorPartnerNotChosen()) {
      return this.#noPartnerChosen<NewPaidReservation | ReservationPaymentResponse>();
    }
    const cart = this.cart();
    const partner = this.partner;
    const user = this.user;
    const reservation = this.reservation();
    if (!cart?.id || !partner?.id || !user?.id || !cart.userId) {
      return throwError(
        () => new Error('Missing required checkout data for Stripe payment (cart, partner, user, or cart user)'),
      ) as Observable<BaseResponse<NewPaidReservation | ReservationPaymentResponse>>;
    }
    const currency = cart.total?.currency;
    if (!currency || typeof currency !== 'string' || currency.trim() === '') {
      return throwError(() => new Error('Missing or invalid cart total currency for Stripe payment')) as Observable<
        BaseResponse<NewPaidReservation | ReservationPaymentResponse>
      >;
    }

    const isDepositPayment = this.#reservationCheckoutStateService.state().selectedPaymentOption === PaymentOption.DEPOSIT;

    if (isDepositPayment) {
      return this.#payDepositWithStripe() as Observable<BaseResponse<NewPaidReservation | ReservationPaymentResponse>>;
    }

    const isManager = this.#userService.getReservationFlowType() === ReservationFlowTypeEnum.on_behalf;
    const isBusiness = this.#userService.isBusiness();
    const token$ = this.#stripeService.createPaymentToken(
      cart.id,
      partner.id,
      user.id,
      isManager,
      cart.channel?.id ?? null,
      this.#actingOrganizationId(cart.id),
    );
    const stripe$ = token$.pipe(
      switchMap((token: string) => this.#stripeService.confirmCardPayment(currency as keyof StripeKeys, token, this.card)),
    );

    const planId = this.plan()?.id ?? 0;
    if (reservation?.id) {
      this.#sendReservationPayEvent(cart.id ?? '', planId, 'stripe', 'card', reservation.id);

      return stripe$.pipe(
        switchMap(paymentIntentId =>
          isManager || isBusiness
            ? this.#createPaymentStripeFlow(paymentIntentId)
            : this.#reservationsService
                .payReservationWithStripe(partner.id, user.id, reservation.id, paymentIntentId)
                .pipe(map(r => r as BaseResponse<NewPaidReservation | ReservationPaymentResponse>)),
        ),
      );
    }

    this.#sendReservationPayEvent(cart.id ?? '', planId, 'stripe', 'card');
    // Buy Now, so no reservation exists yet: `reserve` is what creates it, and it is the only call that
    // carries the external locator. `#createPaymentStripeFlow` cannot stand in here even for a manager -
    // it is the pay-an-existing-reservation path, and with `reservation()` still null it would post an
    // empty `reservation_id` to order creation and then read the reservation back off that null.
    return stripe$.pipe(
      switchMap(paymentIntentId =>
        this.#reservationsService
          .buyNowReservation(
            partner.id,
            cart.id ?? '',
            user,
            {
              currency: cart.total?.currency,
              payment_gateway: 'stripe',
              payment_intent_id: paymentIntentId,
            },
            this.externalReservationId(),
          )
          .pipe(map(r => r as BaseResponse<NewPaidReservation | ReservationPaymentResponse>)),
      ),
    );
  }

  #payDepositWithStripe(): Observable<BaseResponse<NewPaidReservation | NewReservation | ReservationPaymentResponse>> {
    if (this.#distributorPartnerNotChosen()) {
      return this.#noPartnerChosen<NewPaidReservation | NewReservation | ReservationPaymentResponse>();
    }
    const cart = this.cart();
    const partner = this.partner;
    const user = this.user;
    const reservation = this.reservation();
    const deposit = cart?.deposit;

    if (!cart?.id || !partner?.id || !user?.id || !cart.userId || !deposit?.id) {
      return throwError(() => new Error('Missing required data for deposit Stripe payment'));
    }

    const currency = cart.total?.currency;
    if (!currency || typeof currency !== 'string' || currency.trim() === '') {
      return throwError(() => new Error('Missing or invalid cart total currency for Stripe deposit payment'));
    }

    const isManager = this.#userService.getReservationFlowType() === ReservationFlowTypeEnum.on_behalf;
    const isBusiness = this.#userService.isBusiness();
    const b2bUserId = isBusiness ? user.id : undefined;
    const planId = this.plan()?.id ?? 0;
    this.#sendReservationPayEvent(cart.id, planId, 'stripe', 'card', reservation?.id);

    return this.#stripeService
      .createDepositPaymentToken(deposit.id, partner.id, user.id, isManager, cart.channel?.id ?? null, this.#actingOrganizationId(cart.id))
      .pipe(
        switchMap(({ client_secret }) => this.#stripeService.confirmCardPayment(currency as keyof StripeKeys, client_secret, this.card)),
        switchMap(paymentIntentId =>
          this.#createDepositPaymentRequest(
            cart,
            'stripe',
            { paymentTransactionId: reservation?.id ?? '', paymentType: PaymentType.CARD },
            { b2bUserId, stripeCreateCheckoutBody: { paymentIntentId } },
          ),
        ),
      );
  }

  #payFreeCart(): Observable<BaseResponse<NewPaidReservation | ReservationPaymentResponse | null>> {
    const plan = this.plan();
    const reservation = this.reservation();
    const cart = this.cart();
    const partner = this.partner;
    const user = this.user;

    if (!cart?.id || !plan?.id || !partner?.id || !user?.id) {
      return of(new BaseResponse(null, null));
    }

    if (reservation?.id) {
      this.#sendReservationPayEvent(cart.id, plan.id, 'free', undefined, reservation.id);

      if (!this.#userService.isBusiness()) {
        return this.#createPartnerFreeOrderRequest(cart, reservation);
      }
      return this.#reservationsService.payFreeReservation(partner.id, user.id, reservation.id);
    }

    this.#sendReservationPayEvent(cart.id, plan.id, 'free');
    return this.#reservationsService.buyNowReservation(
      partner.id,
      cart.id,
      user,
      { payment_gateway: 'free' },
      this.externalReservationId(),
    );
  }

  #resolveCheckoutErrorToastMessage(
    error: BaseErrorResponse,
    errorForModal: BaseErrorResponse,
    effectiveCode: string | null | undefined,
  ): string {
    const translateParams = { supportEmailLink: this.#partnerConfigService.supportEmailLink };
    const messageKey = error.message ?? '';

    if (messageKey.startsWith('errors.')) {
      const direct = this.#translate.instant(messageKey, translateParams);
      if (direct !== messageKey) {
        return direct;
      }
    }

    if (effectiveCode) {
      const translationKey = `errors.${effectiveCode}`;
      const translated = this.#translate.instant(translationKey, translateParams);
      const rawMessage = error.message ?? errorForModal.message ?? translationKey;
      return translated !== translationKey
        ? translated
        : rawMessage === 'Failed to create payment token'
          ? this.#translate.instant('errors.generic')
          : rawMessage;
    }

    return this.#errorModalService.buildErrorMessages({ error: errorForModal }).join(', ');
  }

  #rethrowIfCheckoutError926(error: BaseErrorResponse): void {
    if (error.code === 926 || error.code === '926') {
      throw error;
    }
  }

  #sendReservationPayEvent(
    cartId: string,
    planId: number | undefined,
    paymentProvider: string,
    paymentMethod?: string,
    reservationId?: string,
  ): void {
    if (planId !== undefined) {
      this.#trackingService.track(
        new ClickReservationPayEvent({
          cart_id: cartId,
          payment_method: paymentMethod,
          payment_provider: paymentProvider,
          plan_id: planId,
          reservation_id: reservationId,
        }),
      );
    }
  }

  #showErrorModal(error: BaseErrorResponse): void {
    this.#rethrowIfCheckoutError926(error);
    if (this.#tryToastReservationNotImplementedForProvider(error)) {
      return;
    }
    this.#throwIfNestedIntegrationCheckoutError(error);

    const errorForModal = this.#toCheckoutErrorForModalPayload(error);
    const effectiveCode = this.#getEffectiveCheckoutErrorCode(error);
    const message = this.#resolveCheckoutErrorToastMessage(error, errorForModal, effectiveCode);
    this.#addDangerCheckoutToast(message);
  }

  #throwIfNestedIntegrationCheckoutError(error: BaseErrorResponse): void {
    const nestedError = error.error;
    if (nestedError === null || typeof nestedError !== 'object' || (nestedError as { name?: unknown }).name !== 'IntegrationError') {
      return;
    }
    this.#toastService.add({ message: 'reservation.checkout.error', sentiment: AlertSentiment.danger });
    const message =
      nestedError instanceof Error
        ? nestedError.message
        : typeof (nestedError as { message?: unknown }).message === 'string'
          ? (nestedError as { message: string }).message
          : '';
    throw new Error(message);
  }

  #toCheckoutErrorForModalPayload(error: BaseErrorResponse): BaseErrorResponse {
    const nested = error.error;
    const stripeFromNested = nested instanceof StripeError ? nested : null;
    if (stripeFromNested != null) {
      return { code: stripeFromNested.code ?? 'stripe_error', message: stripeFromNested.message };
    }
    if (error instanceof StripeError) {
      return { code: error.code ?? 'stripe_error', message: error.message };
    }
    return error;
  }

  #tryToastReservationNotImplementedForProvider(error: BaseErrorResponse): boolean {
    if (error.code?.toString() !== reservationErrorCodes.reservationNotImplementedForProvider) {
      return false;
    }
    this.#toastService.add({
      message: this.#translate.instant('errors.reservationNotImplementedForProvider.body'),
      sentiment: AlertSentiment.danger,
    });
    return true;
  }

  #trackDepositPaymentCompleted(paymentType: BusinessPaymentTypeEnum, paymentOption: PaymentOption): void {
    const cart = this.cart();
    const reservation = this.reservation();
    if (!cart || !reservation?.id) {
      return;
    }
    this.#fzTracking.track(
      depositPaymentCompleted({
        ...depositTrackingContextFromCart(cart),
        cartId: cart.id ?? '',
        paymentMethod: paymentType,
        paymentOption,
        reservationId: reservation.id,
      }),
    );
  }

  #trackDepositPaymentFailed(paymentType: BusinessPaymentTypeEnum, paymentOption: PaymentOption, error: BaseErrorResponse): void {
    const cart = this.cart();
    const reservation = this.reservation();
    if (!cart || !reservation?.id) {
      return;
    }

    const nestedError = error.error;
    const errorStatus =
      nestedError !== null && typeof nestedError === 'object' && 'depositPaymentResultStatus' in nestedError
        ? String((nestedError as { depositPaymentResultStatus: unknown }).depositPaymentResultStatus)
        : null;

    this.#fzTracking.track(
      depositPaymentFailed({
        ...depositTrackingContextFromCart(cart),
        cartId: cart.id ?? '',
        errorCode: error.code ?? null,
        errorStatus,
        paymentMethod: paymentType,
        paymentOption,
        reservationId: reservation.id,
      }),
    );
  }
}
