/* eslint-disable no-console */
import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  Signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';

import { IconName } from '@fortawesome/fontawesome-svg-core';
import { CheckoutPaymentOptionsService } from '@fz-original/app/modules/box-office/shared/services/checkout-payment-options/checkout-payment-options.service';
import { OnsiteCheckoutContextResolver } from '@fz-original/app/modules/box-office/shared/services/onsite-checkout-context/onsite-checkout-context.resolver';
import { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { PaymentFlowFeatureService } from '@fz-original/app/modules/box-office/shared/services/payment-flow-feature/payment-flow-feature.service';
import { BoxOfficePaymentMethodsService } from '@fz-original/app/modules/box-office/shared/services/payment-methods/box-office-payment-methods.service';
import { SplitPaymentRetryUiService } from '@fz-original/app/modules/box-office/shared/services/split-payment/split-payment-retry-ui.service';
import { SplitPaymentService } from '@fz-original/app/modules/box-office/shared/services/split-payment/split-payment.service';
import { CHECKOUT_PAYMENT_DRIVER } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-driver.model';
import type { CheckoutFlowKind } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout.model';
import { CheckoutModalFlowService } from '@fz-original/app/modules/checkout/checkout-modal/services/checkout-modal-flow.service';
import { mapCartToCheckoutCartItems } from '@fz-original/app/modules/checkout/checkout-modal/utils/checkout-cart.mapper';
import { BookingQuestionsModalService } from '@fz-original/app/shared/booking-questions/booking-questions-modal.service';
import { generateCart, normalizeCartDatetime } from '@fz-original/app/shared/components/ticketing/ticketing.utils';
import { DateAvailability } from '@fz-original/app/shared/models/session-availability/date-availability.model';
import { SessionAvailabilitySummaryByDate } from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-date.model';
import { SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { SearchBarService } from '@fz-original/app/shared/search-bar/service/search-bar.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService, ToastType } from '@fz-original/app/shared/services/toast/toast.service';
import {
  PaymentMethodDisplay,
  resolvePaymentMethodLabel,
} from '@fz-original/app/shared/utils/payment-method-display/payment-method-display.util';
import { IgntDialogService } from '@ignite/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { UserAttributes } from '@optimizely/optimizely-sdk';
import moment from 'moment-timezone';
import { BehaviorSubject, combineLatest, EMPTY, iif, merge, Observable, of, Subject, throwError } from 'rxjs';
import { catchError, concatMap, filter, finalize, map, mapTo, mergeMap, switchMap, take, takeUntil, takeWhile, tap } from 'rxjs/operators';

import { BreakpointStateService } from '../../../app/services/breakpoint/breakpoint-state.service';
import { PaymentCheckoutAdyenService } from '../../../app/services/payment-checkout-adyen/payment-checkout-adyen.service';
import { PaymentService } from '../../../app/services/payment/payment.service';
import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import { ClickAddToCartEvent } from '../../../core/tracking/core/events/click-add-to-cart';
import { ClickApplyCouponOneStepEvent } from '../../../core/tracking/core/events/click-apply-coupon-one-step';
import { ClickClearAllCartData } from '../../../core/tracking/core/events/click-clear-all-cart';
import { ClickContactInformationOnStepEvent } from '../../../core/tracking/core/events/click-contact-information-one-step';
import { CreateOrderEvent } from '../../../core/tracking/core/events/create-order';
import { getMultiplanCartFlags } from '../../../core/tracking/core/events/create-order.util';
import { LoadBoxOfficeEvent } from '../../../core/tracking/core/events/load-box-office';
import { LoadTicketingData } from '../../../core/tracking/core/events/load-ticketing-data';
import { CloseNoShiftStartedModalEvent, ShowNoShiftStartedModalEvent } from '../../../core/tracking/core/events/no-shift-started-modal';
import { OnsiteSetupSelectedEvent } from '../../../core/tracking/core/events/onsite-setup-selected';
import { PrepareCartEvent } from '../../../core/tracking/core/events/preprare-cart';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { passSessionInCart } from '../../../shared/checkers/pass-session-in-cart';
import {
  ContactInformationModalComponent,
  type ContactInformationModalResult,
} from '../../../shared/components/contact-information-modal/contact-information-modal.component';
import {
  ContactInformation,
  ContactInformationComponent,
} from '../../../shared/components/contact-information/contact-information.component';
import { PlanDetailCardComponent } from '../../../shared/components/plan-detail-card/plan-detail-card.component';
import { BaseTicketingComponent } from '../../../shared/components/ticketing/base-ticketing.component';
import { SelectOption } from '../../../shared/layout/filters/select/select.interface';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { BaseResponse } from '../../../shared/models/base-response';
import { CartSession, UnmemberedCartSession } from '../../../shared/models/cart/cart-session.model';
import { Cart } from '../../../shared/models/cart/cart.model';
import { Coupon } from '../../../shared/models/cart/coupon.model';
import { CustomerType } from '../../../shared/models/customer/customer-type.enum';
import { Customer } from '../../../shared/models/customer/customer.model';
import { Money } from '../../../shared/models/money.model';
import { Order } from '../../../shared/models/order/order.model';
import { Plan } from '../../../shared/models/plan/plan.model';
import { FreeSeatingMap } from '../../../shared/models/seating-map/free-seating-map.model';
import { contactInformationSelectorStep } from '../../../shared/models/step/purchase-steps';
import { OptimizelyService } from '../../../shared/optimizely/optimizely.service';
import { SearchFilter } from '../../../shared/search-bar/models/search-filter.model';
import { FreeSeatResponse } from '../../../shared/seating-selector/components/seating-selector/__data__/free-seat-response.model';
import { SeatInfo } from '../../../shared/seating-selector/components/seating-selector/__data__/seat-info.model';
import { SeatingProviderEnum } from '../../../shared/seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { CartTimingService } from '../../../shared/services/cart-timing/cart-timing.service';
import { CartService } from '../../../shared/services/cart/cart.service';
import { CheckoutLoggerService } from '../../../shared/services/checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '../../../shared/services/checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '../../../shared/services/checkout-logger/models/checkout-stage.enum';
import { CustomerService } from '../../../shared/services/customer/customer.service';
import { DualScreenStorageService } from '../../../shared/services/dual-screen/dual-screen-storage.service';
import { ErrorModalService } from '../../../shared/services/error-modal/error-modal.service';
import { FiscalComplianceBlockModalService } from '../../../shared/services/fiscal-compliance-block/fiscal-compliance-block-modal.service';
import { FiscalComplianceBlockPrepareError } from '../../../shared/services/fiscal-compliance-block/fiscal-compliance-block-prepare.error';
import { PartnerConfigService } from '../../../shared/services/partner-config/partner-config.service';
import { PlanService } from '../../../shared/services/plan/plan.service';
import { PriceViewerPrinterServiceManager } from '../../../shared/services/price-viewer/price-viewer.service';
import { PaymentMethodsPerCountry } from '../../../shared/services/purchase/purchase.service';
import { FreeSeatingMapService } from '../../../shared/services/seating-map/free-seating-map.service';
import { SeatingMapService } from '../../../shared/services/seating-map/seating-map.service';
import { Channel } from '../../../shared/services/session-availability/channel.enum';
import { SessionAvailabilityService } from '../../../shared/services/session-availability/session-availability.service';
import { SessionSelectorType } from '../../../shared/services/session-availability/session-selector-type.enum';
import { Permissions } from '../../../shared/services/user/permissions';
import { UserService } from '../../../shared/services/user/user.service';
import { PaymentType } from '../checkout/models/payment-type.enum';
import {
  MembershipsAcceptTermsModalComponent,
  MembershipsAcceptTermsModalData,
} from '../memberships/components/accept-terms-modal/accept-terms-modal.component';
import {
  MembershipsIdentifyMemberModalComponent,
  MembershipsIdentifyMemberModalData,
  MembershipsIdentifyMemberModalResult,
} from '../memberships/components/identify-member-modal/identify-member-modal.component';
import { MembershipsRemoveConfirmationMemberModalComponent } from '../memberships/components/remove-confirmation-member-modal/remove-confirmation-member-modal.component';
import { MembershipsData, MembershipsMember } from '../memberships/models/memberships.model';
import { buildCustomerFromMember } from '../memberships/utils/memberships.utils';
import { OboSecondScreenDataService } from '../obo-second-screen/services/obo-second-screen-data.service';
import { OSSConfig } from '../one-stop-shop/models/oss-config.model';
import { OSSConfigStorageService } from '../one-stop-shop/services/oss-config-storage.service';
import {
  ContactInformationFieldEnum,
  ContactInformationRequirementEnum,
  OboFlowTypeEnum,
  OnsiteSetup,
  ShiftStrategyEnum,
} from '../shared/models/onsite-setup';
import { computeEffectiveCacheConfig } from '../shared/models/onsite-setup.util';
import { CheckoutUserStorageService } from '../shared/services/checkout-user-storage/checkout-user-storage.service';
import { EfrUserMessageModalService } from '../shared/services/efsta-fiscal/efr-user-message-modal.service';
import { OnsiteSetupsPresetCouponsService } from '../shared/services/onsite-setups-preset-coupons/onsite-setups-preset-coupons.service';
import { OnsiteSetupsStorageService } from '../shared/services/onsite-setups/onsite-setups-storage.service';
import { OnsiteSetupsService } from '../shared/services/onsite-setups/onsite-setups.service';
import { PaymentConfigStorageService } from '../shared/services/payment/payment-config-storage.service';
import { CashChangeCalculatorModalComponent } from './components/cash-change-calculator-modal/cash-change-calculator-modal.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { OnsiteSetupModalComponent } from './components/onsite-setup-modal/onsite-setup-modal.component';
import { ActiveShift, ShiftsActionsEnum } from './components/start-end-shift/start-end-shift.component';
import { CheckoutModalResendService } from './services/checkout-modal-resend/checkout-modal-resend.service';
import { OneStepPurchaseService, PayOneStepQuery, PayOneStepResponse } from './services/one-step-purchase/one-step-purchase.service';
import { TicketingUnsavedChangesBypassService } from './services/ticketing-unsaved-changes-bypass.service';
import { isCancelledTransactionError } from './utils/cancelled-transaction-error.util';

const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-box-office-ticketing',
  standalone: false,
  templateUrl: './box-office-ticketing.component.html',
  styleUrls: ['../../../../theme/general/_box-office.scss', './box-office-ticketing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoxOfficeTicketingComponent extends BaseTicketingComponent implements OnInit, OnDestroy {
  static readonly maxPurchasableDaysLimit = 3;
  #breakpointStateService = inject(BreakpointStateService);
  #cartTimingService = inject(CartTimingService);
  #changeDetectorRef = inject(ChangeDetectorRef);
  #checkoutUserStorageService = inject(CheckoutUserStorageService);
  #destroyRef = inject(DestroyRef);
  readonly #efrUserMessageModalService = inject(EfrUserMessageModalService);
  readonly #igntDialogService = inject(IgntDialogService);
  readonly #checkoutModalFlowService = inject(CheckoutModalFlowService);
  readonly #checkoutPaymentOptionsService = inject(CheckoutPaymentOptionsService);
  readonly #checkoutPaymentDriver = inject(CHECKOUT_PAYMENT_DRIVER);
  readonly #checkoutModalResendService = inject(CheckoutModalResendService);
  readonly #onsiteCheckoutContextResolver = inject(OnsiteCheckoutContextResolver);
  readonly #paymentFlowFeatureService = inject(PaymentFlowFeatureService);
  #isCheckoutModalFlow = false;
  #requestedCheckoutFlow: CheckoutFlowKind = 'fullCheckout';
  #bookingQuestionsModalService: BookingQuestionsModalService = inject(BookingQuestionsModalService);
  #searchBarService = inject(SearchBarService);
  #oboSecondScreenDataService = inject(OboSecondScreenDataService);
  #partnerConfigService = inject(PartnerConfigService);
  #partnerService = inject(PartnerService);
  readonly #fiscalComplianceBlockModalService = inject(FiscalComplianceBlockModalService);
  readonly #onsiteSetupsPresetCouponsService = inject(OnsiteSetupsPresetCouponsService);
  #paymentCheckoutAdyenService = inject(PaymentCheckoutAdyenService);
  #splitPaymentRetryUiService = inject(SplitPaymentRetryUiService);
  #splitPaymentService = inject(SplitPaymentService);
  #ticketingUnsavedChangesBypass = inject(TicketingUnsavedChangesBypassService, { optional: true });
  #activatedRoute = inject(ActivatedRoute);
  #lastRestoredDatetime: string | null = null;
  #location = inject(Location);
  #onsiteSetupSelection$ = new Subject<OnsiteSetup>();
  #toastService = inject(ToastService);
  @ViewChild(ContactInformationComponent) contactInformationRef?: ContactInformationComponent;
  @ViewChild('planDetailCardRef') planDetailCardRef?: PlanDetailCardComponent;
  deviceSelectionInvalid = false;
  cardPaymentAttemptedWithoutDevice = false;
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  readonly maxPaymentMethodInOneStep = 3;
  showCartDetails = false;
  closeIt: WritableSignal<{ timestamp: number }> = signal<{ timestamp: number }>({ timestamp: 0 });
  channel: Channel = Channel.BoxOffice;
  customer: Customer = null;
  emailField = 'email';
  phoneField = 'phoneNumber';
  contactFields: string[] = ['email', 'firstName', 'lastName'];
  lastSelectorStep = contactInformationSelectorStep;
  paymentConfiguration: PaymentConfiguration | null = null;
  isLoadingPaymentConfiguration = false;
  minutesBeforeToExpire = 0.5;
  hasShiftsEnabled = false;
  activeShiftReady = false;
  activeShift: ActiveShift;
  activeShiftReady$: Subject<ActiveShift> = new Subject();
  activeShiftOneStepReady$: Subject<void> = new Subject();
  contactInformation: Partial<ContactInformation>;
  forceShiftActions: Subject<ShiftsActionsEnum> = new Subject();
  isLoadingSelectedSessionDates: boolean;
  onsiteSetupSelected: OnsiteSetup;
  onsiteSetups: OnsiteSetup[] = [];
  PaymentTypeEnum = PaymentType;
  paymentType: PaymentType;
  paymentTypes: PaymentType[];
  showCommonPaymentButton = false;
  cashCalculatorCashReceived: number | null = null;
  useCacheEnabled = false;
  cashModalMandatory = false;
  logErrorModal = true;
  cacheTimeoutInSeconds = 0;
  isCartDetailOpened = false;
  cartTotalMoney: Money;
  showOnlyTotalInPriceViewer = false;
  totalPrintViewerTimeout: NodeJS.Timeout;
  includeTimeSlotCapacity = false;
  showPhoneNumberContactInformation = false;
  showEmailContactInformation = true;
  showCouponOneStep = false;
  coupon: Coupon | null = null;
  couponError: BehaviorSubject<Error | null> = new BehaviorSubject<Error | null>(null);
  forceDisableIncreaseCounter = false;
  disableAddSessionsToCartByCapacity = false;
  seatingProviderEnum = SeatingProviderEnum;
  showPaymentsInLateral = false;
  readonly paymentMethodDisplay = new Map<PaymentType, PaymentMethodDisplay>();
  readonly #customMethodIcons = new Map<PaymentType, IconName>();

  filters: SearchFilter;
  date?: Date;
  shouldResetOboSecondScreenToStandBy = true;
  lateralConfirmButtonEnabled: boolean;
  showDateSelectorFrom = true;
  private paymentInProgress = false;
  private preservedCart: Cart | null = null;

  showDropdownButton = false;
  canOverrideCapacities = false;
  couponCodeApplied = new BehaviorSubject<boolean>(false);
  couponCodeApplied$ = this.couponCodeApplied.asObservable();
  includeShopProducts = false;
  membershipsData: MembershipsData = { memberCode: null, member: null, planDiscounts: [] };

  multiPlanFlowEnabled = this.optimizelyService.isFeatureEnabled(FeatureFlags.BOX_OFFICE_MULTIPLAN_FLOW) || false;
  multiPlanSuccessPageEnabled: boolean = this.optimizelyService.isFeatureEnabled(FeatureFlags.BOX_OFFICE_MULTIPLAN_SUCCESS_PAGE) || false;
  oneStepMultiCartEnabled: boolean = this.optimizelyService.isFeatureEnabled(FeatureFlags.BOX_OFFICE_MULTIPLAN_CART) || false;
  readonly isNewPaymentFlowActive = this.#paymentFlowFeatureService.isNewPaymentFlowActive;

  protected override get shouldUseSeatingHoldTokensBySession(): boolean {
    return this.multiPlanFlowEnabled;
  }

  constructor(
    protected sessionAvailabilityService: SessionAvailabilityService,
    protected planService: PlanService,
    protected trackingService: TrackingService,
    protected translate: TranslateService,
    protected changeDetectorRef: ChangeDetectorRef,
    protected modalService: NgbModal,
    protected seatingSelectorService: SeatingMapService,
    protected cartService: CartService,
    protected errorModalService: ErrorModalService,
    protected optimizelyService: OptimizelyService,
    protected freeSeatingSelectorService: FreeSeatingMapService,
    private customerService: CustomerService,
    private spinnerService: SpinnerService,
    private router: Router,
    private paymentService: PaymentService,
    private paymentConfigStorageService: PaymentConfigStorageService,
    private boxOfficePaymentMethodsService: BoxOfficePaymentMethodsService,
    private onsiteSetupsService: OnsiteSetupsService,
    private onsiteSetupsStorageService: OnsiteSetupsStorageService,
    private oneStepPurchaseService: OneStepPurchaseService,
    private ossConfigStorageService: OSSConfigStorageService,
    private userService: UserService,
    private priceViewerService: PriceViewerPrinterServiceManager,
    private checkoutLogger: CheckoutLoggerService,
    private datadogService: DatadogLogService,
    dualScreenStorageService: DualScreenStorageService,
  ) {
    super(
      sessionAvailabilityService,
      planService,
      trackingService,
      translate,
      changeDetectorRef,
      modalService,
      seatingSelectorService,
      freeSeatingSelectorService,
      cartService,
      errorModalService,
      optimizelyService,
      dualScreenStorageService,
    );
    this.cashModalMandatory = optimizelyService.isFeatureEnabled('obo_cash_modal_mandatory');
    this.showOnlyTotalInPriceViewer = optimizelyService.isFeatureEnabled('obo_only_total_price_viewer');
    this.includeTimeSlotCapacity = optimizelyService.isFeatureEnabled('obo_show_time_slot_capacity');
    this.daysWithActiveSession = this.getMaxPurchasableDays();
    this.showCouponOneStep = optimizelyService.isFeatureEnabled('coupons_in_one_step');
    this.loadOneStepFreeSeatingMapWhenSessionAvailable();
    this.#subscribeToOnsiteSetupSelections();
  }

  get isOneStepFlow(): boolean {
    if (this.onsiteSetupSelected == null) {
      return false;
    }
    return this.onsiteSetupSelected.obo_flow_type === OboFlowTypeEnum.one_step;
  }

  get hasThreePaymentMethods(): boolean {
    return this.paymentTypes?.length === 3;
  }

  ngOnInit(): void {
    const order: Order | undefined = history.state?.order;
    if (order !== undefined) {
      const orderSession = this.#getFirstNotTransferredCartSessionFromOrder(order);
      if (orderSession !== undefined) {
        this.contactInformation = this.getContactInformationFromCartSession(orderSession);
        this.selectCartSessionTimeSlot(orderSession);
      }
    }
    this.priceViewerService.clear(this.onsiteSetupSelected);

    this.oneStepPurchaseService.franceAsyncFiscalFailure$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.paymentInProgress = false;
      this.spinnerService.hide();
      this.clearCart();
    });

    combineLatest([this.#loadSetupList(), this.activeShiftReady$])
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(([onsiteSetups, activeShift]: [OnsiteSetup[] | null, ActiveShift]) => {
        this.onsiteSetups = onsiteSetups || [];
        if (activeShift && this.onsiteSetups.length > 0) {
          const currentOnsiteSetup = this.onsiteSetups.find(setup => setup.id === activeShift.onsiteSetupId);
          this.updateOnsiteSetupSelected(currentOnsiteSetup);
        } else {
          this.#selectOnsiteSetup(this.onsiteSetups);
        }
      });

    this.paymentConfigStorageService
      .listenStorage()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        if (this.onsiteSetupSelected && this.partner) {
          this.updatePaymentMethodsAvailable(this.partner.countryCode);
          this.#changeDetectorRef.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.shouldResetOboSecondScreenToStandBy) {
      this.#oboSecondScreenDataService.resetCart();
    }
    this.priceViewerService.clear(this.onsiteSetupSelected);
    super.ngOnDestroy();
  }

  loadNewSearch(filters: SearchFilter, date?: Date): void {
    this.filters = filters;
    this.date = date;
    this.priceViewerService.clear(this.onsiteSetupSelected);
    const preserveCart = this.#shouldPreserveCartOnPlanChange(filters);

    if (preserveCart) {
      const cartToPreserve = this.nonConfirmedCart ?? this.preservedCart;
      if (cartToPreserve && (cartToPreserve.sessionItemsByDatetime?.size ?? 0) > 0) {
        this.preservedCart = cartToPreserve.clone();
      }
      this.#lastRestoredDatetime = null;
    } else {
      this.clearCoupon();
      this.preservedCart = null;
      this.#lastRestoredDatetime = null;
    }
    this.#changeDetectorRef.markForCheck();

    if (filters?.selectedPlan && this.activeShiftReady) {
      const userAttributes = {
        plan_id: filters.selectedPlan.id.toString(),
      };
      const cacheConfig = computeEffectiveCacheConfig({
        planId: filters.selectedPlan.id,
        onsiteSetup: this.onsiteSetupSelected,
      });
      this.useCacheEnabled = cacheConfig.useCacheEnabled;
      this.cacheTimeoutInSeconds = cacheConfig.cacheTimeoutInSeconds;
      this.cashModalMandatory = this.optimizelyService.isFeatureEnabled('obo_cash_modal_mandatory', userAttributes);
      this.includeTimeSlotCapacity = this.optimizelyService.isFeatureEnabled('obo_show_time_slot_capacity', userAttributes);
      this.showPhoneNumberContactInformation = this.#shouldShowPhoneNumber();
      this.showEmailContactInformation = this.#shouldShowEmail();
      this.allowMultiTimeSlotSelection = this.#getAllowMultiTimeSlotSelectionFeatureFlag(filters.selectedPlan);
      // Box Office is the page the next-upcoming-session preselection is for (GAME-1552).
      this.preselectNextUpcomingSession = this.resolveNextUpcomingSessionFlag(filters.selectedPlan);
      this.daysWithActiveSession = this.getMaxPurchasableDays();
      if (this.onsiteSetupSelected) {
        super.loadNewSearch(filters, date, preserveCart);
        this.#changeDetectorRef.markForCheck();
      } else {
        this.#selectOnsiteSetup(this.onsiteSetups);
      }
    }

    this.updateOboSecondScreenPlace(filters?.selectedPlace?.id);
  }

  private updateOboSecondScreenPlace(placeId?: number): void {
    this.#oboSecondScreenDataService.setPlace(placeId);
    this.#changeDetectorRef.markForCheck();
  }

  #shouldPreserveCartOnPlanChange(newFilters: SearchFilter): boolean {
    if (!this.multiPlanFlowEnabled) {
      return false;
    }

    if (!this.partner || !this.selectedCity) {
      return false;
    }

    const isSamePartner = this.partner.id === newFilters.partner?.id;
    const isSameCity = this.selectedCity.id === newFilters.selectedCity?.id;

    return isSamePartner && isSameCity;
  }

  showOnsiteSetupModal(forceShowModal: boolean = false, manual: boolean = false): void {
    if (this.modalService.hasOpenModals() && !forceShowModal) {
      return;
    }
    const modal = this.modalService.open(OnsiteSetupModalComponent);
    modal.componentInstance.selectedOnsiteSetup = this.onsiteSetupSelected;
    modal.componentInstance.isActiveShift = Boolean(this.activeShift);
    modal.componentInstance.manual = manual;

    const modalResponse = modal.componentInstance.response.pipe(
      take(1),
      finalize(() => modal.close()),
    );

    merge(modalResponse, modal.dismissed.pipe(mapTo(undefined as void)))
      .pipe(take(1))
      .subscribe((response: OnsiteSetup) => {
        if (response) {
          this.updateOnsiteSetupSelected(response);
        } else if (!this.onsiteSetupSelected) {
          this.showOnsiteSetupModal(true);
        }
      });
  }

  setActiveShift(shift: ActiveShift): void {
    this.activeShift = shift;
    this.activeShiftReady = true;
    this.activeShiftOneStepReady$.next();
    if (!this.onsiteSetupSelected) {
      this.activeShiftReady$.next(shift);
    }
  }

  sessionsReady(): boolean {
    return !this.isLoadingSessions && (!this.hasShiftsEnabled || this.activeShiftReady) && !this.isLoadingSelectedSessionDates;
  }

  updateSeatsInCart(data: FreeSeatResponse): void {
    if (!this.selectedSession?.selectedDatetime) {
      super.updateSeatsInCart(data);
      this.updateCartTotal();
      this.updateOboSecondScreenCart();
      this.#changeDetectorRef.markForCheck();
      return;
    }

    const duplicateSeatAddition = this.#findDuplicateSeatAddition(data);
    if (duplicateSeatAddition) {
      this.#syncDuplicateSeatAddition(
        data,
        duplicateSeatAddition.sessionId,
        duplicateSeatAddition.sessionSeats,
        duplicateSeatAddition.index,
      );
      this.nonConfirmedCart = this.getCart();
      this.updateOboSecondScreenCart();
      this.#changeDetectorRef.markForCheck();
      return;
    }
    super.updateSeatsInCart(data);
    this.updateCartTotal();
    this.updateOboSecondScreenCart();
    this.#changeDetectorRef.markForCheck();
  }

  #syncDuplicateSeatAddition(data: FreeSeatResponse, sessionId: string, sessionSeats: SeatInfo[], existingIndex: number): void {
    this.#applyHoldTokenFromSeatEmission(data);
    this.#backfillSeatInfoLabels(sessionId, sessionSeats, existingIndex, data.seatInfo);
  }

  #applyHoldTokenFromSeatEmission(data: FreeSeatResponse): void {
    if (!data.adding || !data.holdToken) {
      return;
    }
    this.seatingToken = data.holdToken;
    this.seatingHoldTokensBySessionId.set(data.sessionId.toString(), data.holdToken);
    if (this.seatingMapState) {
      this.seatingMapState.hold_token = data.holdToken;
      this.seatingMapState.seating_provider = this.seatingProvider;
    }
  }

  #findDuplicateSeatAddition(data: FreeSeatResponse): { index: number; sessionId: string; sessionSeats: SeatInfo[] } | null {
    if (!data?.adding) {
      return null;
    }
    const seatReference = data.seatInfo?.seatReference;
    if (!seatReference) {
      return null;
    }
    const sessionId = data.sessionId.toString();
    const sessionSeats = this.selectedTicketsSeatsBySessionId.get(sessionId);
    const index = sessionSeats?.findIndex(seat => seat.seatReference === seatReference) ?? -1;
    if (!sessionSeats || index === -1) {
      return null;
    }
    return { index, sessionId, sessionSeats };
  }

  #backfillSeatInfoLabels(sessionId: string, sessionSeats: SeatInfo[], existingIndex: number, incoming: SeatInfo): void {
    const existing = sessionSeats[existingIndex];
    const seatLabel = existing.seatLabel ?? incoming.seatLabel;
    const displayedLabel = existing.displayedLabel ?? incoming.displayedLabel;
    if (seatLabel === existing.seatLabel && displayedLabel === existing.displayedLabel) {
      return;
    }
    const updatedSeats = [...sessionSeats];
    updatedSeats[existingIndex] = new SeatInfo(existing.seatReference, seatLabel, displayedLabel);
    const mergedMap = new Map(this.selectedTicketsSeatsBySessionId);
    mergedMap.set(sessionId, updatedSeats);
    this.selectedTicketsSeatsBySessionId = mergedMap;
  }

  updateOboSecondScreenCart(): void {
    let cartToSync = this.nonConfirmedCart;
    if (cartToSync != null) {
      cartToSync = cartToSync.clone();
      cartToSync.taxItems = undefined;
    }
    this.#oboSecondScreenDataService.setCart(cartToSync);
  }

  override selectDate(dateAvailability: DateAvailability): void {
    if (this.manageAsFreeSeatingMap) {
      this.seatingMapUrl = null;
      this.seatingMapState = null;
      this.seatingToken = '';
      this.seatingHoldTokensBySessionId = new Map();
      this.selectedTicketsSeatsBySessionId = new Map();
      this.clearCart();
      this.clearSelectedTicketsReferences();
    }

    super.selectDate(dateAvailability);
  }

  override selectSession(selectedSession: SessionAvailabilitySummaryByDate): void {
    const newDatetime = selectedSession?.selectedDatetime?.datetime;
    const isNewSession = newDatetime !== this.#lastRestoredDatetime;

    if (this.multiPlanFlowEnabled && isNewSession && newDatetime) {
      this.#restoreTicketCountersFromPreservedCart(selectedSession);
      this.#lastRestoredDatetime = newDatetime;
    }
    super.selectSession(selectedSession);
  }

  #restoreTicketCountersFromPreservedCart(selectedSession: SessionAvailabilitySummaryByDate): void {
    if (
      !this.preservedCart ||
      !selectedSession?.selectedDatetime?.datetime ||
      !selectedSession.selectedDatetime.sessionAvailabilityList?.length
    ) {
      return;
    }

    const datetime = normalizeCartDatetime(selectedSession.selectedDatetime.datetime);
    const cartSessionsForDatetime = this.preservedCart.sessionItemsByDatetime.get(datetime);

    if (!cartSessionsForDatetime?.length) {
      return;
    }

    const availableSessionIds = new Set(selectedSession.selectedDatetime.sessionAvailabilityList.map(s => s.id.toString()));

    let hasRestoredTickets = false;
    const restoredSeatsBySessionId = new Map<string, SeatInfo[]>();
    for (const cartSession of cartSessionsForDatetime) {
      const sessionIdStr = cartSession.sessionId.toString();
      const isValidSession = availableSessionIds.has(sessionIdStr) && cartSession.units > 0;

      if (isValidSession) {
        this.selectedTicketsBySessionId.set(sessionIdStr, cartSession.units);
        if (cartSession.sessionName) {
          this.selectedTicketsBySessionType.set(cartSession.sessionName, cartSession.units);
        }
        const seatInfos = this.#getSeatInfosFromCartSession(cartSession);
        if (seatInfos.length > 0) {
          restoredSeatsBySessionId.set(sessionIdStr, seatInfos);
        }
        hasRestoredTickets = true;
      }
    }

    if (hasRestoredTickets) {
      this.selectedTicketsBySessionId = new Map(this.selectedTicketsBySessionId);
      this.selectedTicketsBySessionType = new Map(this.selectedTicketsBySessionType);
      if (restoredSeatsBySessionId.size > 0) {
        const mergedSeats = new Map(this.selectedTicketsSeatsBySessionId);
        restoredSeatsBySessionId.forEach((seats, sessionId) => mergedSeats.set(sessionId, seats));
        this.selectedTicketsSeatsBySessionId = mergedSeats;
      }
    }
  }

  selectTicketCounter(ticketTypeCounter: { bySessionId: Map<string, number>; bySessionType: Map<string, number> }): void {
    super.selectTicketCounter(ticketTypeCounter);
    this.checkCartSessionsIsAboutToExpire();
    this.updateCartTotal();
    this.updateCapacityLimit();
  }

  private updateCartTotal(): void {
    if (this.isOneStepFlow) {
      if (this.coupon) {
        this.applyCouponDiscountOneStep(this.coupon.code);
      } else {
        this.updateCartTotalMoney(this.getCurrentCart());
      }
      this.printTotal(this.onsiteSetupSelected, this.cartTotalMoney);
      this.trackingService.track(
        new ClickAddToCartEvent({
          ...this.getCartMixpanelData(),
          ticketing_flow: 'date_ticket',
        }),
      );
    }
    if (!this.paymentInProgress && this.getCurrentCart() === null && this.coupon) {
      this.couponCodeApplied.next(false);
      this.clearCoupon();
      this.clearCart();
    }
  }

  private updateCartTotalMoney(cart: Cart | null, coupon?: Coupon): void {
    const totalMoney: Money = cart !== null ? cart.calculateTotal(coupon, this.membershipsData.planDiscounts) : new Money(0, '');
    const currency = totalMoney.currency || this.currency || '';
    this.cartTotalMoney = new Money(totalMoney.amount, currency);
    this.changeDetectorRef.detectChanges();
  }

  private updateCapacityLimit(): void {
    const maxCapacity = this.selectedSession?.selectedDatetime?.capacity;
    if (!this.includeTimeSlotCapacity || maxCapacity === null) {
      return;
    }
    const currentNumberOfTickets = this.nonConfirmedCart?.getNumberOfTicketCounts(true) ?? 0;
    const numberOfTicketsExcludingOverride = this.nonConfirmedCart?.getNumberOfTicketCounts(false) ?? 0;
    const hasNormalTickets = numberOfTicketsExcludingOverride > 0;
    this.forceDisableIncreaseCounter = hasNormalTickets && currentNumberOfTickets >= maxCapacity;
    this.disableAddSessionsToCartByCapacity = hasNormalTickets && currentNumberOfTickets > maxCapacity;
  }

  getButtonImageUrl(paymentType: PaymentType): string | null {
    return this.paymentMethodDisplay.get(paymentType)?.imageUrl ?? null;
  }

  getCustomIconName(paymentType: PaymentType): IconName | null {
    return this.#customMethodIcons.get(paymentType) ?? null;
  }

  addSessionsToCartIsDisabled(): boolean {
    return this.disableAddSessionsToCartByCapacity || super.addSessionsToCartIsDisabled();
  }

  noSessionSelected(): boolean {
    return this.selectedSession == null;
  }

  private printTotal(onsiteSetup: OnsiteSetup, total: Money): void {
    if (this.totalPrintViewerTimeout) {
      clearTimeout(this.totalPrintViewerTimeout);
    }
    if (total.amount <= 0) {
      this.priceViewerService.clear(this.onsiteSetupSelected);
      return;
    }

    this.totalPrintViewerTimeout = setTimeout(
      () => {
        this.priceViewerService.showTotal(onsiteSetup, total.currency, total.amount);
        this.totalPrintViewerTimeout = null;
      },
      this.showOnlyTotalInPriceViewer ? 0 : 1500,
    );
  }

  addSessionsToCart(): void {
    this.checkCartSessionsIsAboutToExpire();
    this.showShiftModal();
  }

  showShiftModal(): void {
    const hasCompatibleActiveShift = this.currency === this.activeShift?.currency;

    if (!this.hasShiftsEnabled || hasCompatibleActiveShift) {
      this.manageAsFreeSeatingMap ? super.generateFreeSeatingMap() : super.addSessionsToCart();
      return;
    }

    if (!this.activeShift) {
      if (this.onsiteSetupSelected.shift_strategy === ShiftStrategyEnum.mandatory) {
        this.askUserOpenMandatoryShift()
          .pipe(takeUntil(this.destroy$), filter(Boolean))
          .subscribe(() => (this.manageAsFreeSeatingMap ? super.generateFreeSeatingMap() : super.addSessionsToCart()));
      } else {
        this.askUserContinueWithoutShift()
          .pipe(takeUntil(this.destroy$), filter(Boolean))
          .subscribe(() => (this.manageAsFreeSeatingMap ? super.generateFreeSeatingMap() : super.addSessionsToCart()));
      }
    } else if (!hasCompatibleActiveShift) {
      this.askUserCloseCurrentShift().pipe(takeUntil(this.destroy$)).subscribe();
    }
  }

  shouldDisplayShiftControls(): boolean {
    const hasMandatoryFilters = Boolean(this.selectedCity && this.selectedPlace && this.currency);
    return Boolean(this.currentStep?.id === this.ticketSelectorStep.id && this.hasShiftsEnabled && hasMandatoryFilters);
  }

  getMandatoryFields(): string[] {
    const mandatoryFields: string[] = [];

    if (this.cart !== null && passSessionInCart(this.regularSessionAvailabilitySummaryByDateList, this.cart)) {
      return this.contactFields;
    }

    const hasSessionsInFuture = this.cart && this.cart.hasSessionsInFuture;
    const hasContactInfoRequirement =
      this.onsiteSetupSelected?.contact_information_setup?.requirement_on_current_day == ContactInformationRequirementEnum.REQUIRED;

    if (hasSessionsInFuture || hasContactInfoRequirement) {
      if (this.isOneStepFlow) {
        if (this.showEmailContactInformation) {
          mandatoryFields.push(this.emailField);
        }

        if (this.showPhoneNumberContactInformation) {
          mandatoryFields.push(this.phoneField);
        }
      } else {
        mandatoryFields.push(this.emailField);
      }
    }

    return mandatoryFields;
  }

  updateCustomer(customer: Customer | null): void {
    if (!customer || customer.type === CustomerType.ANONYMOUS) {
      this.customer = null;
      return;
    }
    this.customer = customer;
    this.customer.cityStandardId = this.selectedCity.id;
  }

  isCheckoutEnabled(): boolean {
    if (this.isLoadingCart || !this.cart) {
      return;
    }

    if (this.cart.hasSessionsInFuture && (!this.customer || this.customer.email === '')) {
      return;
    }

    if (this.onsiteSetupSelected?.contact_information_setup?.requirement_on_current_day == ContactInformationRequirementEnum.REQUIRED) {
      if (this.showEmailContactInformation) {
        if (!this.customer || this.customer.email === '') {
          return;
        }
      }
      if (this.showPhoneNumberContactInformation) {
        if (!this.customer || this.customer.phoneNumber === '') {
          return;
        }
      }
    }

    return true;
  }

  goToCheckout(): void {
    if (this.contactInformationRef) {
      if (!this.contactInformationRef.validateForm()) {
        return;
      }
      const customer = this.contactInformationRef.getCustomerFromForm();
      if (customer) {
        this.updateCustomer(customer);
      }
    }
    this.spinnerService.show();
    this.customerService
      .create(this.partner.id, this.customer, this.channelId)
      .pipe(
        concatMap((response: any) => {
          if (response?.data) {
            this.customer = response.data;
            this.checkoutLogger.info('Going to prepare cart', this.getCurrentLoggerContext(CheckoutStageEnum.CART_PREPARE), {
              cartId: this.cart?.id,
            });
            return this.cartService.prepareAndGetCart({
              partnerId: this.partner.id,
              cartId: this.cart.id,
              userId: response.data.id,
              planId: this.plan.id,
              placeId: this.plan.places[0].id,
              onsiteSetupId: this.onsiteSetupSelected?.id,
              channel: this.channel,
            });
          }
          return throwError(response);
        }),
        catchError(err => {
          this.checkoutLogger.error(
            `Fail on prepare cart: ${err.toString()}`,
            this.getCurrentLoggerContext(CheckoutStageEnum.CART_PREPARE),
            { cartId: this.cart?.id, error: err },
          );
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(
        response => {
          this.priceViewerService.clear(this.onsiteSetupSelected);
          this.spinnerService.hide();
          if (response && response.data) {
            this.cart = response.data;
            this.checkoutLogger.info('Successfully prepared cart', this.getCurrentLoggerContext(CheckoutStageEnum.CART_PREPARE), {
              cartId: this.cart?.id,
            });
            this.seatingMapUrl = null;
            this.seatingMapState = null;
            this.sendPrepareCartEvent();
            if (!this.customer) {
              this.checkoutLogger.error(
                'Cannot navigate to checkout: customer is null',
                this.getCurrentLoggerContext(CheckoutStageEnum.CART_PREPARE),
              );
              this.spinnerService.hide();
              this.showModalError();
              return;
            }
            this.#checkoutUserStorageService.setUserIdForCart(this.cart.id, this.customer.id);
            const navigationExtras: NavigationExtras = {
              state: {
                cart: this.cart,
                plan: this.plan,
                userId: this.customer.id,
              },
              queryParamsHandling: 'merge',
            };
            this.shouldResetOboSecondScreenToStandBy = false;
            this.#ticketingUnsavedChangesBypass?.markPendingBypass();
            this.router.navigate(['/box-office/checkout/', this.cart.id], navigationExtras);
          } else {
            this.checkoutLogger.error(
              'Error on prepare cart',
              this.getCurrentLoggerContext(CheckoutStageEnum.CART_PREPARE, {
                message: response.error?.message,
                code: response.error?.code,
              }),
              { cartId: this.cart?.id, error: response.error },
            );
            this.spinnerService.hide();
            if (this.#fiscalComplianceBlockModalService.openIfNeeded(response)) {
              return;
            }
            this.showModal('common.errorTitle', response.error?.message, response.error?.code);
          }
        },
        (response: BaseResponse<any>) => {
          this.checkoutLogger.error(
            'Error on prepare cart',
            this.getCurrentLoggerContext(CheckoutStageEnum.CART_PREPARE, {
              message: response.error?.message,
              code: response.error?.code,
            }),
            { cartId: this.cart?.id, error: response.error },
          );
          this.spinnerService.hide();
          if (this.#fiscalComplianceBlockModalService.openIfNeeded(response)) {
            return;
          }
          this.showModal('common.errorTitle', response.error?.message, response.error?.code);
        },
      );
  }

  getCurrentCart(): Cart {
    return this.isOneStepFlow || this.manageAsFreeSeatingMap ? this.nonConfirmedCart : this.cart;
  }

  cartHasItems(): boolean {
    const current = this.getCurrentCart();
    return current != null && current.getNumberOfTicketAndProductCounts() > 0;
  }

  openLateralPayments(): void {
    if (this.cartTotalMoney?.amount === 0) {
      this.clickOnPayOneStep(this.PaymentTypeEnum.FREE);
      return;
    }
    this.showPaymentsInLateral = true;
    this.paymentType = null;
  }

  selectPaymentType(paymentType: PaymentType): void {
    this.paymentType = paymentType;
    this.updateLateralConfirmButton();
  }

  private updateLateralConfirmButton(): void {
    this.lateralConfirmButtonEnabled = !!this.paymentType;
  }

  clickOnPayOneStep(paymentType?: PaymentType): void {
    if (this.#shouldHighlightDeviceSelector(paymentType)) {
      this.cardPaymentAttemptedWithoutDevice = true;
      this.deviceSelectionInvalid = true;
      this.planDetailCardRef?.focusDeviceSelect();
      return;
    }

    this.currentStep = this.ticketSelectorStep;

    if (paymentType) {
      this.paymentType = paymentType;
    }

    if (this.nonConfirmedCart) {
      this.priceViewerService.showTotal(this.onsiteSetupSelected, this.nonConfirmedCart.total.currency, this.nonConfirmedCart.total.amount);
    }

    this.showPaymentsInLateral = false;
    this.validateShift()
      .pipe(
        take(1),
        switchMap(() =>
          this.handleCartContent().pipe(
            take(1),
            switchMap(() =>
              this.checkCartSessionsIsAboutToExpireObservable().pipe(
                take(1),
                switchMap(() =>
                  this.handleContactInformation().pipe(
                    take(1),
                    switchMap(() =>
                      this.handleBookingQuestions().pipe(
                        take(1),
                        switchMap(() =>
                          this.#openCheckoutModalIfNeeded().pipe(
                            take(1),
                            switchMap(() =>
                              this.handleCashCalculator().pipe(
                                take(1),
                                switchMap((cash: { amount: number } | null) =>
                                  this.validateCashCalculator(cash).pipe(
                                    take(1),
                                    switchMap(() => {
                                      this.cashCalculatorCashReceived = cash !== null ? cash.amount : null;
                                      return this.#payInOneStepWithModalRetry();
                                    }),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        filter(response => response !== null),
        finalize(() => {
          this.#isCheckoutModalFlow = false;
          this.#requestedCheckoutFlow = 'fullCheckout';
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response: PayOneStepResponse) => {
          this.#sendCreateOrderEvent(response);
          const navigationExtras: NavigationExtras = {
            state: {
              plan: this.plan,
              autoPrint: true,
              paymentTransactionId: this.oneStepPurchaseService.getLastPaymentTransactionId(this.cart?.id),
            },
            queryParamsHandling: 'merge',
          };
          this.updateOboSecondScreenPayment();
          this.shouldResetOboSecondScreenToStandBy = false;
          const doNavigate = (): void => {
            this.#efrUserMessageModalService
              .showIfPresent()
              .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
              .subscribe(() => {
                this.#ticketingUnsavedChangesBypass?.markPendingBypass();
                if (this.multiPlanSuccessPageEnabled && this.cart?.id) {
                  this.router.navigate(['/box-office/purchased-cart/', this.cart.id], navigationExtras);
                } else {
                  this.router.navigate(['/box-office/order/', response.order.id], navigationExtras);
                }
              });
          };
          if (this.#isCheckoutModalFlow) {
            const isCheckoutModalFlow = this.#isCheckoutModalFlow;
            this.#checkoutPaymentDriver.modalClosed$
              .pipe(
                take(1),
                switchMap(() => (isCheckoutModalFlow ? of(true) : this.#handlePostBookingQuestions(response.order.id))),
                take(1),
                takeUntilDestroyed(this.#destroyRef),
              )
              .subscribe(() => doNavigate());
          } else {
            doNavigate();
          }
        },
        error: error => {
          this.#ticketingUnsavedChangesBypass?.clearPendingBypass();

          if (error instanceof FiscalComplianceBlockPrepareError) {
            this.#fiscalComplianceBlockModalService.open(error.code, () => this.#checkoutModalFlowService.dismissActiveModal());
            return;
          }

          // While a modal payment session is active the failure is owned by the checkout modal
          // (it shows the payment-failed screen), so we never surface the legacy error popup.
          if (this.#isModalPaymentSessionActive()) {
            return;
          }

          // A cancellation of the checkout-modal journey is owned end to end by the modal
          // (B2BO-7939): the modal either just closed (nothing recorded yet) or already showed its
          // Cancel Confirmation step (recorded legs cancelled and refunded). The legacy
          // cancellation confirmation / error popups must never surface for it.
          if (this.#isCheckoutModalFlow && isCancelledTransactionError(error)) {
            return;
          }

          const transactionId = this.oneStepPurchaseService.getLastPaymentTransactionId(this.cart?.id);

          if (this.paymentType === PaymentType.CARD_SPLIT && transactionId && this.oneStepPurchaseService.getIsCancellingPayment()) {
            this.#paymentCheckoutAdyenService.cancelHadCompletedPayments$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe({
              error: () => this.#showPaymentError(error),
              next: hadCompletedPayments => {
                if (hadCompletedPayments) {
                  this.#splitPaymentRetryUiService.showCancellationErrorModal(this.partner.id, this.cart.id, transactionId);
                } else {
                  this.#showPaymentError(error);
                }
              },
            });
          } else {
            this.#showPaymentError(error);
          }
        },
      });
  }

  hasAllMandatoryFilters(hasDataChange: boolean): void {
    this.#searchBarService.closeOnMobileWhenAllMandatoryFilters(hasDataChange, this.isMobile, this.closeIt);
  }

  #showPaymentError(error: string | { error?: { message?: string }; message?: string }): void {
    if (typeof error === 'string') {
      const formattedErrorMessage = this.formatErrorMessage(error);
      const [errorTitle, errorMessage, errorCode] = formattedErrorMessage;
      this.showModal(errorTitle, errorMessage, errorCode);
    } else {
      this.showModalError(error?.message || error?.error?.message || undefined);
    }
  }

  #generatePayOneStepQueryParams(): PayOneStepQuery {
    return {
      partnerId: this.partner.id,
      cartId: this.cart.id,
      checkoutFlow: this.#isCheckoutModalFlow ? 'modal' : 'legacy',
      planId: this.plan.id,
      placeId: this.plan.places[0].id,
      onsiteSetupId: this.onsiteSetupSelected?.id,
      paymentType: this.paymentType,
      paymentConfiguration: this.paymentConfiguration,
      channel: Channel.BoxOffice,
      cityId: this.selectedCity.id,
      customer: this.customer,
      couponCode: this.#getCouponCode(),
    };
  }

  override getCart(): Cart | null {
    if (!this.selectedSession) {
      return this.multiPlanFlowEnabled ? (this.nonConfirmedCart ?? this.preservedCart?.clone() ?? null) : null;
    }

    const baseCart = this.#getBaseCart();

    if (this.#shouldReturnPreservedCartWithoutChanges()) {
      return baseCart?.clone() ?? null;
    }

    const sessionContextBySessionId = this.buildSessionCartContextForCart();
    return generateCart({
      session: this.selectedSession,
      productSessions: this.sessionAvailabilitySummary?.productSessions ?? [],
      selectedTickets: {
        bySessionType: this.selectedTicketsBySessionType,
        bySessionId: this.selectedTicketsBySessionId,
        bySeating: this.selectedTicketsSeatsBySessionId,
      },
      timezone: this.timezone,
      seatingProvider: this.seatingProvider,
      cart: baseCart,
      allowMultiTimeSlotSelection: this.isOneStepFlow && this.allowMultiTimeSlotSelection,
      currentPlanIds: this.#getCurrentPlanIds(),
      sessionContextBySessionId: sessionContextBySessionId.size > 0 ? sessionContextBySessionId : undefined,
    });
  }

  protected override onGetSessionAvailableEnd(): void {
    if (this.isOneStepFlow && this.hasPlanSeating()) {
      this.allowMultiTimeSlotSelection = this.#getAllowMultiTimeSlotSelectionFeatureFlag();
      return;
    }
    super.onGetSessionAvailableEnd();
  }

  #getAllowMultiTimeSlotSelectionFeatureFlag(plan?: SelectOption): boolean {
    const currentPlan = plan ?? this.selectedPlan;
    const userAttributes: UserAttributes = currentPlan ? { plan_id: currentPlan.id.toString() } : {};
    return this.optimizelyService.isFeatureEnabled(FeatureFlags.MULTI_TIME_SLOT_SELECTION, userAttributes) ?? false;
  }

  #getBaseCart(): Cart {
    if (this.multiPlanFlowEnabled) {
      return this.nonConfirmedCart ?? this.preservedCart ?? this.cart ?? new Cart();
    }
    return this.nonConfirmedCart ?? new Cart();
  }

  #shouldReturnPreservedCartWithoutChanges(): boolean {
    if (!this.multiPlanFlowEnabled || !this.preservedCart) {
      return false;
    }

    const hasNoTicketsSelected = this.selectedTicketsBySessionId.size === 0 || this.selectedTicketsBySessionType.size === 0;

    const hasExistingSessions =
      (this.nonConfirmedCart?.sessionItemsByDatetime?.size ?? 0) > 0 || (this.preservedCart?.sessionItemsByDatetime?.size ?? 0) > 0;

    return hasNoTicketsSelected && hasExistingSessions;
  }

  #getCurrentPlanIds(): number[] {
    const sessionAvailabilities = this.selectedSession?.selectedDatetime?.sessionAvailabilityList ?? [];
    const planIds = new Set<number>();
    for (const session of sessionAvailabilities) {
      if (session.mainPlanId) {
        planIds.add(session.mainPlanId);
      }
    }
    return Array.from(planIds);
  }

  /**
   * @param error
   * @private
   * Returns "errorTitle,errorMessage,errorCode" The chunk errorCode is optional
   */
  private formatErrorMessage(error: string): string {
    const chunks = error.split(',');
    if (chunks.length < 2) {
      return 'common.errorTitle.errors.generic';
    } else if (chunks.length <= 3) {
      return error;
    } else {
      return chunks.slice(0, 3).join('.');
    }
  }

  private handleCashCalculator(): Observable<{ amount: number } | null> {
    if (!this.cart || (this.cart.total?.amount ?? 0) <= 0) {
      return of({ amount: 0 });
    }
    if (this.#isCheckoutModalFlow) {
      return of({ amount: 0 });
    }
    return this.showCashCalculatorModal();
  }

  private validateCashCalculator(cashReceived: { amount: number } | null): Observable<{ amount: number }> {
    if (this.paymentType === PaymentType.CASH && !cashReceived) {
      this.resetPaymentState();
      return EMPTY;
    }
    return of(cashReceived);
  }

  private handleContactInformation(): Observable<void> {
    const member = this.membershipsData.member;
    if (member) {
      return this.#showMembershipsAcceptTermsModal(member).pipe(mergeMap(() => of(void 0)));
    } else if (this.cart?.hasSessionsInFuture || !this.canSkipContactInformation()) {
      return this.showContactInformationModal().pipe(mergeMap((customer: Customer | null) => (customer ? of(void 0) : EMPTY)));
    } else {
      return of(void 0);
    }
  }

  private validateShift(): Observable<void> {
    const hasCompatibleActiveShift = this.currency === this.activeShift?.currency;

    if (!this.hasShiftsEnabled || hasCompatibleActiveShift) {
      return of(void 0);
    }

    if (!this.activeShift) {
      const shiftIsMandatory = this.onsiteSetupSelected.shift_strategy === ShiftStrategyEnum.mandatory;
      if (shiftIsMandatory) {
        return this.askUserOpenMandatoryShift().pipe(
          mergeMap(confirmed => (confirmed ? this.activeShiftOneStepReady$.asObservable() : EMPTY)),
        );
      }
      return this.askUserContinueWithoutShift().pipe(
        mergeMap(confirmed => (confirmed ? of(void 0) : this.activeShiftOneStepReady$.asObservable())),
      );
    }

    if (!hasCompatibleActiveShift) {
      return this.askUserCloseCurrentShift().pipe(mergeMap(() => EMPTY));
    }

    return EMPTY;
  }

  private showCashCalculatorModal(): Observable<{ amount: number } | null> {
    if (this.paymentType !== PaymentType.CASH) {
      return of(null);
    }

    const modal = this.modalService.open(CashChangeCalculatorModalComponent);
    modal.componentInstance.cart = this.getCurrentCart();
    modal.componentInstance.cashModalMandatory = this.cashModalMandatory;
    return merge(modal.componentInstance.cashReceived, modal.dismissed.pipe(map((): { amount: number } | null => null))) as Observable<{
      amount: number;
    } | null>;
  }

  #payInOneStep(): Observable<PayOneStepResponse | null> {
    this.showPaymentsInLateral = false;
    if (this.paymentInProgress || this.oneStepPurchaseService.isHandlingFranceAsyncFiscalFailure()) {
      return of(null);
    }
    this.#ticketingUnsavedChangesBypass?.markPendingBypass();
    this.spinnerService.show();
    this.paymentInProgress = true;
    if (this.cart?.id) {
      this.#cartTimingService.startPrepareCartTiming(this.cart.id);
    }
    return this.oneStepPurchaseService.payOneStep(this.#generatePayOneStepQueryParams(), this.#destroyRef).pipe(
      finalize(() => {
        this.paymentInProgress = false;
        this.spinnerService.hide();
      }),
    );
  }

  // Authoritative "a modal payment session is active" signal, owned by the checkout domain
  // (set on beginSession, cleared on reset when the modal closes). Preferred over the local
  // #isCheckoutModalFlow flag for the failure path so the outcome ownership stays with the modal.
  #isModalPaymentSessionActive(): boolean {
    return this.#checkoutPaymentDriver.isActive();
  }

  #payInOneStepWithModalRetry(): Observable<PayOneStepResponse | null> {
    return this.#checkoutModalResendService.payWithModalResend({
      onSessionEndedWithoutResend: () => this.#ticketingUnsavedChangesBypass?.clearPendingBypass(),
      payInOneStep: () => this.#payInOneStep(),
      setPaymentType: (paymentType: PaymentType) => {
        this.paymentType = paymentType;
      },
    });
  }

  updateOboSecondScreenPayment() {
    this.#oboSecondScreenDataService.finishPayment();
  }

  private showContactInformationModal(): Observable<Customer | null> {
    const dialogRef = this.#igntDialogService.openModal<ContactInformationModalResult>(ContactInformationModalComponent, {
      data: {
        defaultCountry: this.partner?.countryCode ?? null,
        mandatoryFields: this.getMandatoryFields(),
        previousUserDetails: null,
        showEmail: this.showEmailContactInformation,
        showPhoneNumber: this.showPhoneNumberContactInformation,
      },
      size: 'sm',
    });

    return dialogRef.closed$.pipe(
      map((result: ContactInformationModalResult): Customer | null =>
        result != null && typeof result === 'object' && 'type' in result && result.type === CustomerType.USER ? result : null,
      ),
      map((customer: Customer | null) => {
        if (customer) {
          this.updateCustomer(customer);
          this.sendMixpanelEvent('checkout');
        }
        return customer;
      }),
    );
  }

  private sendMixpanelEvent(action: 'checkout' | 'cancel'): void {
    const user = this.userService.getUser();

    this.trackingService.track(
      new ClickContactInformationOnStepEvent({
        plan_id: this.plan.id,
        partner_name: this.partner.name,
        cashier_name: user.name,
        cashier_email: user.email,
        action: action,
      }),
    );
  }

  #sendCreateOrderEvent(response: PayOneStepResponse): void {
    const isUsingCashCalculator = this.paymentType === PaymentType.CASH && this.cashCalculatorCashReceived > 0;
    const { order, paymentTransactionId } = response;

    this.#cartTimingService.recordOrderConfirmationTiming(order.id, this.cart?.id);
    this.trackingService.track(
      new CreateOrderEvent({
        cart_id: this.cart?.id,
        city_id: this.selectedCity.id,
        city_name: this.selectedCity.title,
        customer_id: this.cart.userId,
        currency: this.cart.total != null ? this.cart.total.currency : '',
        event_date: [...this.cart.sessionItemsByDatetime][0][0],
        order_id: order.id,
        payment_type: this.paymentType,
        payment_transaction_id: paymentTransactionId,
        plan_id: this.selectedPlan.id,
        plan_name: this.selectedPlan.title,
        place_id: this.selectedPlace.id,
        place_name: this.selectedPlace.title,
        time: new Date().toISOString(),
        total_purchased_tickets: this.cart.getNumberOfTicketCounts(),
        total: this.cart.total != null ? this.cart.total.amount : 0,
        total_surcharge: this.cart.totalSurcharge != null ? this.cart.totalSurcharge.amount : 0,
        coupon_code: this.cart.appliedCoupon?.code || null,
        payment_provider: response.paymentProvider,
        purchase_source: this.channel,
        channel: this.channel,
        using_cash_calculator: isUsingCashCalculator,
        obo_flow_type: this.onsiteSetupSelected?.obo_flow_type,
        feverzone_user: this.userService.getUserEmail(),
        ...getMultiplanCartFlags(this.cart),
      }),
    );
  }

  protected changePlan(): Observable<Plan> {
    return super.changePlan().pipe(
      tap(plan => {
        this.#updatePaymentConfigurationFromOnsiteSetup();
        this.#displaySquareAlertModalIfNeeded();
        this.updateOboSecondScreenPlan(plan);
        if (this.multiPlanFlowEnabled && this.nonConfirmedCart) {
          this.updateOboSecondScreenCart();
        } else {
          this.#oboSecondScreenDataService.resetCart();
        }
        this.#changeDetectorRef.markForCheck();
      }),
    );
  }

  updateOboSecondScreenPlan(plan: Plan): void {
    this.#oboSecondScreenDataService.setPlan(plan);
  }

  protected sendLoadTicketingEvent(hasResult: boolean): void {
    const ticketingData: LoadTicketingData = {
      ...this.getLoadTicketingData(hasResult),
      obo_flow_type: this.onsiteSetupSelected?.obo_flow_type,
    };
    this.trackingService.track(new LoadBoxOfficeEvent(ticketingData));
    this.#changeDetectorRef.markForCheck();
  }

  protected goToNextStep(): void {
    if (this.manageAsFreeSeatingMap) {
      super.goToNextStep();
    } else {
      this.priceViewerService.showTotal(this.onsiteSetupSelected, this.cart.total.currency, this.cart.total.amount);
      if (this.currentStep.nextStep) {
        if (this.canGoToCheckout()) {
          this.goToCheckout();
        } else {
          this.currentStep = this.currentStep.nextStep;
        }
      }
    }
    this.#changeDetectorRef.markForCheck();
  }

  private canGoToCheckout(): boolean {
    if (this.currentStep.nextStep !== contactInformationSelectorStep) {
      return false;
    }
    if (this.cart?.hasSessionsInFuture) {
      return false;
    }

    if (this.isOneStepFlow) {
      return false;
    }

    return this.canSkipContactInformation();
  }

  private canSkipContactInformation(): boolean {
    if (!this.cart?.hasSessionsInFuture) {
      return this.onsiteSetupSelected?.contact_information_setup?.requirement_on_current_day === ContactInformationRequirementEnum.DISABLED;
    }

    return false;
  }

  #shouldShowEmail(): boolean {
    const fields = this.onsiteSetupSelected?.contact_information_setup?.fields || [];
    return fields.includes(ContactInformationFieldEnum.EMAIL);
  }

  #shouldShowPhoneNumber(): boolean {
    const fields = this.onsiteSetupSelected?.contact_information_setup?.fields || [];
    return fields.includes(ContactInformationFieldEnum.PHONE);
  }

  #loadSetupList(): Observable<OnsiteSetup[] | null> {
    return this.onsiteSetupsService.getOnsiteSetups().pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.datadogService.logError('[OBO-ONSITE-SETUP] - There was an error loading onsite setups', { error });
        return of(null);
      }),
    );
  }

  #selectOnsiteSetup(setups: OnsiteSetup[]): void {
    if (!this.filters?.selectedPlace) {
      this.datadogService.logWarn('[OBO-ONSITE-SETUP] - There is no available places for the selected partner');
      return;
    }

    // First check if there's an onsiteSetupId in the URL
    const onsiteSetupIdFromUrl = this.#getOnsiteSetupIdFromUrl();
    if (onsiteSetupIdFromUrl && !this.onsiteSetupSelected) {
      const setupFromUrl = setups.find(setup => setup.id === onsiteSetupIdFromUrl);
      if (setupFromUrl) {
        return this.updateOnsiteSetupSelected(setupFromUrl);
      }
    }

    this.onsiteSetupSelected = this.getOnsiteSetupStorage(setups);
    if (setups.length === 1) {
      return this.updateOnsiteSetupSelected(setups[0]);
    }
    if (this.onsiteSetupSelected) {
      if (this.onsiteSetupSelected?.user_id == this.userService.getUser().id) {
        this.applyOnsiteSetup();
        this.loadNewSearch(this.filters, this.date);
        this.#changeDetectorRef.markForCheck();
        return;
      } else {
        this.clearConfigStorage();
        this.onsiteSetupSelected = null;
      }
    }
    this.showOnsiteSetupModal();
  }

  clearConfigStorage(): void {
    this.onsiteSetupsStorageService.removeConfiguration();
    this.paymentConfigStorageService.removeConfiguration();
  }

  applyOnsiteSetup(): void {
    this.#updatePaymentConfigurationFromOnsiteSetup();
    this.daysWithActiveSession = this.getMaxPurchasableDays(this.onsiteSetupSelected);
    this.hasShiftsEnabled = this.onsiteSetupSelected.shift_strategy !== ShiftStrategyEnum.disabled;
    this.includeSoldOutSessions = this.onsiteSetupSelected.show_sold_out_sessions;
    this.canOverrideCapacities = this.onsiteSetupSelected.can_override_capacities ?? false;
    this.partner = this.#partnerService.getPartner();
    this.updatePaymentMethodsAvailable(this.partner.countryCode);
    this.trackingService.track(
      new OnsiteSetupSelectedEvent({
        name: this.onsiteSetupSelected.name,
        details: JSON.stringify(this.onsiteSetupSelected),
      }),
    );
    if (this.onsiteSetupSelected.prioritized_main_plans?.length) {
      this.#searchBarService.updatePartnerPlanOptionsByPriorityPlans(
        this.onsiteSetupSelected.prioritized_main_plans,
        this.partner.id,
        this.channel,
      );
    }
    this.includeShopProducts = this.onsiteSetupSelected?.warehouse_id != null;
  }

  private getMaxPurchasableDays(onsiteSetup: OnsiteSetup = this.onsiteSetupSelected): number {
    if (!onsiteSetup) {
      return BoxOfficeTicketingComponent.maxPurchasableDaysLimit;
    }

    return Math.min(onsiteSetup.max_purchasable_days, BoxOfficeTicketingComponent.maxPurchasableDaysLimit);
  }

  private getOnsiteSetupStorage(setups: OnsiteSetup[]): OnsiteSetup {
    const onsiteSetupStorage = this.onsiteSetupsStorageService.getConfiguration();
    if (!onsiteSetupStorage) {
      return null;
    }
    const onsiteSetupUpdated = setups.find(setup => setup.id === onsiteSetupStorage.id);
    if (!onsiteSetupUpdated) {
      this.clearConfigStorage();
      return null;
    }

    const onsiteSetupUpdatedWithPlace = { ...onsiteSetupUpdated, place_id: onsiteSetupStorage.place_id };
    if (onsiteSetupStorage.user_id) {
      onsiteSetupUpdatedWithPlace.user_id = onsiteSetupStorage.user_id;
    }
    this.onsiteSetupsStorageService.setConfiguration(onsiteSetupUpdatedWithPlace);
    return onsiteSetupUpdatedWithPlace;
  }

  #setOnsiteSetupIdInUrl(): void {
    if (this.onsiteSetupSelected?.id) {
      const currentParams = { ...this.#activatedRoute.snapshot.queryParams };
      currentParams['onsiteSetupId'] = this.onsiteSetupSelected.id;

      const urlTree = this.router.createUrlTree([], {
        relativeTo: this.#activatedRoute,
        queryParams: currentParams,
      });
      const newUrl = this.router.serializeUrl(urlTree);

      this.#location.go(newUrl);
    }
  }

  #getOnsiteSetupIdFromUrl(): string | null {
    const params = this.#activatedRoute.snapshot.queryParams;
    return params['onsiteSetupId'] || null;
  }

  #applyOnsiteSetupSelected(onsiteSetup: OnsiteSetup): void {
    this.onsiteSetupSelected = onsiteSetup;
    this.onsiteSetupsStorageService.setConfiguration(onsiteSetup);
    this.#updateOssConfig(this.onsiteSetupSelected);
    this.#setOnsiteSetupIdInUrl();
    this.applyOnsiteSetup();
    this.loadNewSearch(this.filters, this.date);
    this.#changeDetectorRef.markForCheck();
  }

  #subscribeToOnsiteSetupSelections(): void {
    this.#onsiteSetupSelection$
      .pipe(
        switchMap(onsiteSetup =>
          this.#onsiteSetupsPresetCouponsService.getPresetCouponsByOnsiteSetup(onsiteSetup).pipe(
            map(() => onsiteSetup),
            catchError(() => of(onsiteSetup)),
          ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(onsiteSetup => this.#applyOnsiteSetupSelected(onsiteSetup));
  }

  private updateOnsiteSetupSelected(onsiteSetup: OnsiteSetup): void {
    if (this.activeShift && !onsiteSetup.place_id) {
      onsiteSetup = { ...onsiteSetup, place_id: this.activeShift.oboVenueId };
    }

    this.#onsiteSetupSelection$.next(onsiteSetup);
  }

  private loadOneStepFreeSeatingMapWhenSessionAvailable(): void {
    this.sessionAvailableReady.subscribe(() => {
      this.loadOneStepFreeSeatingMap();
    });
  }

  loadOneStepFreeSeatingMap(): void {
    if (this.isOneStepFlow && this.manageAsFreeSeatingMap) {
      this.loadFreeSeatingMap()
        .pipe(finalize(() => this.#changeDetectorRef.markForCheck()))
        .subscribe(
          () => {},
          response => this.showModalError(response?.error?.message),
        );
    }
  }

  protected override loadFreeSeatingMap(): Observable<BaseResponse<FreeSeatingMap>> {
    return super.loadFreeSeatingMap().pipe(tap(() => this.#restoreSeatingMapSelectionFromCart()));
  }

  #restoreSeatingMapSelectionFromCart(): void {
    const currentState = this.seatingMapState;
    const selectedDatetime = this.selectedSession?.selectedDatetime;
    if (!currentState || !selectedDatetime?.datetime || !selectedDatetime.sessionAvailabilityList?.length) {
      return;
    }
    const datetimeKey = normalizeCartDatetime(selectedDatetime.datetime);
    const currentSessionIds = new Set(selectedDatetime.sessionAvailabilityList.map(session => session.id));
    const cartSessionsWithSeats = this.#getCartSessionsWithSeatsForCurrentSelection(datetimeKey, currentSessionIds);
    if (cartSessionsWithSeats.length === 0) {
      return;
    }
    const seats = this.#getUniqueSeatReferences(cartSessionsWithSeats);
    const holdToken = this.#findHoldTokenForCartSessions(cartSessionsWithSeats) ?? currentState.hold_token;
    this.seatingMapState = {
      ...currentState,
      seats,
      hold_token: holdToken,
      seating_provider: this.seatingProvider,
    };
  }

  #getCartSessionsWithSeatsForCurrentSelection(datetimeKey: string, currentSessionIds: Set<number>): CartSession[] {
    const matchingSessions: CartSession[] = [];
    const candidateCarts: ReadonlyArray<Cart | null> = [this.nonConfirmedCart, this.preservedCart, this.cart];
    for (const candidateCart of candidateCarts) {
      if (!candidateCart) {
        continue;
      }
      const cartSessionsForDatetime = candidateCart.sessionItemsByDatetime.get(datetimeKey);
      if (!cartSessionsForDatetime?.length) {
        continue;
      }
      for (const cartSession of cartSessionsForDatetime) {
        if (currentSessionIds.has(cartSession.sessionId) && (cartSession.seats?.length ?? 0) > 0) {
          matchingSessions.push(cartSession);
        }
      }
    }
    return matchingSessions;
  }

  #getUniqueSeatReferences(cartSessions: ReadonlyArray<CartSession>): string[] {
    const seenSeats = new Set<string>();
    const orderedSeats: string[] = [];
    for (const cartSession of cartSessions) {
      for (const seat of cartSession.seats ?? []) {
        if (!seenSeats.has(seat)) {
          seenSeats.add(seat);
          orderedSeats.push(seat);
        }
      }
    }
    return orderedSeats;
  }

  #getSeatInfosFromCartSession(cartSession: CartSession): SeatInfo[] {
    const seatReferences = cartSession.seats ?? [];
    const seatLabels = cartSession.seatLabels ?? [];
    const seatDisplayLabels = cartSession.seatDisplayLabels ?? [];
    return seatReferences.map((reference, index) => new SeatInfo(reference, seatLabels[index] ?? reference, seatDisplayLabels[index]));
  }

  #findHoldTokenForCartSessions(cartSessions: ReadonlyArray<CartSession>): string | undefined {
    for (const cartSession of cartSessions) {
      const token = this.seatingHoldTokensBySessionId.get(cartSession.sessionId.toString());
      if (token) {
        return token;
      }
    }
    return undefined;
  }

  handleShowAvailabilityFromDateChange(selectedDateString: string): void {
    const selectedDate = new Date(selectedDateString);
    this.selectedAvailabilityFromDate = selectedDateString;
    this.loadNewSearch(this.filters, selectedDate);
  }

  private selectCartSessionTimeSlot(session: CartSession): void {
    this.isLoadingSelectedSessionDates = true;
    this.sessionAvailableReady
      .pipe(
        takeWhile(() => this.isLoadingSelectedSessionDates),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        const nextDateTimeStamp = this.getNextAvailableDateTimesStamp();
        const orderDateTimeStamp = new Date(session.sessionStartAt).getTime();

        if (nextDateTimeStamp <= orderDateTimeStamp) {
          const daysFromNextAvailableDateToOrderDate = Math.ceil((orderDateTimeStamp - nextDateTimeStamp) / DAY_IN_MILLIS);
          this.loadMoreDays(daysFromNextAvailableDateToOrderDate);
          return;
        }
        this.selectedSession = this.getSelectedSession(orderDateTimeStamp) ?? null;
        this.isLoadingSelectedSessionDates = false;
      });
  }

  #updateOssConfig(onsiteSetup: any): void {
    const currentOssConfig: OSSConfig = this.ossConfigStorageService.getConfiguration() ?? ({} as OSSConfig);

    this.ossConfigStorageService.setConfiguration({
      ...currentOssConfig,
      onsiteSetup: {
        id: onsiteSetup.id,
        placeId: onsiteSetup.place_id,
        cityId: this.filters?.selectedCity ? Number(this.filters.selectedCity.id) : null,
        placeName: this.filters?.selectedPlace ? this.filters.selectedPlace.title : '',
      },
    });
  }

  private getNextAvailableDateTimesStamp(): number {
    if (!this.sessionAvailabilitySummary?.nextAvailableDate) {
      return Number.MAX_SAFE_INTEGER;
    }
    const nextDate = moment(this.sessionAvailabilitySummary.nextAvailableDate).tz(this.timezone).toDate();
    return new Date(Date.UTC(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate())).getTime();
  }

  private getSelectedSession(timeStamp: number): SessionAvailabilitySummaryByDate {
    const allSessionsAvailability: SessionAvailabilitySummaryByDate[] = [...(this.regularSessionAvailabilitySummaryByDateList ?? [])];

    return allSessionsAvailability.find(session => {
      const dateTime = session.sessionAvailabilityByDatetimeList.find(
        sessionAvailability => timeStamp === new Date(sessionAvailability.datetime).getTime(),
      );
      if (dateTime) {
        session.selectedDatetime = dateTime;
        return true;
      }
      return false;
    });
  }

  private getContactInformationFromCartSession(session: CartSession): Partial<ContactInformation> {
    const email = session.ownerEmail.trim();
    const genericUserEmailRegexp = /^cart-[^@-]{8}-[^@-]{4}-[^@-]{4}-[^@-]{4}-[^@-]{12}@feverup\.com$/;

    return genericUserEmailRegexp.test(email) ? undefined : { email };
  }

  #getFirstNotTransferredCartSessionFromOrder(order: Order): CartSession | undefined {
    const allSessions = this.getAllSessions(order.cart?.sessionItemsByDatetime).map(session => this.#hydrateSession(session));
    return allSessions.find(session => session.getTransfer() === undefined);
  }

  #hydrateSession(session: UnmemberedCartSession): CartSession {
    if (session instanceof CartSession) return session;
    return Object.assign(Object.create(CartSession.prototype), session);
  }

  private getAllSessions(sessionsMap?: Map<string, CartSession[]>): CartSession[] {
    return Array.from(sessionsMap?.entries() ?? []).reduce((previous, [, sessions]) => [...previous, ...sessions], [] as CartSession[]);
  }

  private askUserContinueWithoutShift(): Observable<boolean> {
    this.trackingService.track(new ShowNoShiftStartedModalEvent());

    return this.openShiftConfirmationModal('boxOffice.noShiftStartedModal').pipe(
      map(value => {
        this.trackingService.track(new CloseNoShiftStartedModalEvent({ start_shift: value }));
        if (value) {
          this.forceShiftActions.next(ShiftsActionsEnum.start);
        }
        return !value;
      }),
    );
  }

  private askUserOpenMandatoryShift(): Observable<boolean> {
    this.trackingService.track(new ShowNoShiftStartedModalEvent());

    return this.openShiftConfirmationModal('boxOffice.shiftStartedMandatoryModal').pipe(
      map(value => {
        if (value) {
          this.trackingService.track(new CloseNoShiftStartedModalEvent({ start_shift: value }));
          this.forceShiftActions.next(ShiftsActionsEnum.start);
        }
        return value;
      }),
    );
  }

  private askUserCloseCurrentShift(): Observable<boolean> {
    return this.openShiftConfirmationModal('boxOffice.notCompatibleShiftModal').pipe(
      map(value => {
        if (value) {
          this.forceShiftActions.next(ShiftsActionsEnum.end);
        }
        return !value;
      }),
    );
  }

  private openShiftConfirmationModal(prefix: string): Observable<boolean> {
    const translate = (key: string): string => this.translate.instant(`${prefix}.${key}`);

    const modal = this.modalService.open(ConfirmModalComponent, {
      windowClass: 'ticketing-confirmation-modal',
      backdrop: 'static',
    });
    const component = modal.componentInstance as ConfirmModalComponent;

    component.config = {
      title: translate('title'),
      message: translate('message'),
      rightButtonText: translate('rightButton').toUpperCase(),
      leftButtonText: translate('leftButton').toUpperCase(),
    };

    const response: Observable<boolean> = component.response.pipe(
      take(1),
      finalize(() => modal.close()),
    );

    return merge(modal.dismissed.pipe(map((): boolean => false)), response) as Observable<boolean>;
  }

  private checkCartSessionsIsAboutToExpire(): void {
    if (this.nonConfirmedCart === null) {
      return;
    }

    if (this.membershipsData.memberCode) {
      this.nonConfirmedCart.autoAppliedCouponCode = this.membershipsData.memberCode ?? undefined;
    }

    const allSessionsAvailability: SessionAvailability[] = this.getAllSessionsAvailability();
    const allSessionsIds: number[] = this.getAllSessionsIds(this.nonConfirmedCart);
    const isSomeSessionAboutToExpire: boolean = allSessionsIds.some(sessionId => {
      const sessionAvailability: SessionAvailability | undefined = allSessionsAvailability.find(
        (availability: SessionAvailability) => availability.id === sessionId,
      );
      return sessionAvailability?.purchasableUntilDate && sessionAvailability.isDisabled();
    });
    if (isSomeSessionAboutToExpire) {
      this.clearCounters();
      this.clearCart();
      this.updateTicketTypeFields();
      this.showModal('common.errorTitle', 'boxOffice.ticketExpireSoon', 'ticketExpireSoon');
    }
  }

  private checkCartSessionsIsAboutToExpireObservable(): Observable<void> {
    if (this.nonConfirmedCart === null) {
      return EMPTY;
    }
    const allSessionsAvailability: SessionAvailability[] = this.getAllSessionsAvailability();
    const allSessionsIds: number[] = this.getAllSessionsIds(this.nonConfirmedCart);
    const isSomeSessionAboutToExpire: boolean = allSessionsIds.some(sessionId => {
      const sessionAvailability: SessionAvailability | undefined = allSessionsAvailability.find(
        (availability: SessionAvailability) => availability.id === sessionId,
      );
      return sessionAvailability?.purchasableUntilDate && sessionAvailability.isDisabled();
    });
    if (isSomeSessionAboutToExpire) {
      this.clearCounters();
      this.clearCart();
      this.updateTicketTypeFields();
      return throwError(() => new Error('common.errorTitle.boxOffice.ticketExpireSoon.ticketExpireSoon'));
    }
    return of(void 0);
  }

  private clearCounters() {
    this.selectedTicketsBySessionType = new Map();
    this.selectedTicketsBySessionId = new Map();
  }

  private flatArray<T>(arr: Array<Array<T>>): Array<T> {
    return arr.reduce((prev, curr) => [...prev, ...curr], []);
  }

  private getAllSessionsIds(cart: Cart): Array<number> {
    return this.flatArray(Array.from(cart?.sessionItemsByDatetime.values() || [])).map(session => session.sessionId);
  }

  private getAllSessionsAvailability() {
    const sessionAvailabilityByDateTime = this.flatArray(
      [...this.regularSessionAvailabilitySummaryByDateList].map(availability => availability.sessionAvailabilityByDatetimeList),
    );
    return this.flatArray(sessionAvailabilityByDateTime.map(session => session.sessionAvailabilityList));
  }

  private updatePaymentMethodsAvailable(countryCode: string): void {
    this.paymentMethodDisplay.clear();
    this.boxOfficePaymentMethodsService
      .getAvailableMethods(this.onsiteSetupSelected)
      .display.forEach((display, paymentType) => this.paymentMethodDisplay.set(paymentType, display));
    this.paymentTypes = this.getPaymentMethodsAvailable(countryCode);
    this.showCommonPaymentButton = this.paymentTypes?.length > this.maxPaymentMethodInOneStep;
  }

  private getPaymentMethodsAvailable(countryCode: string): PaymentType[] {
    if (!PaymentMethodsPerCountry.has(countryCode)) {
      const defaultPaymentMethods = PaymentMethodsPerCountry.get('default').filter(value => this.isPaymentMethodAvailable(value));
      const paymentMethodsWithSplit = this.#splitPaymentService.addSplitPaymentIfNeeded(defaultPaymentMethods);
      return this.#partnerConfigService.addCustomPaymentMethods(this.sortPaymentMethods(paymentMethodsWithSplit), this.#customMethodIcons);
    }
    const hasExplicitPaymentMethodsConfigured = (this.onsiteSetupSelected?.payment_methods?.length ?? 0) > 0;
    const allAvailablePaymentMethods: PaymentType[] = [];
    for (const key of Object.values(PaymentType)) {
      if (this.isPaymentMethodAvailable(key)) {
        allAvailablePaymentMethods.push(key);
      }
    }
    const PaymentMethodsForCountry: PaymentType[] = PaymentMethodsPerCountry.get(countryCode);
    let AvailablePaymentMethodsForCountry = allAvailablePaymentMethods.filter(value => PaymentMethodsForCountry.includes(value));
    if (!hasExplicitPaymentMethodsConfigured) {
      AvailablePaymentMethodsForCountry = AvailablePaymentMethodsForCountry.filter(
        value => value !== PaymentType.CREDIT_CARD && value !== PaymentType.DEBIT_CARD,
      );
    }
    const paymentMethodsWithSplit = this.#splitPaymentService.addSplitPaymentIfNeeded(AvailablePaymentMethodsForCountry);
    return this.#partnerConfigService.addCustomPaymentMethods(this.sortPaymentMethods(paymentMethodsWithSplit), this.#customMethodIcons);
  }

  private sortPaymentMethods(paymentTypes: PaymentType[]): PaymentType[] {
    let sortPaymentMethods = [];
    if (paymentTypes.includes(PaymentType.CASH)) {
      sortPaymentMethods.push(PaymentType.CASH);
    }
    if (paymentTypes.includes(PaymentType.CARD)) {
      sortPaymentMethods.push(PaymentType.CARD);
    }
    sortPaymentMethods = sortPaymentMethods.concat(paymentTypes);
    return [...new Set(sortPaymentMethods)];
  }

  private isPaymentMethodAvailable(paymentMethod: PaymentType): boolean {
    if (!this.onsiteSetupSelected || !this.onsiteSetupSelected?.payment_methods) {
      return false;
    }
    if (!this.#isSquareWalletPaymentAvailable(paymentMethod)) {
      return false;
    }

    if (this.onsiteSetupSelected.payment_methods.length === 0) {
      return true;
    }

    const available_payment_methods = this.onsiteSetupSelected.payment_methods.map(item => item.payment_method);
    return available_payment_methods.includes(paymentMethod);
  }

  #isSquareWalletPaymentAvailable(paymentMethod: PaymentType): boolean {
    const paymentFeatureFlags: Partial<Record<PaymentType, string>> = {
      [PaymentType.SQUARE_QR]: 'qr_codes_payment',
      [PaymentType.IC_CARD]: 'ic_card_payment',
      [PaymentType.ID_PAYMENT]: 'id_payment',
      [PaymentType.QUICPAY]: 'quicpay_payment',
    };

    const featureFlag = paymentFeatureFlags[paymentMethod];
    if (featureFlag === undefined) {
      return true;
    }

    const isFeatureEnabled = this.optimizelyService.isFeatureEnabled(featureFlag);
    const storedPaymentConfig = this.paymentConfigStorageService.getConfiguration();
    const hasSquareDeviceConfigured = Boolean(storedPaymentConfig?.deviceId && storedPaymentConfig?.squareConfiguration);

    return Boolean(isFeatureEnabled && hasSquareDeviceConfigured);
  }

  getButtonLabel(paymentType: PaymentType): string {
    return (
      this.paymentMethodDisplay.get(paymentType)?.label ??
      this.#partnerConfigService.getCustomPaymentMethodLabel(paymentType) ??
      resolvePaymentMethodLabel(null, paymentType)
    );
  }

  getCardDisabledTooltip(paymentType: PaymentType): string | null {
    if (!this.payWithCardIsDisabled(paymentType)) {
      return null;
    }
    const storedConfig = this.paymentConfigStorageService.getConfiguration();
    const gatewayProvider = this.boxOfficePaymentMethodsService.getGatewayProvider(this.onsiteSetupSelected);
    const allowsDelegatedPayment = this.boxOfficePaymentMethodsService.allowsDelegatedCardPayment(this.onsiteSetupSelected);
    if (this.paymentService.isCardDisabledDueToMissingTerminal(storedConfig, gatewayProvider, allowsDelegatedPayment)) {
      return null;
    }
    return this.paymentService.getCardDisabledTooltip(storedConfig, gatewayProvider, allowsDelegatedPayment);
  }

  payWithCardIsDisabled(paymentType: PaymentType): boolean {
    const cardPayments = [
      PaymentType.CARD,
      PaymentType.CARD_SPLIT,
      PaymentType.DEBIT_CARD,
      PaymentType.CREDIT_CARD,
      PaymentType.PIX,
      PaymentType.PAY_NOW,
      PaymentType.ALIPAY,
      PaymentType.GRABPAY_SG,
      PaymentType.WECHAT_PAY,
      PaymentType.SIMPLE_PAYMENTS_KR,
      PaymentType.SQUARE_QR,
      PaymentType.IC_CARD,
      PaymentType.ID_PAYMENT,
      PaymentType.QUICPAY,
    ];

    if (!cardPayments.includes(paymentType)) {
      return false;
    }

    const currentCart = this.getCurrentCart();

    if (!currentCart || !currentCart?.total) {
      return true;
    }

    const paymentConfigurationStorage: PaymentConfiguration | undefined = this.paymentConfigStorageService.getConfiguration();
    const cartAmountIsZero: boolean = currentCart?.total?.amount === 0;

    const gatewayProvider = this.boxOfficePaymentMethodsService.getGatewayProvider(this.onsiteSetupSelected);
    const allowsDelegatedPayment = this.boxOfficePaymentMethodsService.allowsDelegatedCardPayment(this.onsiteSetupSelected);
    const isDisallowed = this.paymentService.isCardPaymentDisallowed(
      this.paymentConfiguration,
      paymentConfigurationStorage,
      cartAmountIsZero,
      gatewayProvider,
      allowsDelegatedPayment,
    );

    if (
      isDisallowed &&
      this.paymentService.isCardDisabledDueToMissingTerminal(paymentConfigurationStorage, gatewayProvider, allowsDelegatedPayment)
    ) {
      return false;
    }

    return isDisallowed;
  }

  onDeviceSelected(deviceId: string): void {
    if (!this.cardPaymentAttemptedWithoutDevice) {
      return;
    }
    this.deviceSelectionInvalid = !deviceId;
  }

  private displaySquareAlertModal(): void {
    const [title, message] =
      this.paymentConfiguration !== null && this.paymentConfiguration.squareConfiguration !== undefined
        ? ['square.notCompatiblePlanModal.title', 'square.notCompatiblePlanModal.message']
        : ['square.notEnabledPlanModal.title', 'square.notEnabledPlanModal.message'];
    this.showModal(title, message);
  }

  #shouldHighlightDeviceSelector(paymentType?: PaymentType): boolean {
    const cardPayments = [
      PaymentType.CARD,
      PaymentType.CARD_SPLIT,
      PaymentType.DEBIT_CARD,
      PaymentType.CREDIT_CARD,
      PaymentType.PIX,
      PaymentType.PAY_NOW,
      PaymentType.ALIPAY,
      PaymentType.GRABPAY_SG,
      PaymentType.WECHAT_PAY,
      PaymentType.SIMPLE_PAYMENTS_KR,
      PaymentType.SQUARE_QR,
      PaymentType.IC_CARD,
      PaymentType.ID_PAYMENT,
      PaymentType.QUICPAY,
    ];

    if (!paymentType || !cardPayments.includes(paymentType)) {
      return false;
    }

    const storedConfig = this.paymentConfigStorageService.getConfiguration();
    return this.paymentService.isCardDisabledDueToMissingTerminal(
      storedConfig,
      this.boxOfficePaymentMethodsService.getGatewayProvider(this.onsiteSetupSelected),
      this.boxOfficePaymentMethodsService.allowsDelegatedCardPayment(this.onsiteSetupSelected),
    );
  }

  #displaySquareAlertModalIfNeeded(): void {
    const storedPaymentConfiguration: PaymentConfiguration | undefined = this.paymentConfigStorageService.getConfiguration();
    const isApplicable: boolean = storedPaymentConfiguration?.isConfigApplicable() === true;
    if (storedPaymentConfiguration?.squareConfiguration != null && !isApplicable) {
      this.displaySquareAlertModal();
    }
  }

  #updatePaymentConfigurationFromOnsiteSetup(): void {
    const storedDeviceId: string | undefined = this.paymentConfigStorageService.getConfiguration()?.deviceId;
    this.paymentConfiguration = this.boxOfficePaymentMethodsService.buildPaymentConfiguration(this.onsiteSetupSelected, storedDeviceId);
  }

  private sendPrepareCartEvent(): void {
    if (!this.customer) {
      this.checkoutLogger.error(
        'Cannot send prepare cart event: customer is null',
        this.getCurrentLoggerContext(CheckoutStageEnum.CART_PREPARE),
      );
      return;
    }
    this.priceViewerService.showTotal(this.onsiteSetupSelected, this.cart.total.currency, this.cart.total.amount);
    this.#cartTimingService.startPrepareCartTiming(this.cart.id);
    this.trackingService.track(
      new PrepareCartEvent({
        customer_id: Number(this.customer.id),
        customer_type: this.customer.type as CustomerType,
        ...this.getCartMixpanelData(),
      }),
    );
  }

  protected getCartMixpanelData(): ClickClearAllCartData {
    const cartMixpanelData = super.getCartMixpanelData();
    return {
      ...cartMixpanelData,
      obo_flow_type: this.onsiteSetupSelected?.obo_flow_type,
    };
  }

  private getCurrentLoggerContext(stage: CheckoutStageEnum, data?: Record<string, unknown>): CheckoutLogContext {
    return {
      stage,
      cartId: this.cart ? this.cart.id : null,
      data,
    };
  }

  applyCouponDiscountOneStep(code: string, lazyCouponType: string | null = null): void {
    this.couponError.next(null);
    this.createOrUpdateCart()
      .pipe(
        mergeMap(response => this.checkResponseData(response)),
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingCart = false;
          this.#changeDetectorRef.markForCheck();
        }),
      )
      .subscribe(
        response => {
          this.cart = response.data;
          this.cart.hasSeating = response.data.hasSeating;
          if (this.cart.id == null) {
            return;
          }
          this.cartService
            .getCouponForCart({
              cartId: this.cart.id,
              couponCode: code,
              lazyCouponType,
              partnerId: this.partner.id,
            })
            .pipe(finalize(() => this.#changeDetectorRef.markForCheck()))
            .subscribe(response => {
              if (response.data) {
                this.coupon = response.data;
                this.couponCodeApplied.next(true);
                this.showCouponOneStep = false;
                this.#addCoupon(this.cart, this.coupon);
                this.#addSessionsTypesToNonConfirmedCart();
                this.updateOboSecondScreenCart();
                this.sendApplyCouponMixpanelEvent(code, true);
              } else if (response.error) {
                this.removeCoupon();
                this.couponError.next(response.error);
                this.couponCodeApplied.next(false);
                this.sendApplyCouponMixpanelEvent(code, false);
              }
            });
        },
        error => {
          if (this.getCurrentCart()?.numberOfTicketCounts === 0 && this.coupon) {
            this.couponCodeApplied.next(false);
            this.clearCoupon();
            this.clearCart();
          } else {
            this.errorModalService.open(error);
          }
        },
      );
  }

  private sendApplyCouponMixpanelEvent(code: string, success: boolean) {
    this.trackingService.track(
      new ClickApplyCouponOneStepEvent({
        coupon_code: code,
        success: success,
      }),
    );
  }

  #addCoupon(cart: Cart | null, coupon: Coupon): void {
    if (cart !== null) {
      cart.appliedCoupon = coupon;
    }
    this.#syncCartChanges(cart, coupon);
  }

  removeCoupon(): void {
    if (this.cart !== null) {
      this.cart.appliedCoupon = null;
    }
    this.#syncCartChanges(this.cart, null);
    this.updateOboSecondScreenCart();
    this.clearCoupon();
    this.#changeDetectorRef.markForCheck();
  }

  #syncCartChanges(cart: Cart | null, coupon: Coupon | null): void {
    this.updateCartTotalMoney(cart, coupon);
    this.nonConfirmedCart = cart?.clone() ?? null;
  }

  private clearCoupon(): void {
    this.coupon = null;
    this.couponError.next(null);
    this.couponCodeApplied.next(false);
    this.showCouponOneStep = this.optimizelyService.isFeatureEnabled('coupons_in_one_step');
  }

  protected createOrUpdateCartResponse(response: BaseResponse<Cart>, hasSeating: boolean): void {
    this.#sendLogConfirmedCart(this.nonConfirmedCart, response.data);
    super.createOrUpdateCartResponse(response, hasSeating);
  }

  #sendLogConfirmedCart(nonConfirmedCart: Cart | null, confirmedCart: Cart): void {
    this.datadogService.logInfo(`[OBO-CART] CONFIRMED - Total: ${confirmedCart.total.amount} ${confirmedCart.total.currency}`, {
      cartTotalMoney: confirmedCart.total,
      numberOfTickets: confirmedCart.numberOfTickets,
      coupon: confirmedCart.appliedCoupon,
    });
    if (!nonConfirmedCart) {
      this.datadogService.logError('[OBO-CART] Non confirmed cart is null when comparing with confirmed cart', {
        confirmedCart,
      });
      return;
    }
    if (
      nonConfirmedCart.getNumberOfTicketCounts() === confirmedCart.getNumberOfTicketCounts() &&
      nonConfirmedCart.total.amount === confirmedCart.total.amount
    ) {
      this.datadogService.logInfo('[OBO-CART] Confirmed and non confirmed cart are equals ', {
        confirmedCart,
        nonConfirmedCart,
      });
    } else {
      this.datadogService.logError('[OBO-CART] Confirmed and non confirmed cart are different ', {
        confirmedCart,
        nonConfirmedCart,
      });
    }
  }

  protected updateNonConfirmedCart(): void {
    super.updateNonConfirmedCart();
    this.updateOboSecondScreenCart();
    this.#changeDetectorRef.markForCheck();
  }

  protected restoreToBeginning(): void {
    this.clearCounters();
    if (this.#shouldPreserveSeatingMapOnClear()) {
      this.#restorePreservingSeatingMap();
    } else {
      super.restoreToBeginning();
    }
    this.updateOboSecondScreenCart();
    this.#changeDetectorRef.markForCheck();
  }

  override updateFreeMapMode(): void {
    const previousManageAsFreeSeatingMap = this.manageAsFreeSeatingMap;

    if (this.selectedSession?.selectedDatetime || !previousManageAsFreeSeatingMap) {
      this.manageAsFreeSeatingMap =
        this.sessionSelectorType === SessionSelectorType.BY_FREE_SELECTION_MAP && this.selectedSessionHasSeating();
    }

    const shouldClearCart = this.manageAsFreeSeatingMap && !this.isPreservingCart && !this.allowMultiTimeSlotSelection;
    if (shouldClearCart) {
      this.clearCart();
      this.clearSelectedTicketsReferences();
    }
  }

  #shouldPreserveSeatingMapOnClear(): boolean {
    return this.allowMultiTimeSlotSelection && this.seatingMapUrl != null;
  }

  #restorePreservingSeatingMap(): void {
    this.shouldRestoreToBeginning = false;
    this.clearCart();
    this.clearSelectedTicketsReferences();
    this.seatingToken = null;
    this.seatingHoldTokensBySessionId = new Map();
    this.showCartDetails = false;
    this.#changeDetectorRef.detectChanges();
    if ((this.seatingSelectorRef?.seatsCounter ?? 0) > 0) {
      this.seatingSelectorRef?.clearSelection();
    }
  }

  private resetPaymentState(): void {
    this.paymentType = null;
    this.cashCalculatorCashReceived = null;
  }

  private handleBookingQuestions(): Observable<boolean> {
    return this.#bookingQuestionsModalService
      .handlePreBookingQuestions(this.cart, this.customer)
      .pipe(switchMap(v => iif(() => v, of(v), EMPTY)));
  }

  #handlePostBookingQuestions(orderId?: number): Observable<boolean> {
    const order = new Order({ cart: this.cart ?? undefined, id: orderId });
    return this.#bookingQuestionsModalService.handlePostBookingQuestions(order);
  }

  onPaymentOptionsRequested(): void {
    this.#isCheckoutModalFlow = true;
    this.clickOnPayOneStep();
  }

  onFullPaymentCashRequested(): void {
    this.#isCheckoutModalFlow = true;
    this.#requestedCheckoutFlow = 'fullPaymentCash';
    this.clickOnPayOneStep();
  }

  onFullPaymentIntegratedRequested(): void {
    this.#isCheckoutModalFlow = true;
    this.#requestedCheckoutFlow = 'fullPaymentIntegrated';
    this.clickOnPayOneStep();
  }

  isFullPaymentCashAvailable(): boolean {
    return this.#checkoutPaymentOptionsService.hasDelegatedCashMethod(this.onsiteSetupSelected);
  }

  isFullPaymentIntegratedAvailable(): boolean {
    return this.#checkoutPaymentOptionsService.hasIntegratedCardMethod(this.onsiteSetupSelected);
  }

  #openCheckoutModalIfNeeded(): Observable<void> {
    if (!this.#isCheckoutModalFlow) {
      return of(void 0);
    }
    const storedDeviceId = this.paymentConfigStorageService.getConfiguration()?.deviceId;
    const paymentOptions = this.#checkoutPaymentOptionsService.resolve(this.onsiteSetupSelected, storedDeviceId);
    const cashCaptureMode = this.#onsiteCheckoutContextResolver.resolveCashCaptureMode({
      activeShift: this.activeShift,
      onsiteSetup: this.onsiteSetupSelected,
    });
    return this.#checkoutModalFlowService
      .openAndAwaitMethod({
        availableMethods: paymentOptions.methods,
        availableTerminals: paymentOptions.terminals,
        basePaymentConfiguration: paymentOptions.basePaymentConfiguration,
        checkoutFlows: paymentOptions.checkoutFlows,
        fitToTiles: paymentOptions.fitToTiles,
        cartItems: mapCartToCheckoutCartItems(this.cart ?? this.nonConfirmedCart),
        cartTotal: this.cartTotalMoney,
        cashCaptureMode,
        locale: this.translate.currentLang ?? 'en-US',
        flow: this.#requestedCheckoutFlow,
        selectedTerminalId: paymentOptions.selectedTerminalId,
      })
      .pipe(
        take(1),
        tap((paymentType: PaymentType) => (this.paymentType = paymentType)),
        map((): undefined => void 0),
      );
  }

  onConnectSquareToggled() {
    this.#changeDetectorRef.markForCheck();
  }

  protected clearCart() {
    super.clearCart();
    this.preservedCart = null;
    this.#changeDetectorRef.markForCheck();
  }

  #addSessionsTypesToNonConfirmedCart(): void {
    if (this.selectedSession && this.nonConfirmedCart) {
      const allSessions = [
        ...this.productSessions,
        ...(this.selectedSession.sessionAvailabilityByDatetimeList?.flatMap(session => session.sessionAvailabilityList) ?? []),
      ];
      this.nonConfirmedCart.sessionItemsByDatetime.forEach(cartSessions => {
        cartSessions.forEach(cartSession => {
          const session = allSessions.find(a => a.sessionType.id === cartSession.sessionType.id);
          if (session) {
            cartSession.sessionType = session.sessionType;
          }
        });
      });
    }
  }

  canIdentifyMember(): boolean {
    return !!this.partner?.hasMemberships && this.userService.hasPermission(Permissions.CAN_MANAGE_MEMBERSHIPS);
  }

  identifyMembershipsMember(): void {
    if (!this.canIdentifyMember() || !this.plan?.id) {
      return;
    }

    const dialogRef = this.#igntDialogService.openModal<MembershipsIdentifyMemberModalResult, MembershipsIdentifyMemberModalData>(
      MembershipsIdentifyMemberModalComponent,
      { data: { partnerId: this.partner.id, planId: this.plan.id }, size: 'sm' },
    );

    dialogRef.closed$
      .pipe(
        take(1),
        filter((membershipsData): membershipsData is MembershipsData => membershipsData != null),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((membershipsData: MembershipsData) => {
        this.membershipsData = membershipsData;
        this.#addDiscountsToCart();
        this.#cloneAndUpdateCart();
        this.#toastService.add({
          titleTranslationKey: 'boxOffice.memberships.discounts.alert.title',
          translationKey: 'boxOffice.memberships.discounts.alert.message',
          type: ToastType.SUCCESS,
          autoHide: true,
          delay: 3000,
        });
        this.#changeDetectorRef.markForCheck();
      });
  }

  removeMembershipsMember(): void {
    const modal = this.modalService.open(MembershipsRemoveConfirmationMemberModalComponent);
    modal.componentInstance.confirmRemoveMember.pipe(take(1)).subscribe(() => {
      this.#clearMembershipsData();
      this.#removeDiscountsFromCart();
      this.#cloneAndUpdateCart();
      this.#changeDetectorRef.markForCheck();
    });
  }

  #clearMembershipsData(): void {
    this.membershipsData.memberCode = null;
    this.membershipsData.member = null;
    this.membershipsData.planDiscounts = [];
  }

  #getCouponCode(): string | undefined {
    const planDiscounts = this.membershipsData.planDiscounts;
    return planDiscounts.length ? planDiscounts[0].couponCode : this.coupon?.code;
  }

  #showMembershipsAcceptTermsModal(member: MembershipsMember): Observable<void> {
    const dialogRef = this.#igntDialogService.openModal<boolean, MembershipsAcceptTermsModalData>(MembershipsAcceptTermsModalComponent, {
      data: {
        email: member.customer.email,
        fullName: `${member.customer.firstName} ${member.customer.lastName}`,
      },
      disableCloseShortcuts: true,
      size: 'sm',
    });

    return dialogRef.closed$.pipe(
      take(1),
      filter((accepted: boolean | undefined): accepted is true => accepted === true),
      map((): undefined => void 0),
      tap(() => this.updateCustomer(buildCustomerFromMember(member))),
    );
  }

  #addDiscountsToCart(): void {
    if (!this.nonConfirmedCart?.sessionItemsByDatetime?.size) {
      return;
    }

    this.nonConfirmedCart.autoAppliedCouponCode = this.membershipsData.memberCode ?? undefined;
  }

  #removeDiscountsFromCart(): void {
    if (!this.nonConfirmedCart?.sessionItemsByDatetime?.size) {
      return;
    }

    this.nonConfirmedCart.autoAppliedCouponCode = undefined;
  }

  #cloneAndUpdateCart(): void {
    if (!this.nonConfirmedCart) {
      return;
    }

    this.nonConfirmedCart = this.nonConfirmedCart.clone();
    this.updateCartTotalMoney(this.nonConfirmedCart);
  }
}
