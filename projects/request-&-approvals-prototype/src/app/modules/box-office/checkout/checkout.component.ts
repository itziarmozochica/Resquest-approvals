import { Location } from '@angular/common';
import { Component, DestroyRef, inject, Injector, OnInit, Signal, signal, ViewChild, WritableSignal } from '@angular/core';
import { outputToObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';

import { AdyenErrorCode } from '@fz-original/app/app/enums/payment-checkout-adyen.enum';
import { RazorpayErrorCode } from '@fz-original/app/app/enums/payment-checkout-razorpay.enum';
import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { AdyenCheckout, AdyenCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import { RazorpayCheckout } from '@fz-original/app/app/models/payment-checkout-razorpay.model';
import { SquareCheckout, SquareCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-square.model';
import { CreateCheckoutParam, PaymentCheckoutTransaction } from '@fz-original/app/app/models/payment.model';
import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { PaymentCheckoutAdyenService } from '@fz-original/app/app/services/payment-checkout-adyen/payment-checkout-adyen.service';
import { PaymentCheckoutSquareService } from '@fz-original/app/app/services/payment-checkout-square/payment-checkout-square.service';
import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { PaymentMethodOption } from '@fz-original/app/modules/box-office/checkout/models/payment-method.model';
import { OnsiteSetupModalComponent } from '@fz-original/app/modules/box-office/ticketing/components/onsite-setup-modal/onsite-setup-modal.component';
import { isSoldOutSessionError } from '@fz-original/app/shared/models/session/session-error-code';
import { SearchBarService } from '@fz-original/app/shared/search-bar/service/search-bar.service';
import { ErrorModalService } from '@fz-original/app/shared/services/error-modal/error-modal.service';
import {
  PaymentMethodDisplay,
  resolvePaymentMethodLabel,
} from '@fz-original/app/shared/utils/payment-method-display/payment-method-display.util';
import { environment } from '@fz-original/environments/environment';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, merge, Observable, of, throwError } from 'rxjs';
import { catchError, filter, finalize, map, mergeMap, shareReplay, startWith, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import { CreateCheckoutEvent } from '../../../core/tracking/core/events/create-checkout';
import { CreateOrderEvent } from '../../../core/tracking/core/events/create-order';
import { getMultiplanCartFlags } from '../../../core/tracking/core/events/create-order.util';
import { ScreenTypeaheadInput } from '../../../core/tracking/core/events/select-option-typeahead';
import { SplitPaymentStartedEvent } from '../../../core/tracking/core/events/split-payment-started';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { MessageModalComponent } from '../../../shared/components/message-modal/message-modal.component';
import { PlanDetailCardComponent } from '../../../shared/components/plan-detail-card/plan-detail-card.component';
import { SelectOption } from '../../../shared/layout/filters/select/select.interface';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { BaseResponse } from '../../../shared/models/base-response';
import { Cart } from '../../../shared/models/cart/cart.model';
import { Order } from '../../../shared/models/order/order.model';
import { Partner } from '../../../shared/models/partner/partner.model';
import { Plan } from '../../../shared/models/plan/plan.model';
import { OptimizelyService } from '../../../shared/optimizely/optimizely.service';
import { SearchFilter } from '../../../shared/search-bar/models/search-filter.model';
import { CartTimingService } from '../../../shared/services/cart-timing/cart-timing.service';
import { DiscardCartQuery } from '../../../shared/services/cart/discard-cart-query';
import { CheckoutLoggerService } from '../../../shared/services/checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '../../../shared/services/checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '../../../shared/services/checkout-logger/models/checkout-stage.enum';
import { DualScreenStorageService } from '../../../shared/services/dual-screen/dual-screen-storage.service';
import { OrderNotesService } from '../../../shared/services/order/order-notes/order-notes.service';
import { PartnerConfigService } from '../../../shared/services/partner-config/partner-config.service';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { BookResultService } from '../../../shared/services/payment-gateways/book-resut/book-result.service';
import { BookResult } from '../../../shared/services/payment-gateways/book-resut/models/book-result-status.model';
import { PriceViewerPrinterServiceManager } from '../../../shared/services/price-viewer/price-viewer.service';
import {
  CountriesWithCartaValorada,
  CountriesWithIcCard,
  CountriesWithIdPayment,
  CountriesWithPix,
  CountriesWithQuicpay,
  CountriesWithSimplePaymentsKr,
  CountriesWithSquareQr,
  CountriesWithUpi,
} from '../../../shared/services/purchase/purchase.service';
import { Channel } from '../../../shared/services/session-availability/channel.enum';
import { UserService } from '../../../shared/services/user/user.service';
import { ScrollUtils } from '../../../shared/utils/scroll.utils';
import { OboSecondScreenDataService } from '../obo-second-screen/services/obo-second-screen-data.service';
import {
  WAITING_PAYMENT_MODAL_DATA,
  WaitingForPaymentModalComponent,
} from '../shared/components/waiting-payment-modal/waiting-payment-modal.component';
import { OnsiteSetup } from '../shared/models/onsite-setup';
import { CashRegisterCartDiscardService } from '../shared/services/cash-register-cart-discard/cash-register-cart-discard.service';
import { CheckoutUserStorageService } from '../shared/services/checkout-user-storage/checkout-user-storage.service';
import { EfrUserMessageModalService } from '../shared/services/efsta-fiscal/efr-user-message-modal.service';
import { shouldWatchAsyncFiscalFailure } from '../shared/services/efsta-fiscal/efsta-fiscal.util';
import { FranceAsyncFiscalFailureService } from '../shared/services/france-async-fiscal/france-async-fiscal-failure.service';
import { readFreeCheckoutFiscalWatch } from '../shared/services/france-async-fiscal/free-checkout-fiscal-watch.util';
import { OnsiteSetupsStorageService } from '../shared/services/onsite-setups/onsite-setups-storage.service';
import { PaymentConfiguration } from '../shared/services/payment-configuration.model';
import {
  AvailablePaymentMethods,
  BoxOfficePaymentMethodsService,
} from '../shared/services/payment-methods/box-office-payment-methods.service';
import { PaymentConfigStorageService } from '../shared/services/payment/payment-config-storage.service';
import {
  SplitPaymentProgressParams,
  SplitPaymentProgressService,
} from '../shared/services/split-payment-progress/split-payment-progress.service';
import { SplitPaymentRetryUiService } from '../shared/services/split-payment/split-payment-retry-ui.service';
import { PaymentMethod } from './models/payment-method.model';
import { PaymentProvider } from './models/payment-provider.enum';
import { PaymentType } from './models/payment-type.enum';
import { Purchase } from './models/purchase.model';

@Component({
  selector: 'app-checkout',
  standalone: false,
  styleUrls: ['../../../../theme/general/_box-office.scss', './checkout.component.scss'],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements OnInit {
  #breakpointStateService = inject(BreakpointStateService);
  #cartTimingService = inject(CartTimingService);
  readonly #cashRegisterCartDiscardService = inject(CashRegisterCartDiscardService);
  #checkoutUserStorageService = inject(CheckoutUserStorageService);
  #datadogLogService = inject(DatadogLogService);
  #destroyRef = inject(DestroyRef);
  #errorModalService = inject(ErrorModalService);
  #injector = inject(Injector);
  #oboSecondScreenDataService = inject(OboSecondScreenDataService);
  #boxOfficePaymentMethodsService = inject(BoxOfficePaymentMethodsService);
  #partnerConfigService = inject(PartnerConfigService);
  #paymentCheckoutAdyenService = inject(PaymentCheckoutAdyenService);
  #paymentService = inject(PaymentService);
  #searchBarService = inject(SearchBarService);
  #splitPaymentProgressService = inject(SplitPaymentProgressService);
  #splitPaymentRetryUiService = inject(SplitPaymentRetryUiService);
  @ViewChild('planDetailCardRef') planDetailCardRef?: PlanDetailCardComponent;
  deviceSelectionInvalid = false;
  cardPaymentAttemptedWithoutDevice = false;
  readonly #efrUserMessageModalService = inject(EfrUserMessageModalService);
  readonly #franceAsyncFiscalFailureService = inject(FranceAsyncFiscalFailureService);
  #franceAsyncFiscalWatchCartId: string | null = null;
  #declarativeAvailableMethods: ReadonlySet<PaymentType> | null = null;
  #declarativeDisplay: ReadonlyMap<PaymentType, PaymentMethodDisplay> = new Map();

  private selectedCity: SelectOption;
  private selectedPlace: SelectOption;
  private paymentTransactionId: string;
  private paymentProvider: PaymentProvider;
  private storedPaymentConfig: PaymentConfiguration;
  private cartAmountIsZero: boolean;
  private paymentInProgress: boolean;
  private isCancellingPayment: boolean;
  selectedPlan: SelectOption;
  partner: Partner | null = null;
  closeIt: WritableSignal<{ timestamp: number }> = signal<{ timestamp: number }>({ timestamp: 0 });
  cart: Cart = null;
  purchase: Purchase = null;
  plan: Plan = null;
  userId: number | undefined;
  locale: string;
  screen = ScreenTypeaheadInput;
  isApplyingCoupon = false;
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  countriesWithPayNow: Array<string> = ['SG'];
  paymentConfiguration: PaymentConfiguration | null = null;
  paymentMethods: Map<string, PaymentMethodOption>;
  isPaymentConfigurationReady = false;
  reservationId: string | null = this.route.snapshot.data.checkoutData.reservationId;
  paymentTypeEnum = PaymentType;
  cashCalculatorCashReceived: number | null = null;
  channelId: string = Channel.BoxOffice;
  receiptDocumentMessage: string;
  waitingForPaymentModal: NgbModalRef;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modalService: NgbModal,
    private translate: TranslateService,
    private trackingService: TrackingService,
    private spinnerService: SpinnerService,
    private partnerService: PartnerService,
    private paymentConfigStorageService: PaymentConfigStorageService,
    private optimizelyService: OptimizelyService,
    private bookResultService: BookResultService,
    private location: Location,
    private onsiteSetupsStorageService: OnsiteSetupsStorageService,
    private priceViewerService: PriceViewerPrinterServiceManager,
    private checkoutLogger: CheckoutLoggerService,
    private userService: UserService,
    private dualScreenStorageService: DualScreenStorageService,
    private orderNotesService: OrderNotesService,
  ) {
    this.locale = this.translate.currentLang;
    this.#destroyRef.onDestroy(() => {
      if (this.shouldResetOboSecondScreenToStandBy) {
        this.#oboSecondScreenDataService.resetCart();
      }
    });
  }
  isInOverrideZone = false;
  selectedOnsiteSetup: OnsiteSetup | null = null;
  shouldResetOboSecondScreenToStandBy = true;
  isRescheduleFlow: boolean;
  private rescheduleOrderId: number | null;

  cancel(): void {
    this.showWarningDiscardOrderModal();
  }

  confirm(): void {
    if (this.paymentInProgress || this.#franceAsyncFiscalFailureService.isHandlingAnyFiscalFailure()) {
      return;
    }

    if (this.#shouldHighlightDeviceSelector()) {
      this.cardPaymentAttemptedWithoutDevice = true;
      this.deviceSelectionInvalid = true;
      this.planDetailCardRef?.focusDeviceSelect();
      return;
    }

    this.paymentInProgress = true;
    this.isCancellingPayment = false;
    const paymentType: PaymentType = this.purchase?.paymentMethod.paymentType;
    const isDelegatedMethod = this.#boxOfficePaymentMethodsService.isDelegatedMethod(this.selectedOnsiteSetup, paymentType);

    this.checkoutLogger.info(
      'Going to confirm the cart',
      this.getCurrentLoggerContext(CheckoutStageEnum.CREATE_ORDER, {
        configApplicable: this.storedPaymentConfig?.isConfigApplicable(),
        containsAdyenConfiguration: !!this.storedPaymentConfig?.adyenConfiguration,
        containsSquareConfiguration: !!this.storedPaymentConfig?.squareConfiguration,
        paymentType: paymentType,
      }),
      { cartId: this.cart?.id },
    );
    this.spinnerService.show();
    if (
      isDelegatedMethod ||
      this.cartAmountIsZero ||
      !this.storedPaymentConfig?.isConfigApplicable() // this line should be removed
    ) {
      this.createFreeOrDelegatedOrder(this.cart);
      return;
    } else if (this.storedPaymentConfig?.adyenConfiguration) {
      this.createAdyenOrder(this.cart, paymentType);
    } else if (this.storedPaymentConfig?.razorpayConfiguration) {
      this.createRazorpayOrder(this.cart, paymentType);
    } else if (this.storedPaymentConfig?.squareConfiguration) {
      this.createSquareOrder(this.storedPaymentConfig, paymentType);
    } else if (this.storedPaymentConfig?.payhereConfiguration) {
      this.createPayhereOrder(this.cart, this.purchase.paymentMethod.paymentType);
    }
  }

  goBack(): void {
    // TODO: Change the method name to align with what it really doing
    this.discardCartAndNavigate();
  }

  hasAllMandatoryFilters(hasDataChange: boolean): void {
    this.#searchBarService.closeOnMobileWhenAllMandatoryFilters(hasDataChange, this.isMobile, this.closeIt);
  }

  loadNewSearch(filters: SearchFilter): void {
    this.partner = filters.partner || this.partnerService.getPartner();
    this.selectedCity = filters.selectedCity;
    this.selectedPlan = filters.selectedPlan;
    this.selectedPlace = filters.selectedPlace;
    this.resetScroll();
  }

  navigateToLastPage(): void {
    this.location.back();
  }

  ngOnInit(): void {
    this.isInOverrideZone = this.route.snapshot.data.checkoutData.isInOverrideZone;
    this.rescheduleOrderId = this.route.snapshot.data.checkoutData.rescheduleOrderId;
    this.isRescheduleFlow = this.rescheduleOrderId !== null;
    this.cart = this.route.snapshot.data.checkoutData.cart;
    this.cartAmountIsZero = this.cart.total.amount === 0;
    this.plan = this.route.snapshot.data.checkoutData.plan;
    this.userId =
      this.route.snapshot.data.checkoutData.userId ??
      this.#checkoutUserStorageService.getUserIdForCart(this.cart.id) ??
      environment.OBO.GENERIC_USER_ID;
    this.partner = this.partnerService.getPartner();

    this.#loadSelectedOnsiteSetup();
    this.#setPaymentConfigurationFromSelectedOnsiteSetup();
    this.isPaymentConfigurationReady = true;

    this.priceViewerService.showTotal(this.onsiteSetupsStorageService.getConfiguration(), this.cart.total.currency, this.cart.total.amount);
    this.paymentConfigStorageService
      .listenStorage()
      .pipe(startWith(this.paymentConfigStorageService.getConfiguration()), takeUntilDestroyed(this.#destroyRef))
      .subscribe(configuration => {
        this.storedPaymentConfig = configuration;
        this.updatePaymentMethodAllowed(this.partner.countryCode);
      });
  }

  onReceiptDocumentChange(receiptDocumentMessage: string): void {
    this.receiptDocumentMessage = receiptDocumentMessage;
  }

  updateCart(cart: Cart): void {
    this.cart = cart;
    this.updateOboSecondScreenCart();
    this.updatePaymentMethodAllowed(this.partner.countryCode);
  }

  updateOboSecondScreenCart(): void {
    this.#oboSecondScreenDataService.setCart(this.cart);
  }

  updateOboSecondScreenPayment() {
    this.#oboSecondScreenDataService.finishPayment();
  }

  updatePaymentMethod(paymentMethod: PaymentMethod): void {
    if (paymentMethod) {
      this.checkoutLogger.info(
        'Selected payment method',
        this.getCurrentLoggerContext(CheckoutStageEnum.CHECKOUT, {
          paymentType: paymentMethod.paymentType,
        }),
        { cartId: this.cart?.id },
      );
    } else {
      this.checkoutLogger.info('Deselect payment method', this.getCurrentLoggerContext(CheckoutStageEnum.CHECKOUT), {
        cartId: this.cart?.id,
      });
    }
    if (paymentMethod?.paymentType !== PaymentType.CASH) {
      this.cashCalculatorCashReceived = null;
    }
    this.purchase = this.createPurchase(paymentMethod);
  }

  #cancelCancellablePayment(paymentCheckout: PaymentCheckoutET): Observable<undefined> {
    this.isCancellingPayment = true;
    const cartId = this.cart.id;
    if (cartId !== undefined) {
      this.#franceAsyncFiscalFailureService.stopWatchingCart(cartId);
    }
    this.#datadogLogService.logInfo(`[BoxOffice] Cancelling cart ${this.cart.id} with transaction id ${this.paymentTransactionId}`, {
      cart: this.cart,
      transactionId: this.paymentTransactionId,
    });
    const isSplitAdyen =
      this.purchase?.paymentMethod?.paymentType === PaymentType.CARD_SPLIT &&
      paymentCheckout === (PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET);
    const cancel$ = this.#paymentService
      .cancelPayment({
        currency: this.cart.total?.currency ?? '',
        partnerId: this.partner.id,
        paymentCheckout,
        placeId: this.#resolvePaymentPlaceId(),
        planId: this.selectedPlan.id,
        transactionId: this.paymentTransactionId,
      })
      .pipe(
        mergeMap(() =>
          isSplitAdyen
            ? this.#paymentCheckoutAdyenService.cancelHadCompletedPayments$.pipe(
                take(1),
                mergeMap(hadCompletedPayments =>
                  hadCompletedPayments
                    ? throwError(
                        () =>
                          new BaseResponse(null, {
                            errorCode: AdyenErrorCode.CancelledTransaction,
                            message: `errors.adyen.${AdyenErrorCode.CancelledTransaction}`,
                          }),
                      )
                    : of(undefined),
                ),
              )
            : of(undefined),
        ),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    cancel$
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        catchError(() => EMPTY),
        finalize(() => this.#closeWaitingForPaymentModal()),
      )
      .subscribe();

    return cancel$.pipe(takeUntilDestroyed(this.#destroyRef));
  }

  #startFranceAsyncFiscalWatch(paymentCheckout: PaymentCheckoutET, blockBooker?: boolean, blocksPurchaseOnFailure?: boolean): void {
    const cartId = this.cart.id;
    if (cartId === undefined || !shouldWatchAsyncFiscalFailure(paymentCheckout, blockBooker, blocksPurchaseOnFailure)) {
      return;
    }
    this.#franceAsyncFiscalWatchCartId = cartId;
    this.#franceAsyncFiscalFailureService
      .watchForFiscalCancellation({
        cartId,
        parentTransactionId: this.paymentTransactionId,
        partnerId: this.partner.id,
        paymentCheckout,
        blockBooker,
        blocksPurchaseOnFailure,
      })
      .pipe(
        catchError(() => EMPTY),
        filter(fiscalFailureHandled => fiscalFailureHandled),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.#closeWaitingForPaymentModal();
        this.priceViewerService.clear(this.onsiteSetupsStorageService.getConfiguration());
        this.navigateToLastPage();
      });
  }

  /**
   * The watch has no terminal success status of its own — the session is already `completed` when the
   * booker is blocked — so a sale that books fine has to stop it explicitly, or the poller keeps
   * hitting the status endpoint for its whole 5-minute budget. A no-op while a failure is being
   * handled, so it cannot cut the cashier modal short.
   */
  #stopFranceAsyncFiscalWatchOnCompletedSale(): void {
    const cartId = this.#franceAsyncFiscalWatchCartId;
    if (cartId === null) {
      return;
    }
    this.#franceAsyncFiscalWatchCartId = null;
    this.#franceAsyncFiscalFailureService.stopWatchingCart(cartId);
  }

  /**
   * The classic delegated checkout never asks for a split session, so fever2 answers without a
   * `transaction_id`. Falling back to `cart.id` would point the watch at a payments-status route
   * that only accepts a session id: every poll 404s, the failure is never seen and the cart id
   * stays in flight for the whole 5-minute budget. Without a session there is nothing to watch.
   */
  #applyDelegatedCheckoutResponse(response: unknown, cartId: string | undefined): void {
    const delegatedCheckout = PaymentCheckout[PaymentCheckout.delegated] as PaymentCheckoutET;
    const blockBooker = this.#extractDelegatedBlockBooker(response);
    const blocksPurchaseOnFailure = this.#extractDelegatedBlocksPurchaseOnFailure(response);
    const transactionId = this.#extractDelegatedTransactionId(response);
    if (transactionId === null) {
      if (shouldWatchAsyncFiscalFailure(delegatedCheckout, blockBooker, blocksPurchaseOnFailure)) {
        this.#datadogLogService.logWarn('[BoxOffice] FR async fiscal watch skipped: delegated checkout returned no transaction id', {
          cartId,
        });
      }
      return;
    }
    this.paymentTransactionId = transactionId;
    this.#startFranceAsyncFiscalWatch(delegatedCheckout, blockBooker, blocksPurchaseOnFailure);
  }

  /**
   * A €0 cart is settled without a payment, so the only handle on its async fiscalization outcome is
   * the split session fever2 creates for it, returned as `split_session_id`. Until that id is in the
   * response there is nothing to watch: `cart.id` is not a session and every poll would 404.
   */
  #applyFreeCheckoutResponse(response: unknown, cartId: string | undefined): void {
    const freeCheckout = PaymentCheckout[PaymentCheckout.free] as PaymentCheckoutET;
    const { blockBooker, blocksPurchaseOnFailure, splitSessionId } = readFreeCheckoutFiscalWatch(response);
    if (splitSessionId === undefined) {
      if (shouldWatchAsyncFiscalFailure(freeCheckout, blockBooker, blocksPurchaseOnFailure)) {
        this.#datadogLogService.logWarn('[BoxOffice] FR async fiscal watch skipped: free checkout returned no split session id', {
          cartId,
        });
      }
      return;
    }
    this.paymentTransactionId = splitSessionId;
    this.#startFranceAsyncFiscalWatch(freeCheckout, blockBooker, blocksPurchaseOnFailure);
  }

  /**
   * Best-effort field from a loosely typed checkout response (delegated returns `unknown`):
   * the delegated service wraps the raw payload in a `BaseResponse`, whose `data` carries the
   * backend's snake_case keys, so both the wrapper and both spellings are probed.
   */
  #extractDelegatedTransactionId(response: unknown): string | null {
    const direct = this.#readDelegatedTransactionId(response);
    if (direct !== null) {
      return direct;
    }
    const data = response !== null && typeof response === 'object' ? (response as { data?: unknown }).data : undefined;
    return this.#readDelegatedTransactionId(data);
  }

  #extractDelegatedBlockBooker(response: unknown): boolean | undefined {
    const direct = this.#readDelegatedOptionalTrue(response, 'blockBooker', 'block_booker');
    if (direct !== undefined) {
      return direct;
    }
    const data = response !== null && typeof response === 'object' ? (response as { data?: unknown }).data : undefined;
    return this.#readDelegatedOptionalTrue(data, 'blockBooker', 'block_booker');
  }

  #extractDelegatedBlocksPurchaseOnFailure(response: unknown): boolean | undefined {
    const direct = this.#readDelegatedOptionalTrue(response, 'blocksPurchaseOnFailure', 'blocks_purchase_on_failure');
    if (direct !== undefined) {
      return direct;
    }
    const data = response !== null && typeof response === 'object' ? (response as { data?: unknown }).data : undefined;
    return this.#readDelegatedOptionalTrue(data, 'blocksPurchaseOnFailure', 'blocks_purchase_on_failure');
  }

  #readDelegatedTransactionId(source: unknown): string | null {
    if (source === null || source === undefined || typeof source !== 'object') {
      return null;
    }
    const record = source as Record<string, unknown>;
    const candidate = record['transactionId'] ?? record['transaction_id'];
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
  }

  #readDelegatedOptionalTrue(source: unknown, camelKey: string, snakeKey: string): boolean | undefined {
    if (source === null || source === undefined || typeof source !== 'object') {
      return undefined;
    }
    const record = source as Record<string, unknown>;
    return record[camelKey] === true || record[snakeKey] === true ? true : undefined;
  }

  #closeWaitingForPaymentModal(): void {
    if (this.waitingForPaymentModal !== null) {
      this.waitingForPaymentModal.close();
    }
  }

  #createFreeOrDelegatedRequest(planId: number, placeId: number, cart: Cart): Observable<Order> {
    const paymentGateway =
      cart.total.amount === 0
        ? (PaymentCheckout[PaymentCheckout.free] as PaymentCheckoutET)
        : (PaymentCheckout[PaymentCheckout.delegated] as PaymentCheckoutET);
    const paymentProvider: PaymentProvider = cart.total.amount === 0 ? PaymentProvider.FREE : PaymentProvider.DELEGATED;
    const createCheckoutCommonParams: Pick<CreateCheckoutParam, 'cartId' | 'overrideCapacity' | 'partnerId' | 'userId'> = {
      cartId: cart.id,
      ...(this.isInOverrideZone && { overrideCapacity: true }),
      partnerId: this.partner.id,
      userId: cart.userId ?? this.userId,
    };
    const createCheckoutRequest$: Observable<unknown> =
      cart.total.amount === 0
        ? this.#paymentService.createCheckout({
            ...createCheckoutCommonParams,
            channel: this.channelId,
            paymentCheckout: 'free',
          })
        : this.#paymentService.createCheckout({
            ...createCheckoutCommonParams,
            channel: this.channelId,
            paymentCheckout: 'delegated',
            paymentMethod: this.purchase.paymentMethod,
          });
    return createCheckoutRequest$.pipe(
      tap(() => {
        this.sendCreateCheckoutMixpanelEvent(cart.id, paymentGateway, this.purchase.paymentMethod.paymentType);
      }),
      switchMap((response: unknown) => {
        if (paymentGateway === (PaymentCheckout[PaymentCheckout.delegated] as PaymentCheckoutET)) {
          this.#applyDelegatedCheckoutResponse(response, cart.id);
        } else {
          this.#applyFreeCheckoutResponse(response, cart.id);
        }
        return this.bookResultService.getBookResult(
          paymentGateway,
          this.partner.id,
          this.selectedPlan.id,
          this.selectedPlace.id,
          cart,
          response,
          cart.userId ?? this.userId,
        );
      }),
      switchMap((response: BaseResponse<BookResult>) => (this.receiptDocumentMessage ? this.addNoteToOrder(response) : of(response))),
      mergeMap((response: BaseResponse<BookResult>) => this.#passThroughBookResult(response)),
      map(response => {
        this.#stopFranceAsyncFiscalWatchOnCompletedSale();
        this.paymentTransactionId = response.data.transactionId;
        this.paymentProvider = paymentProvider;
        return new Order({ id: response.data.orderId });
      }),
      catchError(error => {
        this.#markBookingFailureFromPurchaseError(error);
        return throwError(() => error);
      }),
    );
  }

  #loadSelectedOnsiteSetup(): void {
    this.selectedOnsiteSetup = this.onsiteSetupsStorageService.getConfiguration();
    this.#syncRuntimeChannel();
    if (this.selectedOnsiteSetup === null) {
      this.#datadogLogService.logWarn('[BoxOffice] Checkout reached without onsite setup', {
        cartId: this.cart?.id,
      });
      this.#showOnsiteSetupModal();
    }
  }

  #syncRuntimeChannel(): void {
    if (this.selectedOnsiteSetup == null) {
      return;
    }
    this.channelId = this.selectedOnsiteSetup.channel_id ?? Channel.BoxOffice;
  }

  #resolvePaymentPlaceId(): number {
    const onsitePlaceId = this.selectedOnsiteSetup?.place_id ?? this.selectedOnsiteSetup?.place?.id;
    return onsitePlaceId ?? this.selectedPlace.id;
  }

  #showOnsiteSetupModal(): void {
    const modalRef: NgbModalRef = this.modalService.open(OnsiteSetupModalComponent, { backdrop: 'static' });
    const component: OnsiteSetupModalComponent = modalRef.componentInstance;
    const responseObservable = component.response.pipe(
      take(1),
      finalize(() => modalRef.close()),
    );
    const dismissObservable = modalRef.dismissed.pipe(map((): null => null));
    merge(responseObservable, dismissObservable)
      .pipe(take(1))
      .subscribe((onsiteSetup: OnsiteSetup | null) => {
        if (onsiteSetup === null) {
          this.#showOnsiteSetupModal();
        } else {
          this.selectedOnsiteSetup = onsiteSetup;
          this.onsiteSetupsStorageService.setConfiguration(onsiteSetup);
          this.#syncRuntimeChannel();
          this.#setPaymentConfigurationFromSelectedOnsiteSetup();
          this.updatePaymentMethodAllowed(this.partner.countryCode);
        }
      });
  }

  #setPaymentConfigurationFromSelectedOnsiteSetup(): void {
    const storedDeviceId: string | undefined = this.paymentConfigStorageService.getConfiguration()?.deviceId;
    this.paymentConfiguration = this.#boxOfficePaymentMethodsService.buildPaymentConfiguration(this.selectedOnsiteSetup, storedDeviceId);
  }

  #showSplitPaymentProgressModal(cart: Cart, checkoutResponse: AdyenCheckout): Observable<BaseResponse<BookResult>> {
    const params: SplitPaymentProgressParams = {
      cartId: cart.id!,
      currency: cart.total?.currency ?? 'EUR',
      deviceId: checkoutResponse.deviceId,
      partnerId: this.partner.id,
      paymentGateway: 'adyen',
      placeId: this.selectedPlace.id,
      planId: this.selectedPlan.id,
      seed: Math.floor(Math.random() * 10000000 + 1),
      totalAmount: cart.total?.amount,
      transactionId: checkoutResponse.transactionId,
      userId: cart.userId ?? this.userId!,
    };
    this.#trackSplitPaymentStarted(cart, checkoutResponse.transactionId, checkoutResponse.deviceId, 'progress_modal');
    return this.#splitPaymentProgressService.openSplitPaymentProgressModal(params).pipe(
      catchError(error => {
        if (error instanceof BaseResponse && error.error?.errorCode === AdyenErrorCode.CancelledTransaction) {
          this.isCancellingPayment = true;
          if (cart.id !== undefined) {
            this.#franceAsyncFiscalFailureService.stopWatchingCart(cart.id);
          }
        }
        return throwError(() => error);
      }),
    );
  }

  #showWaitingForPaymentModal(paymentProvider: PaymentCheckoutET): Observable<undefined | never> {
    const cartId = this.cart?.id;
    const partnerId = this.partner?.id;
    const isSplitPayment = this.purchase?.paymentMethod?.paymentType === PaymentType.CARD_SPLIT && cartId && partnerId;

    const modalOptions = isSplitPayment
      ? {
          backdrop: 'static' as const,
          keyboard: false,
          injector: Injector.create({
            parent: this.#injector,
            providers: [
              {
                provide: WAITING_PAYMENT_MODAL_DATA,
                useValue: {
                  cartId,
                  currency: this.cart?.total?.currency ?? null,
                  partnerId,
                  placeId: this.#resolvePaymentPlaceId(),
                  planId: this.selectedPlan?.id ?? null,
                  totalAmount: this.cart?.total?.amount ?? null,
                  transactionId: this.paymentTransactionId ?? null,
                },
              },
            ],
          }),
        }
      : { backdrop: 'static' as const, keyboard: false };

    this.waitingForPaymentModal = this.modalService.open(WaitingForPaymentModalComponent, modalOptions);

    if (isSplitPayment) {
      this.#trackSplitPaymentStarted(
        this.cart,
        this.paymentTransactionId ?? '',
        this.paymentConfigStorageService.getConfiguration()?.deviceId,
        'waiting_modal',
      );
    }

    const modalInstance = this.waitingForPaymentModal.componentInstance as WaitingForPaymentModalComponent;
    return outputToObservable(modalInstance.response).pipe(
      switchMap((response: boolean) => {
        if (!response) {
          return EMPTY;
        }
        if (cartId !== undefined && this.#franceAsyncFiscalFailureService.isHandlingFiscalFailure(cartId)) {
          return EMPTY;
        }
        return this.#cancelCancellablePayment(paymentProvider);
      }),
      takeUntilDestroyed(this.#destroyRef),
    );
  }

  private addNoteToOrder(bookResultBaseResponse: BaseResponse<BookResult>): Observable<BaseResponse<BookResult>> {
    return this.orderNotesService
      .setOrderNote(bookResultBaseResponse.data.orderId, {
        message: this.receiptDocumentMessage,
        title: this.translate.instant('boxOffice.receiptDocument.title'),
      })
      .pipe(map(() => bookResultBaseResponse));
  }

  #passThroughBookResult(response: BaseResponse<BookResult>): Observable<BaseResponse<BookResult>> {
    this.#efrUserMessageModalService.captureFromBookResult(response.data);
    return this.checkResponseData(response);
  }

  #markBookingFailureFromPurchaseError(error: unknown): void {
    if (this.#franceAsyncFiscalWatchCartId === null || !isSoldOutSessionError(error)) {
      return;
    }
    this.#franceAsyncFiscalFailureService.markBookingFailure(this.#franceAsyncFiscalWatchCartId);
  }

  private checkResponseData<T>(response: BaseResponse<T>): Observable<BaseResponse<T>> {
    return response?.data != null ? of(response) : throwError(response);
  }

  private createAdyenOrder(cart: Cart, paymentType?: string): void {
    this.createAdyenOrderRequest(cart, paymentType)
      .pipe(
        finalize(() => this.endPayment()),
        takeUntilDestroyed(this.#destroyRef),
        catchError(err => {
          this.checkoutLogger.error(
            'Error on adyen create order',
            this.getCurrentLoggerContext(CheckoutStageEnum.CHECKOUT, {
              error: JSON.stringify(err),
            }),
            { cartId: this.cart?.id, error: err },
          );

          return throwError(() => err);
        }),
      )
      .subscribe(
        (order: Order) => {
          this.successOrder(order);
        },
        (response: BaseResponse<Order>) => {
          this.checkoutLogger.info(
            'Showing modal error on Adyen create order',
            this.getCurrentLoggerContext(CheckoutStageEnum.CHECKOUT, {
              message: response.error?.message,
            }),
            { cartId: this.cart?.id },
          );

          const isSplitPaymentCancellation =
            this.purchase?.paymentMethod?.paymentType === PaymentType.CARD_SPLIT && this.paymentTransactionId && this.isCancellingPayment;

          if (isSplitPaymentCancellation) {
            this.#paymentCheckoutAdyenService.cancelHadCompletedPayments$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe({
              error: () => this.#errorModalService.open({ error: response.error }),
              next: hadCompletedPayments => {
                if (hadCompletedPayments) {
                  this.#splitPaymentRetryUiService.showCancellationErrorModal(this.partner.id, this.cart.id, this.paymentTransactionId);
                } else {
                  this.#errorModalService.open({ error: response.error });
                }
              },
            });
          } else {
            this.#errorModalService.open({ error: response.error });
          }
        },
      );
  }

  private createAdyenOrderRequest(cart: Cart, paymentType?: string): Observable<Order> {
    const paymentProvider = PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET;
    const placeIdForAdyen = this.#resolvePaymentPlaceId();
    const request: AdyenCreateCheckoutBody = {
      channelId: this.channelId,
      placeId: placeIdForAdyen,
    };

    if (paymentType === PaymentType.CREDIT_CARD || paymentType === PaymentType.DEBIT_CARD) {
      request['paymentType'] = PaymentType.CARD;
      request['paymentCardType'] = paymentType == PaymentType.CREDIT_CARD ? 'credit' : 'debit';
    } else if (paymentType === PaymentType.CARD_SPLIT) {
      request['paymentType'] = PaymentType.CARD;
      request['splitPaymentFlag'] = true;
    } else {
      request['paymentType'] = paymentType;
    }

    return this.#paymentService
      .createCheckout({
        adyenCreateCheckoutBody: request,
        cartId: cart.id,
        partnerId: this.partner.id,
        paymentCheckout: 'adyen',
        userId: cart.userId ?? this.userId,
      })
      .pipe(
        tap(() => {
          this.sendCreateCheckoutMixpanelEvent(cart.id, PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET, paymentType);
        }),
        switchMap((response: AdyenCheckout) => {
          this.paymentTransactionId = response.transactionId;
          this.#startFranceAsyncFiscalWatch(
            PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET,
            response.blockBooker,
            response.blocksPurchaseOnFailure,
          );
          this.spinnerService.hide();
          if (paymentType === PaymentType.CARD_SPLIT) {
            return this.#showSplitPaymentProgressModal(cart, response);
          }
          return this.bookResultService
            .getBookResult(
              paymentProvider,
              this.partner.id,
              this.selectedPlan.id,
              placeIdForAdyen,
              cart,
              response,
              cart.userId ?? this.userId,
            )
            .pipe(takeUntil(this.#showWaitingForPaymentModal(paymentProvider)));
        }),
        mergeMap((response: BaseResponse<BookResult>) => this.#passThroughBookResult(response)),
        map(response => {
          this.#stopFranceAsyncFiscalWatchOnCompletedSale();
          this.paymentTransactionId = response.data.transactionId;
          this.paymentProvider = PaymentProvider.ADYEN;
          if (this.waitingForPaymentModal) {
            this.waitingForPaymentModal.close();
          }
          return new Order({ id: response.data.orderId });
        }),
        catchError(error => {
          this.#markBookingFailureFromPurchaseError(error);
          if (this.waitingForPaymentModal) {
            if (!this.isCancellingPayment) {
              this.waitingForPaymentModal.close();
            }
            if (this.isCancellingPayment && error.error?.errorCode === AdyenErrorCode.FailedTransaction) {
              return throwError(
                () =>
                  new BaseResponse(null, {
                    errorCode: AdyenErrorCode.CancelledTransaction,
                    message: `errors.adyen.${AdyenErrorCode.CancelledTransaction}`,
                  }),
              );
            }
          } else {
            this.spinnerService.hide();
          }
          return throwError(() => error);
        }),
      );
  }

  private createFreeOrDelegatedOrder(cart: Cart): void {
    this.#createFreeOrDelegatedRequest(this.selectedPlan.id, this.selectedPlace.id, cart)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.endPayment()),
      )
      .subscribe(
        (order: Order) => {
          this.successOrder(order);
        },
        (response: BaseResponse<any>) => {
          this.#errorModalService.open({ error: response.error });
        },
      );
  }

  private createPayhereOrder(cart: Cart, paymentType: string): void {
    this.createPayhereOrderRequest(cart, paymentType)
      .pipe(
        catchError(err => {
          this.checkoutLogger.error(
            'Error on Payhere create order',
            this.getCurrentLoggerContext(CheckoutStageEnum.CHECKOUT, { error: JSON.stringify(err) }),
            { cartId: this.cart?.id, error: err },
          );
          return throwError(() => err);
        }),
        finalize(() => this.endPayment()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (response: BaseResponse<Order>) => {
          this.checkoutLogger.info(
            'Showing modal error on Payhere create order',
            this.getCurrentLoggerContext(CheckoutStageEnum.CHECKOUT, { message: response.error?.message }),
            { cartId: this.cart?.id },
          );
          this.#errorModalService.open({ error: response.error });
        },
        next: (order: Order) => this.successOrder(order),
      });
  }

  private createPayhereOrderRequest(cart: Cart, paymentType?: string): Observable<Order> {
    const deviceId = this.paymentConfigStorageService.getConfiguration().deviceId;
    const onsiteSetupId = this.onsiteSetupsStorageService.getConfiguration().id;
    return this.#paymentService
      .createCheckout({
        cartId: cart.id,
        partnerId: this.partner.id,
        payhereCreateCheckoutBody: {
          channelId: this.channelId,
          device_identifier: deviceId,
          onsite_setup_id: onsiteSetupId,
          payment_device_id: deviceId,
          payment_method_type: paymentType,
        },
        paymentCheckout: 'payhere',
        userId: cart.userId ?? this.userId,
      })
      .pipe(
        tap(() => {
          this.sendCreateCheckoutMixpanelEvent(cart.id, PaymentCheckout[PaymentCheckout.payhere] as PaymentCheckoutET, paymentType);
        }),
        switchMap((response: PaymentCheckoutTransaction) => {
          this.paymentTransactionId = response.transactionId;
          return this.bookResultService.getBookResult(
            PaymentCheckout[PaymentCheckout.payhere] as PaymentCheckoutET,
            this.partner.id,
            this.selectedPlan.id,
            this.selectedPlace.id,
            cart,
            response,
            cart.userId ?? this.userId,
          );
        }),
        mergeMap((response: BaseResponse<BookResult>) => this.#passThroughBookResult(response)),
        map((response: BaseResponse<BookResult>) => {
          this.paymentTransactionId = response.data.transactionId;
          this.paymentProvider = PaymentProvider.PAYHERE;
          return {
            id: response.data.orderId,
          } as Order;
        }),
        catchError(error => {
          this.spinnerService.hide();
          return throwError(() => error);
        }),
        takeUntilDestroyed(this.#destroyRef),
      );
  }

  private createPurchase(paymentMethod?: PaymentMethod): Purchase {
    if (this.cartAmountIsZero) {
      return new Purchase(this.cart.id, this.cart.userId, { paymentType: PaymentType.FREE }, this.channelId);
    }
    if (paymentMethod) {
      return new Purchase(this.cart.id, this.cart.userId, paymentMethod, this.channelId);
    }
    return null;
  }

  private createRazorpayOrder(cart: Cart, paymentType?: PaymentType): void {
    this.createRazorpayOrderRequest(cart, paymentType)
      .pipe(
        catchError(err => {
          this.checkoutLogger.error(
            'Error on razorpay create order',
            this.getCurrentLoggerContext(CheckoutStageEnum.CHECKOUT, {
              error: JSON.stringify(err),
            }),
            { cartId: this.cart?.id, error: err },
          );
          return throwError(() => err);
        }),
        finalize(() => this.endPayment()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (response: BaseResponse<Order>) => {
          this.checkoutLogger.info(
            'Showing modal error on Razorpay create order',
            this.getCurrentLoggerContext(CheckoutStageEnum.CHECKOUT, {
              message: response.error?.message,
            }),
            { cartId: this.cart?.id },
          );
          this.#errorModalService.open({ error: response.error });
        },
        next: (order: Order) => this.successOrder(order),
      });
  }

  private createRazorpayOrderRequest(cart: Cart, paymentType?: PaymentType): Observable<Order> {
    const paymentProvider = PaymentCheckout[PaymentCheckout.razorpay] as PaymentCheckoutET;
    return this.#paymentService
      .createCheckout({
        cartId: cart.id,
        partnerId: this.partner.id,
        paymentCheckout: 'razorpay',
        razorpayCreateCheckoutBody: {
          channelId: this.channelId,
          paymentMethodType: paymentType,
        },
        userId: cart.userId ?? this.userId,
      })
      .pipe(
        tap(() => {
          this.sendCreateCheckoutMixpanelEvent(cart.id, PaymentCheckout[PaymentCheckout.razorpay] as PaymentCheckoutET, paymentType);
        }),
        switchMap((response: RazorpayCheckout) => {
          this.paymentTransactionId = response.transactionId;
          this.paymentProvider = PaymentProvider.RAZORPAY;
          this.spinnerService.hide();
          return this.bookResultService
            .getBookResult(
              paymentProvider,
              this.partner.id,
              this.selectedPlan.id,
              this.selectedPlace.id,
              cart,
              response,
              cart.userId ?? this.userId,
            )
            .pipe(takeUntil(this.#showWaitingForPaymentModal(paymentProvider)));
        }),
        mergeMap((response: BaseResponse<BookResult>) => this.#passThroughBookResult(response)),
        map((response: BaseResponse<BookResult>) => {
          this.paymentTransactionId = response.data.transactionId;
          this.paymentProvider = PaymentProvider.RAZORPAY;
          if (this.waitingForPaymentModal) {
            this.waitingForPaymentModal.close();
          }
          return {
            id: response.data.orderId,
          } as Order;
        }),
        catchError(error => {
          if (this.waitingForPaymentModal) {
            this.waitingForPaymentModal.close();
            if (this.isCancellingPayment && error.error?.errorCode === RazorpayErrorCode.FailedTransaction) {
              return throwError(
                () =>
                  new BaseResponse(null, {
                    errorCode: RazorpayErrorCode.CancelledTransaction,
                    message: `errors.razorpay.${RazorpayErrorCode.CancelledTransaction}`,
                  }),
              );
            }
            if (error.error?.errorCode === RazorpayErrorCode.ErrorToConnect) {
              return throwError(
                () =>
                  new BaseResponse(null, {
                    errorCode: RazorpayErrorCode.ErrorToConnect,
                    message: `errors.razorpay.${RazorpayErrorCode.ErrorToConnect}`,
                  }),
              );
            }
          } else {
            this.spinnerService.hide();
          }
          return throwError(() => error);
        }),
        takeUntilDestroyed(this.#destroyRef),
      );
  }

  private createSquareOrder(paymentConfig?: PaymentConfiguration, paymentType?: PaymentType): void {
    this.squareAsyncCheckout(paymentConfig, paymentType)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.endPayment()),
      )
      .subscribe(
        (order: Order) => {
          this.successOrder(order);
        },
        (response: BaseResponse<any>) => {
          this.#errorModalService.open({
            error: response.error,
            message: response.error ? undefined : 'generic.error',
          });
        },
      );
  }

  private discardCartAndNavigate() {
    this.priceViewerService.clear(this.onsiteSetupsStorageService.getConfiguration());
    const query: DiscardCartQuery = {
      cartId: this.cart.id,
      partnerId: this.partner.id,
    };

    this.checkoutLogger.info('Going to discard cart', this.getCurrentLoggerContext(CheckoutStageEnum.CREATE_ORDER), {
      cartId: this.cart?.id,
    });

    this.#cashRegisterCartDiscardService
      .discard(query)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() =>
          this.isRescheduleFlow
            ? this.router.navigate(['/validation'], {
                queryParams: {
                  id: this.rescheduleOrderId,
                  type: 'order',
                },
              })
            : this.router.navigate(['/box-office'], { queryParamsHandling: 'merge' }),
        ),
      )
      .subscribe();
  }

  private endPayment(): void {
    this.paymentInProgress = false;
    this.spinnerService.hide();
  }

  private getCurrentLoggerContext(stage: CheckoutStageEnum, data?: Record<string, unknown>): CheckoutLogContext {
    return {
      cartId: this.cart ? this.cart.id : null,
      data,
      stage,
    };
  }

  private isPaymentMethodAvailable(paymentMethod: PaymentType): boolean {
    if (this.#declarativeAvailableMethods !== null) {
      return this.#declarativeAvailableMethods.has(paymentMethod);
    }

    const onsiteSetupSelected = this.onsiteSetupsStorageService.getConfiguration();
    if (!onsiteSetupSelected) {
      return false;
    }
    if (onsiteSetupSelected.payment_methods.length === 0) {
      return true;
    }

    const available_payment_methods = onsiteSetupSelected.payment_methods.map(item => item.payment_method);
    return available_payment_methods.includes(paymentMethod);
  }

  #displayOf(paymentType: PaymentType): Pick<PaymentMethodOption, 'imageUrl' | 'label'> {
    const display = this.#declarativeDisplay.get(paymentType);
    return { imageUrl: display?.imageUrl ?? undefined, label: display?.label ?? resolvePaymentMethodLabel(null, paymentType) };
  }

  #resolveDeclarativeAvailableMethods(): AvailablePaymentMethods {
    const onsiteSetup = this.onsiteSetupsStorageService.getConfiguration();
    return this.#boxOfficePaymentMethodsService.getAvailableMethods(onsiteSetup ?? undefined);
  }

  private resetScroll() {
    if (this.dualScreenStorageService.containsData()) {
      ScrollUtils.scrollToTop();
    } else if (window.innerWidth < 1200) {
      this.scrollToBoxOfficeContent();
    }
  }

  private scrollToBoxOfficeContent(): void {
    setTimeout(() => {
      document.getElementsByClassName('box-office-content')[0]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });
  }

  private sendCreateCheckoutMixpanelEvent(cartId: string, paymentGateway: PaymentCheckoutET, paymentMethod?: string): void {
    this.trackingService.track(
      new CreateCheckoutEvent({
        cart_id: cartId,
        obo_flow_type: this.onsiteSetupsStorageService.getConfiguration()?.obo_flow_type,
        payment_gateway: paymentGateway,
        payment_method: paymentMethod,
      }),
    );
  }

  #trackSplitPaymentStarted(
    cart: Cart,
    transactionId: string,
    deviceId?: string,
    flowType: 'progress_modal' | 'waiting_modal' = 'progress_modal',
  ): void {
    this.trackingService.track(
      new SplitPaymentStartedEvent({
        cart_id: cart.id!,
        currency: cart.total?.currency ?? 'EUR',
        device_id: deviceId,
        flow_type: flowType,
        obo_flow_type: this.onsiteSetupsStorageService.getConfiguration()?.obo_flow_type,
        partner_id: this.partner.id,
        payment_gateway: 'adyen',
        place_id: this.selectedPlace.id,
        plan_id: this.selectedPlan.id,
        total_amount: cart.total?.amount,
        transaction_id: transactionId,
        user_id: cart.userId ?? this.userId!,
      }),
    );
  }

  private sendCreateOrderEvent(orderId: number): void {
    const isUsingCashCalculator = this.purchase?.paymentMethod?.paymentType === PaymentType.CASH && this.cashCalculatorCashReceived != null;
    this.priceViewerService.clear(this.onsiteSetupsStorageService.getConfiguration());
    this.#cartTimingService.recordOrderConfirmationTiming(orderId, this.cart.id);
    this.trackingService.track(
      new CreateOrderEvent({
        cart_id: this.purchase?.cartId,
        channel: this.channelId,
        city_id: this.selectedCity.id,
        city_name: this.selectedCity.title,
        coupon_code: this.cart.appliedCoupon?.code || null,
        currency: this.cart.total != null ? this.cart.total.currency : '',
        customer_id: this.cart.userId,
        event_date: [...this.cart.sessionItemsByDatetime][0][0],
        feverzone_user: this.userService.getUserEmail(),
        obo_flow_type: this.onsiteSetupsStorageService.getConfiguration()?.obo_flow_type,
        order_id: orderId,
        payment_provider: this.paymentProvider ?? this.purchase?.getPaymentProvider?.(),
        payment_transaction_id: this.purchase?.paymentMethod?.paymentTransactionId,
        payment_type: this.purchase?.paymentMethod?.paymentType,
        place_id: this.selectedPlace.id,
        place_name: this.selectedPlace.title,
        plan_id: this.selectedPlan.id,
        plan_name: this.selectedPlan.title,
        purchase_source: this.channelId,
        reservation_id: this.reservationId,
        time: new Date().toISOString(),
        total: this.cart.total != null ? this.cart.total.amount : 0,
        total_purchased_tickets: this.cart.getNumberOfTicketCounts(),
        total_surcharge: this.cart.totalSurcharge != null ? this.cart.totalSurcharge.amount : 0,
        using_cash_calculator: isUsingCashCalculator,
        ...getMultiplanCartFlags(this.cart),
      }),
    );
  }

  private showErrorModal(error: any): void {
    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant('common.errorTitle');

    let errorMessage = 'generic.error';
    if (error?.error?.message) {
      errorMessage = error.error.message;
    }

    modal.componentInstance.messages = [this.translate.instant(errorMessage)];
  }

  private showWarningDiscardOrderModal() {
    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant('boxOffice.order.modal.title');
    modal.componentInstance.messages = [this.translate.instant('boxOffice.order.modal.message')];
    modal.componentInstance.acceptButtonLabel = this.translate.instant('boxOffice.order.modal.accept');
    modal.componentInstance.cancelButtonLabel = this.translate.instant('boxOffice.order.modal.cancel');
    modal.componentInstance.responseEmitter
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response: unknown) => (response ? this.discardCartAndNavigate() : null));
  }

  private squareAsyncCheckout(paymentConfig?: PaymentConfiguration, paymentType?: PaymentType): Observable<Order> {
    const idempotencyKey = uuidv4().split('-');
    idempotencyKey[0] = PaymentCheckoutSquareService.idempotencyKeyAsyncPrefix;
    const checkout: SquareCreateCheckoutBody = {
      applicationId: paymentConfig.squareConfiguration.applicationId,
      channelId: this.channelId,
      deviceId: paymentConfig.deviceId,
      idempotencyKey: idempotencyKey.join('-'),
      locationId: paymentConfig.squareConfiguration.locationId,
      paymentMethodType: paymentType,
    };
    return this.#paymentService
      .createCheckout({
        cartId: this.cart.id,
        partnerId: this.partner.id,
        paymentCheckout: 'square',
        squareCreateCheckoutBody: checkout,
        userId: this.cart.userId ?? this.userId,
      })
      .pipe(
        tap(() => {
          this.sendCreateCheckoutMixpanelEvent(this.cart.id, PaymentCheckout[PaymentCheckout.square] as PaymentCheckoutET, paymentType);
        }),
        switchMap((response: SquareCheckout) => {
          this.paymentTransactionId = response.transactionId;
          this.spinnerService.hide();
          return this.bookResultService
            .getBookResult(
              PaymentCheckout[PaymentCheckout.square] as PaymentCheckoutET,
              this.partner.id,
              this.selectedPlan.id,
              this.selectedPlace.id,
              this.cart,
              checkout,
              this.cart.userId ?? this.userId,
            )
            .pipe(takeUntil(this.#showWaitingForPaymentModal(PaymentCheckout[PaymentCheckout.square] as PaymentCheckoutET)));
        }),
        mergeMap((response: BaseResponse<BookResult>) => this.#passThroughBookResult(response)),
        map(response => {
          this.#closeWaitingForPaymentModal();
          this.paymentTransactionId = response.data.transactionId;
          this.paymentProvider = PaymentProvider.SQUARE;
          return new Order({ id: response.data.orderId });
        }),
        catchError(error => {
          this.#closeWaitingForPaymentModal();
          return throwError(() => error);
        }),
      );
  }

  private successOrder(order: Order): void {
    this.#efrUserMessageModalService
      .showIfPresent()
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        if (order.id == null) {
          this.checkoutLogger.error(
            'Cannot redirect to order page: order id is missing',
            this.getCurrentLoggerContext(CheckoutStageEnum.CREATE_ORDER),
            { cartId: this.cart?.id, reservationId: this.reservationId },
          );
          this.#errorModalService.open({ message: 'generic.error' });
          return;
        }

        this.sendCreateOrderEvent(order.id);
        const navigationExtras: NavigationExtras = {
          queryParamsHandling: 'merge',
          state: {
            autoPrint: true,
            plan: this.plan,
          },
        };
        this.checkoutLogger.info(
          'Redirecting to order page',
          this.getCurrentLoggerContext(CheckoutStageEnum.CREATE_ORDER, {
            orderId: order.id,
          }),
          { cartId: this.cart?.id, orderId: order.id },
        );
        this.updateOboSecondScreenPayment();
        this.shouldResetOboSecondScreenToStandBy = false;
        const routeUrl = this.isRescheduleFlow ? '/reschedule/order/confirmation/' : '/box-office/order/';
        this.router.navigate([routeUrl, order.id], navigationExtras);
      });
  }

  private updateCardPaymentMethodAllowed(): void {
    const hasAdyenDeviceConfigured = this.storedPaymentConfig?.deviceId && this.storedPaymentConfig?.adyenConfiguration;
    const hasAnyCardMethodAvailable: boolean =
      this.isPaymentMethodAvailable(PaymentType.CARD) ||
      this.isPaymentMethodAvailable(PaymentType.DEBIT_CARD) ||
      this.isPaymentMethodAvailable(PaymentType.CREDIT_CARD);

    if (!hasAnyCardMethodAvailable) {
      return;
    }

    const onsiteSetup = this.onsiteSetupsStorageService.getConfiguration();
    const gatewayProvider = this.#boxOfficePaymentMethodsService.getGatewayProvider(onsiteSetup);
    const allowsDelegatedPayment = this.#boxOfficePaymentMethodsService.allowsDelegatedCardPayment(onsiteSetup);
    const isCardPaymentDisallowed: boolean = this.#paymentService.isCardPaymentDisallowed(
      this.paymentConfiguration,
      this.storedPaymentConfig,
      this.cartAmountIsZero,
      gatewayProvider,
      allowsDelegatedPayment,
    );
    const isMissingTerminalOnly: boolean = this.#paymentService.isCardDisabledDueToMissingTerminal(
      this.storedPaymentConfig,
      gatewayProvider,
      allowsDelegatedPayment,
    );
    const effectiveDisabled: boolean = isCardPaymentDisallowed && !isMissingTerminalOnly;
    const missingTerminalTooltip: string | undefined = effectiveDisabled
      ? (this.#paymentService.getCardDisabledTooltip(this.storedPaymentConfig, gatewayProvider, allowsDelegatedPayment) ?? undefined)
      : undefined;

    if (this.isPaymentMethodAvailable(PaymentType.CARD)) {
      this.paymentMethods.set(PaymentType.CARD, {
        disabled: this.cartAmountIsZero || effectiveDisabled,
        disabledTooltip: missingTerminalTooltip,
        method: PaymentType.CARD,
        ...this.#displayOf(PaymentType.CARD),
      });
    }

    if (hasAdyenDeviceConfigured && this.isPaymentMethodAvailable(PaymentType.DEBIT_CARD) && !this.cartAmountIsZero) {
      this.paymentMethods.set(PaymentType.DEBIT_CARD, {
        disabled: effectiveDisabled,
        disabledTooltip: missingTerminalTooltip,
        method: PaymentType.DEBIT_CARD,
        ...this.#displayOf(PaymentType.DEBIT_CARD),
      });
    }

    if (hasAdyenDeviceConfigured && this.isPaymentMethodAvailable(PaymentType.CREDIT_CARD) && !this.cartAmountIsZero) {
      this.paymentMethods.set(PaymentType.CREDIT_CARD, {
        disabled: effectiveDisabled,
        disabledTooltip: missingTerminalTooltip,
        method: PaymentType.CREDIT_CARD,
        ...this.#displayOf(PaymentType.CREDIT_CARD),
      });
    }

    if (this.isPaymentMethodAvailable(PaymentType.CARD_SPLIT) && !this.cartAmountIsZero) {
      this.paymentMethods.set(PaymentType.CARD_SPLIT, {
        disabled: effectiveDisabled,
        disabledTooltip: missingTerminalTooltip,
        method: PaymentType.CARD_SPLIT,
        ...this.#displayOf(PaymentType.CARD_SPLIT),
      });
    }
  }

  private updatePaymentMethodAllowed(partnerCountryCode: string): void {
    this.cartAmountIsZero = this.cart.total.amount === 0;
    const { display, methods } = this.#resolveDeclarativeAvailableMethods();
    this.#declarativeAvailableMethods = new Set(methods);
    this.#declarativeDisplay = display;

    const hasAdyenDeviceConfigured = this.storedPaymentConfig?.deviceId && this.storedPaymentConfig?.adyenConfiguration;
    const hasSquareDeviceConfigured = this.storedPaymentConfig?.deviceId && this.storedPaymentConfig?.squareConfiguration;

    this.paymentMethods = new Map<string, PaymentMethodOption>();

    this.updateCardPaymentMethodAllowed();

    if (this.isPaymentMethodAvailable(PaymentType.CASH)) {
      this.paymentMethods.set(PaymentType.CASH, {
        disabled: this.cartAmountIsZero,
        method: PaymentType.CASH,
        ...this.#displayOf(PaymentType.CASH),
      });
    }

    if (this.countriesWithPayNow.includes(partnerCountryCode) && this.isPaymentMethodAvailable(PaymentType.PAY_NOW)) {
      this.paymentMethods.set(PaymentType.PAY_NOW, {
        disabled: this.cartAmountIsZero || !hasAdyenDeviceConfigured,
        method: PaymentType.PAY_NOW,
        ...this.#displayOf(PaymentType.PAY_NOW),
      });
    }

    if (
      CountriesWithPix.includes(partnerCountryCode) &&
      hasAdyenDeviceConfigured &&
      !this.cartAmountIsZero &&
      this.isPaymentMethodAvailable(PaymentType.PIX)
    ) {
      this.paymentMethods.set(PaymentType.PIX, {
        method: PaymentType.PIX,
        ...this.#displayOf(PaymentType.PIX),
      });
    }
    if (CountriesWithUpi.includes(partnerCountryCode) && !this.cartAmountIsZero && this.isPaymentMethodAvailable(PaymentType.UPI)) {
      this.paymentMethods.set(PaymentType.UPI, {
        method: PaymentType.UPI,
        ...this.#displayOf(PaymentType.UPI),
      });
    }

    if (
      CountriesWithCartaValorada.includes(partnerCountryCode) &&
      !this.cartAmountIsZero &&
      this.isPaymentMethodAvailable(PaymentType.CARTA_VALORADA)
    ) {
      this.paymentMethods.set(PaymentType.CARTA_VALORADA, {
        method: PaymentType.CARTA_VALORADA,
        ...this.#displayOf(PaymentType.CARTA_VALORADA),
      });
    }
    if (
      CountriesWithCartaValorada.includes(partnerCountryCode) &&
      !this.cartAmountIsZero &&
      this.isPaymentMethodAvailable(PaymentType.CARTA_VALORADA_AATM)
    ) {
      this.paymentMethods.set(PaymentType.CARTA_VALORADA_AATM, {
        method: PaymentType.CARTA_VALORADA_AATM,
        ...this.#displayOf(PaymentType.CARTA_VALORADA_AATM),
      });
    }
    if (
      CountriesWithSimplePaymentsKr.includes(partnerCountryCode) &&
      !this.cartAmountIsZero &&
      this.isPaymentMethodAvailable(PaymentType.SIMPLE_PAYMENTS_KR)
    ) {
      this.paymentMethods.set(PaymentType.SIMPLE_PAYMENTS_KR, {
        method: PaymentType.SIMPLE_PAYMENTS_KR,
        ...this.#displayOf(PaymentType.SIMPLE_PAYMENTS_KR),
      });
    }
    if (
      this.optimizelyService.isFeatureEnabled('qr_codes_payment') &&
      CountriesWithSquareQr.includes(partnerCountryCode) &&
      !this.cartAmountIsZero &&
      hasSquareDeviceConfigured &&
      this.isPaymentMethodAvailable(PaymentType.SQUARE_QR)
    ) {
      this.paymentMethods.set(PaymentType.SQUARE_QR, {
        method: PaymentType.SQUARE_QR,
        ...this.#displayOf(PaymentType.SQUARE_QR),
      });
    }
    if (
      this.optimizelyService.isFeatureEnabled('ic_card_payment') &&
      CountriesWithIcCard.includes(partnerCountryCode) &&
      !this.cartAmountIsZero &&
      hasSquareDeviceConfigured &&
      this.isPaymentMethodAvailable(PaymentType.IC_CARD)
    ) {
      this.paymentMethods.set(PaymentType.IC_CARD, {
        method: PaymentType.IC_CARD,
        ...this.#displayOf(PaymentType.IC_CARD),
      });
    }
    if (
      this.optimizelyService.isFeatureEnabled('id_payment') &&
      CountriesWithIdPayment.includes(partnerCountryCode) &&
      !this.cartAmountIsZero &&
      hasSquareDeviceConfigured &&
      this.isPaymentMethodAvailable(PaymentType.ID_PAYMENT)
    ) {
      this.paymentMethods.set(PaymentType.ID_PAYMENT, {
        method: PaymentType.ID_PAYMENT,
        ...this.#displayOf(PaymentType.ID_PAYMENT),
      });
    }
    if (
      this.optimizelyService.isFeatureEnabled('quicpay_payment') &&
      CountriesWithQuicpay.includes(partnerCountryCode) &&
      !this.cartAmountIsZero &&
      hasSquareDeviceConfigured &&
      this.isPaymentMethodAvailable(PaymentType.QUICPAY)
    ) {
      this.paymentMethods.set(PaymentType.QUICPAY, {
        method: PaymentType.QUICPAY,
        ...this.#displayOf(PaymentType.QUICPAY),
      });
    }

    const customPaymentOptions = this.#partnerConfigService.getCustomPaymentMethodOptions(this.cartAmountIsZero);
    customPaymentOptions.forEach((option: PaymentMethodOption) => {
      this.paymentMethods.set(option.method, option);
    });
  }

  onDeviceSelected(deviceId: string): void {
    if (!this.cardPaymentAttemptedWithoutDevice) {
      return;
    }
    this.deviceSelectionInvalid = !deviceId;
  }

  #shouldHighlightDeviceSelector(): boolean {
    const paymentType: PaymentType | undefined = this.purchase?.paymentMethod?.paymentType;
    const cardPayments = [PaymentType.CARD, PaymentType.CARD_SPLIT, PaymentType.DEBIT_CARD, PaymentType.CREDIT_CARD];

    if (!paymentType || !cardPayments.includes(paymentType)) {
      return false;
    }

    const onsiteSetup = this.onsiteSetupsStorageService.getConfiguration();
    return this.#paymentService.isCardDisabledDueToMissingTerminal(
      this.storedPaymentConfig,
      this.#boxOfficePaymentMethodsService.getGatewayProvider(onsiteSetup),
      this.#boxOfficePaymentMethodsService.allowsDelegatedCardPayment(onsiteSetup),
    );
  }
}
