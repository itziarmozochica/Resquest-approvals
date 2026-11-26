import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';

import { PaymentCheckoutAdyenService } from '@fz-original/app/app/services/payment-checkout-adyen/payment-checkout-adyen.service';
import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { ClickClearAllCartData } from '@fz-original/app/core/tracking/core/events/click-clear-all-cart';
import { CreateModifiedOrderEvent } from '@fz-original/app/core/tracking/core/events/create-modified-order';
import { CreateOrderEvent } from '@fz-original/app/core/tracking/core/events/create-order';
import { getMultiplanCartFlags } from '@fz-original/app/core/tracking/core/events/create-order.util';
import { LoadBoxOfficeEvent } from '@fz-original/app/core/tracking/core/events/load-box-office';
import { LoadTicketingData } from '@fz-original/app/core/tracking/core/events/load-ticketing-data';
import { OnsiteSetupSelectedEvent } from '@fz-original/app/core/tracking/core/events/onsite-setup-selected';
import { PrepareCartEvent } from '@fz-original/app/core/tracking/core/events/preprare-cart';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import {
  MembershipsAcceptTermsModalComponent,
  MembershipsAcceptTermsModalData,
} from '@fz-original/app/modules/box-office/memberships/components/accept-terms-modal/accept-terms-modal.component';
import { MembershipsData, MembershipsMember } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';
import { MembershipsIdentificationService } from '@fz-original/app/modules/box-office/memberships/services/memberships-identification.service';
import {
  selectChargeableMemberCouponCode,
  selectEffectivePlanDiscounts,
} from '@fz-original/app/modules/box-office/memberships/utils/effective-plan-discounts.util';
import { buildCustomerFromMember } from '@fz-original/app/modules/box-office/memberships/utils/memberships.utils';
import { SecondScreenSeatingMapStorageService } from '@fz-original/app/modules/box-office/obo-second-screen/services/seating-map/second-screen-seating-map-storage.service';
import { CheckoutPaymentOptionsService } from '@fz-original/app/modules/box-office/shared/services/checkout-payment-options/checkout-payment-options.service';
import { OnsiteCheckoutContextResolver } from '@fz-original/app/modules/box-office/shared/services/onsite-checkout-context/onsite-checkout-context.resolver';
import { OnsiteSetupRequiredApiErrorService } from '@fz-original/app/modules/box-office/shared/services/onsite-setup-required-api-error.service';
import { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { PaymentFlowFeatureService } from '@fz-original/app/modules/box-office/shared/services/payment-flow-feature/payment-flow-feature.service';
import { BoxOfficePaymentMethodsService } from '@fz-original/app/modules/box-office/shared/services/payment-methods/box-office-payment-methods.service';
import { SplitPaymentRetryUiService } from '@fz-original/app/modules/box-office/shared/services/split-payment/split-payment-retry-ui.service';
import { CHECKOUT_PAYMENT_DRIVER } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-driver.model';
import type { CheckoutFlowKind } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout.model';
import { CheckoutModalFlowService } from '@fz-original/app/modules/checkout/checkout-modal/services/checkout-modal-flow.service';
import { mapCartToCheckoutCartItems } from '@fz-original/app/modules/checkout/checkout-modal/utils/checkout-cart.mapper';
import { OrderRescheduled, SessionItem } from '@fz-original/app/modules/reschedule/models/reschedule-order.model';
import { RescheduleModalCancelledError, RescheduleService } from '@fz-original/app/modules/reschedule/services/reschedule.service';
import { ReservationSettlementSessionService } from '@fz-original/app/modules/reservation-settlement/services/reservation-settlement-session.service';
import {
  adoptReservationSettlementCartAfterCouponRemoval,
  applyReservationSettlementDiscount,
  isInheritedReservationSettlementCoupon,
} from '@fz-original/app/modules/reservation-settlement/utils/reservation-settlement-discount.util';
import { matchesReservationSettlementSession } from '@fz-original/app/modules/reservation-settlement/utils/reservation-settlement-integrity.util';
import { ScannerComponent } from '@fz-original/app/modules/validation/components/scanner/scanner.component';
import { BookingQuestionsModalService } from '@fz-original/app/shared/booking-questions/booking-questions-modal.service';
import { passSessionInCart } from '@fz-original/app/shared/checkers/pass-session-in-cart';
import {
  ContactInformationModalComponent,
  ContactInformationModalData,
  type ContactInformationModalResult,
} from '@fz-original/app/shared/components/contact-information-modal/contact-information-modal.component';
import { ContactInformation } from '@fz-original/app/shared/components/contact-information/contact-information.component';
import { type CouponCodeModalResult } from '@fz-original/app/shared/components/coupon-code-selector/coupon-modals.model';
import { type CouponCodeEvent } from '@fz-original/app/shared/components/coupon-code/coupon-code-event';
import { CouponCodeModalComponent } from '@fz-original/app/shared/components/coupon-code/coupon-code-modal/coupon-code-modal.component';
import { BaseTicketingComponent, GetSessionAvailableParams } from '@fz-original/app/shared/components/ticketing/base-ticketing.component';
import { generateCart } from '@fz-original/app/shared/components/ticketing/ticketing.utils';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { invalidCartStatusConfirmedErrorCode } from '@fz-original/app/shared/models/cart/cart-error-code';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { CustomerType } from '@fz-original/app/shared/models/customer/customer-type.enum';
import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { Terms } from '@fz-original/app/shared/models/customer/terms.enum';
import { Money } from '@fz-original/app/shared/models/money.model';
import { AccessTicket } from '@fz-original/app/shared/models/order/access-ticket.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { ProductSession } from '@fz-original/app/shared/models/product-sessions-summary/product-sessions-summary-response.model';
import { SecondScreenSeatingMapStorage } from '@fz-original/app/shared/models/seating-map/second-screen-seating-map-storage.model';
import { RegularSessionAvailabilitySummaryByDate } from '@fz-original/app/shared/models/session-availability/regular-session-availability-summary-by-date.model';
import {
  SessionAvailabilitySummaryByDate,
  SessionAvailabilitySummaryByDateType,
} from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-date.model';
import { SessionAvailabilitySummary } from '@fz-original/app/shared/models/session-availability/session-availability-summary.model';
import { SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';
import { SharedAvailabilityRule } from '@fz-original/app/shared/models/session-availability/shared-availability-rule.model';
import { SessionType } from '@fz-original/app/shared/models/session-type/session-type.model';
import { contactInformationSelectorStep } from '@fz-original/app/shared/models/step/purchase-steps';
import { TicketType } from '@fz-original/app/shared/models/ticket-type/ticket-type.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { SearchFilter } from '@fz-original/app/shared/search-bar/models/search-filter.model';
import { FreeSeatResponse } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/free-seat-response.model';
import { audioFile } from '@fz-original/app/shared/services/audio/audio-file.enum';
import { AudioService } from '@fz-original/app/shared/services/audio/audio.service';
import { CartTimingService } from '@fz-original/app/shared/services/cart-timing/cart-timing.service';
import { CartService } from '@fz-original/app/shared/services/cart/cart.service';
import { CreateCartQuery } from '@fz-original/app/shared/services/cart/create-cart-query';
import { DiscardCartQuery } from '@fz-original/app/shared/services/cart/discard-cart-query';
import { RemovePlanFromCartQuery } from '@fz-original/app/shared/services/cart/remove-plan-from-cart-query';
import { UpdateCartQuery } from '@fz-original/app/shared/services/cart/update-cart-query';
import { CheckoutLoggerService } from '@fz-original/app/shared/services/checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '@fz-original/app/shared/services/checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '@fz-original/app/shared/services/checkout-logger/models/checkout-stage.enum';
import { CustomerService } from '@fz-original/app/shared/services/customer/customer.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { ErrorModalService } from '@fz-original/app/shared/services/error-modal/error-modal.service';
import { FiscalComplianceBlockGuardService } from '@fz-original/app/shared/services/fiscal-compliance-block/fiscal-compliance-block-guard.service';
import { FiscalComplianceBlockModalService } from '@fz-original/app/shared/services/fiscal-compliance-block/fiscal-compliance-block-modal.service';
import { FiscalComplianceBlockPrepareError } from '@fz-original/app/shared/services/fiscal-compliance-block/fiscal-compliance-block-prepare.error';
import { SeatsManagementService } from '@fz-original/app/shared/services/move-customers-seats/seats-management.service';
import {
  LinkOrdersRescheduleType,
  SeatCancellationItem,
} from '@fz-original/app/shared/services/move-customers-seats/ticket/ticket.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { PriceViewerPrinterServiceManager } from '@fz-original/app/shared/services/price-viewer/price-viewer.service';
import { ProductSessionsSummaryService } from '@fz-original/app/shared/services/product-sessions-summary/product-sessions-summary.service';
import { FreeSeatingMapService } from '@fz-original/app/shared/services/seating-map/free-seating-map.service';
import { SeatingMapService } from '@fz-original/app/shared/services/seating-map/seating-map.service';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { DatesAvailabilityStoredService } from '@fz-original/app/shared/services/session-availability/dates-availability-stored.service';
import { DatesAvailabilityResponse } from '@fz-original/app/shared/services/session-availability/dates-availability.adapter';
import { GetAvailableSessionQuery } from '@fz-original/app/shared/services/session-availability/get-available-session-query';
import { SessionAvailabilityForDateStoredService } from '@fz-original/app/shared/services/session-availability/session-availability-for-date-stored.service';
import { SessionAvailabilityStoredService } from '@fz-original/app/shared/services/session-availability/session-availability-stored.service';
import { SessionAvailabilityService } from '@fz-original/app/shared/services/session-availability/session-availability.service';
import { SessionSelectorType } from '@fz-original/app/shared/services/session-availability/session-selector-type.enum';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { CartUtil } from '@fz-original/app/shared/utils/cart.util';
import { flatArray } from '@fz-original/app/shared/utils/object.utils';
import {
  PaymentMethodDisplay,
  resolvePaymentMethodLabel,
} from '@fz-original/app/shared/utils/payment-method-display/payment-method-display.util';
import { environment } from '@fz-original/environments/environment';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntDialogRef, IgntDialogService } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
// B2BP-1995: commented out with releaseTicketsFooter below.
// import { FooterConfiguration } from '@ignite/legacy/components/ignt-bottom-sheet-dialog/ignt-bottom-sheet-dialog.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { BehaviorSubject, EMPTY, from, fromEvent, iif, merge, Observable, of, ReplaySubject, Subject, throwError, timer } from 'rxjs';
import {
  buffer,
  catchError,
  concatMap,
  debounceTime,
  defaultIfEmpty,
  filter,
  finalize,
  groupBy,
  map,
  mergeMap,
  switchMap,
  take,
  takeUntil,
  tap,
  toArray,
} from 'rxjs/operators';

import { PaymentType } from '../../../checkout/models/payment-type.enum';
import { OboSecondScreenDataService } from '../../../obo-second-screen/services/obo-second-screen-data.service';
import { applyUpgradeSeatingPricing, isUpgradeSeatingMode } from '../../../obo-second-screen/utils/upgrade-seating-pricing.util';
import {
  ContactInformationFieldEnum,
  ContactInformationRequirementEnum,
  OnsiteSetup,
  ShiftStrategyEnum,
} from '../../../shared/models/onsite-setup';
import { computeEffectiveCacheConfig } from '../../../shared/models/onsite-setup.util';
import { CheckoutUserStorageService } from '../../../shared/services/checkout-user-storage/checkout-user-storage.service';
import { EfrHealthCheckModalService } from '../../../shared/services/efsta-fiscal/efr-health-check-modal.service';
import { EfrUserMessageModalService } from '../../../shared/services/efsta-fiscal/efr-user-message-modal.service';
import { FiscalTaxGateService } from '../../../shared/services/efsta-fiscal/fiscal-tax-gate.service';
import { EfrGuardPurchaseContext } from '../../../shared/services/efsta-fiscal/models/efr-health-check.model';
import { PaymentConfigStorageService } from '../../../shared/services/payment/payment-config-storage.service';
import { CashChangeCalculatorModalComponent } from '../../../ticketing/components/cash-change-calculator-modal/cash-change-calculator-modal.component';
import { ConfirmModalComponent } from '../../../ticketing/components/confirm-modal/confirm-modal.component';
import { ActiveShift, ShiftsActionsEnum } from '../../../ticketing/components/start-end-shift/start-end-shift.component';
import { CheckoutModalResendService } from '../../../ticketing/services/checkout-modal-resend/checkout-modal-resend.service';
import {
  OneStepPurchaseService,
  PayOneStepQuery,
  PayOneStepResponse,
} from '../../../ticketing/services/one-step-purchase/one-step-purchase.service';
import { TicketingUnsavedChangesBypassService } from '../../../ticketing/services/ticketing-unsaved-changes-bypass.service';
import { isCancelledTransactionError } from '../../../ticketing/utils/cancelled-transaction-error.util';
import { restoreLocalCartPresentation } from '../../../utils/restore-local-cart-presentation.util';
import { OSS_SHIFT_ACTION_EVENT_KEY } from '../../components/oss-shift-widget/oss-shift-action-event-key';
import { OSS_SHIFT_READY_EVENT_KEY } from '../../components/oss-shift-widget/oss-shift-ready-event-key';
import { OSS_SHIFT_REQUEST_EVENT_KEY } from '../../components/oss-shift-widget/oss-shift-request-event-key';
import { ModifiedOrderMode, ModifiedOrderModeEnum, OssCustomTilesData, UpdateTicketTypeCounter } from '../../models';
import { type PosCartSource } from '../../tracking/events/pos-cart-item-quantity-change.event';
import { posCheckoutCashCalcShowModal } from '../../tracking/events/pos-checkout-cash-calc-show-modal.event';
import { posCheckoutContactInfoCloseModal } from '../../tracking/events/pos-checkout-contact-info-close-modal.event';
import { posCheckoutContactInfoShowModal } from '../../tracking/events/pos-checkout-contact-info-show-modal.event';
import { posCheckoutPaymentCompleted } from '../../tracking/events/pos-checkout-payment-completed.event';
import { posCheckoutPaymentFailed } from '../../tracking/events/pos-checkout-payment-failed.event';
import { posCheckoutPaymentStarted } from '../../tracking/events/pos-checkout-payment-started.event';
import {
  posCheckoutSelectPaymentMethod,
  type PosCheckoutSelectPaymentMethodSource,
} from '../../tracking/events/pos-checkout-select-payment-method.event';
import { posCheckoutShiftCloseModal } from '../../tracking/events/pos-checkout-shift-close-modal.event';
import { posCheckoutShiftShowModal } from '../../tracking/events/pos-checkout-shift-show-modal.event';
import { TrackPosCartItemQuantityChangeService } from '../../tracking/services/track-pos-cart-item-quantity-change.service';
import { TrackPosCheckoutPromoCodesService } from '../../tracking/services/track-pos-checkout-promo-codes.service';
import {
  getFilledContactInfoFields,
  getRequiredContactInfoFields,
  getVisibleContactInfoFields,
  resolveContactInfoCloseModalAction,
} from '../../tracking/utils/pos-checkout-contact-info-close-modal.util';
import {
  buildPosCheckoutPaymentCompletedData,
  buildPosCheckoutPaymentFailedData,
  collectPlanIdsFromCart,
  shouldTrackAdyenPaymentStarted,
} from '../../tracking/utils/pos-checkout-payment.util';
import { buildPosCheckoutSelectPaymentMethodData } from '../../tracking/utils/pos-checkout-select-payment-method.util';

interface FormattedError {
  message: string;
  title: string;
}

interface PaymentError {
  error?: { code?: string | number; message?: string };
  message?: string;
}

const allowedTicketsErrorCode = 905;
const maxCartUpdateRetries = 3;
const invalidCartStatusErrorCode = 937;
const invalidCartStatusCodesForPrepare: readonly number[] = [invalidCartStatusConfirmedErrorCode];
const invalidCartStatusCodesForUpdate: readonly number[] = [invalidCartStatusErrorCode];

const genericTicketRequirementsError: FormattedError = {
  message: 'oneStopShop.errors.ticketRequirements.generic',
  title: 'oneStopShop.errors.ticketRequirements.title',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  standalone: true,
  template: '',
})
export abstract class OssTicketingComponent extends BaseTicketingComponent implements OnInit, OnDestroy {
  #audioService = inject(AudioService);
  #bookingQuestionsModalService: BookingQuestionsModalService = inject(BookingQuestionsModalService);
  protected readonly reservationSettlementSessionService = inject(ReservationSettlementSessionService);
  protected reservationSettlementSeededCartId: string | null = null;
  readonly isReservationSettlementRejected: WritableSignal<boolean> = signal<boolean>(false);
  readonly isReservationSettlementMismatch: WritableSignal<boolean> = signal<boolean>(false);
  #cartTimingService = inject(CartTimingService);
  #changeDetectorRef = inject(ChangeDetectorRef);
  #checkoutUserStorageService = inject(CheckoutUserStorageService);
  #destroyRef = inject(DestroyRef);
  #dualScreenStorageService = inject(DualScreenStorageService);
  readonly isDualScreenStoragePresent: Signal<boolean> = toSignal(this.#dualScreenStorageService.observeContainsData(), {
    initialValue: this.#dualScreenStorageService.containsData(),
  });
  #efrHealthCheckModalService = inject(EfrHealthCheckModalService);
  readonly #fiscalTaxGateService = inject(FiscalTaxGateService);
  readonly #efrUserMessageModalService = inject(EfrUserMessageModalService);
  readonly #trackPosCartItemQuantityChangeService = inject(TrackPosCartItemQuantityChangeService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #trackPosCheckoutPromoCodesService = inject(TrackPosCheckoutPromoCodesService);
  #addAdditionalCouponDialogRef: IgntDialogRef<CouponCodeModalResult> | null = null;
  #hadCouponApplyErrorInModal = false;
  #injector = inject(Injector);
  readonly #igntDialogService = inject(IgntDialogService);
  readonly #checkoutModalFlowService = inject(CheckoutModalFlowService);
  readonly #checkoutPaymentDriver = inject(CHECKOUT_PAYMENT_DRIVER);
  readonly #checkoutModalResendService = inject(CheckoutModalResendService);
  readonly #onsiteCheckoutContextResolver = inject(OnsiteCheckoutContextResolver);
  #isCheckoutModalFlow = false;
  #requestedCheckoutFlow: CheckoutFlowKind = 'fullCheckout';
  #oboSecondScreenDataService = inject(OboSecondScreenDataService);
  #paymentCheckoutAdyenService = inject(PaymentCheckoutAdyenService);
  #productSessionsSummaryService = inject(ProductSessionsSummaryService);
  #secondScreenSeatingMapStorageService = inject(SecondScreenSeatingMapStorageService);
  #seatsManagementService = inject(SeatsManagementService);
  #splitPaymentRetryUiService = inject(SplitPaymentRetryUiService);
  #boxOfficePaymentMethodsService = inject(BoxOfficePaymentMethodsService);
  readonly #checkoutPaymentOptionsService = inject(CheckoutPaymentOptionsService);
  readonly #memberships = inject(MembershipsIdentificationService);
  readonly #paymentFlowFeatureService = inject(PaymentFlowFeatureService);
  readonly #fiscalComplianceBlockGuardService = inject(FiscalComplianceBlockGuardService);
  readonly #fiscalComplianceBlockModalService = inject(FiscalComplianceBlockModalService);
  #ticketingUnsavedChangesBypass = inject(TicketingUnsavedChangesBypassService, { optional: true });
  #toastService = inject(ToastService);
  #onsiteSetupRequiredApiErrorService = inject(OnsiteSetupRequiredApiErrorService);
  #rescheduleService = inject(RescheduleService);
  #activatedRoute = inject(ActivatedRoute);
  #datesAvailabilityStoredService = inject(DatesAvailabilityStoredService);
  #sessionAvailabilityStoredService = inject(SessionAvailabilityStoredService);
  #sessionAvailabilityForDateStoredService = inject(SessionAvailabilityForDateStoredService);
  #isReadyForSeatReleasePayment = false;
  #cartRecoveryInProgress = false;
  #modifyOrderNewOrderId: number | null = null;
  #lastCartPrepareAttempt: { cartId: string; customerEmail: string | null } | null = null;
  /**
   * Cart and query captured when the payment is armed. The payOneStep confirmation is asynchronous
   * (terminal + book-result polling), and a concurrent state reset (loadNewSearch, invalid-cart
   * recovery, discard-after-error) can null `this.cart` before the success callback runs. Post-payment
   * processing reads these snapshots instead of live state so a completed sale never throws or is lost.
   */
  #paidCartSnapshot: Cart | null = null;
  #paidQuerySnapshot: PayOneStepQuery | null = null;
  /** Set when a seating map load succeeds; used to skip redundant reloads on tab switches, not on timeslot/pool change. */
  #lastSeatingMapLoadContext: { datetime: string; poolId: number } | null = null;
  #useCacheSwrEnabled = false;

  static readonly cartTotalDebounceMs = 500;
  /** The seating map emits one add/remove per seat; consecutive seat changes within this window are aggregated into a single quantity-change event. */
  static readonly seatTrackingBatchMs = 700;
  readonly #seatTrackingTrigger$ = new Subject<{ newCount: number; previousCount: number; sessionId: number | string }>();

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
    private oneStepPurchaseService: OneStepPurchaseService,
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
    this.cashModalMandatory = optimizelyService.isFeatureEnabled('obo_cash_modal_mandatory') ?? false;
    this.showOnlyTotalInPriceViewer = optimizelyService.isFeatureEnabled('obo_only_total_price_viewer') ?? false;
    this.daysWithActiveSession = this.#getMaxPurchasableDays();
    this.showCouponOneStep = optimizelyService.isFeatureEnabled('coupons_in_one_step') ?? false;
    this.couponCombinationEnabled = optimizelyService.isFeatureEnabled(FeatureFlags.OSS_GIFT_CARD_COMBINATION) ?? false;
    this.#initialiseActiveShiftEvent();
    this.#setupDebouncedCartTotal();
    this.#setupSeatTrackingBatch();
  }

  readonly isNewPaymentFlowActive = this.#paymentFlowFeatureService.isNewPaymentFlowActive;
  activeShift: WritableSignal<ActiveShift | null> = signal<ActiveShift | null>(null);
  activeShiftOneStepReady$: Subject<void> = new Subject();
  activeShiftReady = false;
  activeShiftReady$: Subject<ActiveShift> = new Subject();
  addCounterSessionId: Subject<number> = new Subject<number>();
  abstract isProductCatalogLoaded: WritableSignal<boolean>;
  abstract clearCartFromCartDetail(): void;
  cacheTimeoutInSeconds = 0;
  cartTotalMoney: Money;
  cartTotalMoneyWithoutCoupon: Money;
  cartHasEffectiveDiscount: boolean;
  cashCalculatorCashReceived: number | null = null;
  cashModalMandatory = false;
  channel: Channel = Channel.BoxOffice;
  channelId: string = Channel.BoxOffice;
  contactFields: string[] = ['email', 'firstName', 'lastName'];
  contactInformation: Partial<ContactInformation>;
  protected lastPromoCodeInModal = '';
  coupon: Coupon | null = null;
  couponCodeApplied = new BehaviorSubject<boolean>(false);
  couponCodeApplied$ = this.couponCodeApplied.asObservable();
  couponError: BehaviorSubject<Error | null> = new BehaviorSubject<Error | null>(null);
  customer: Customer = null;
  couponCombinationEnabled = false;
  combinedCoupons: Coupon[] = [];
  couponCombinationSubtotal = 0;
  couponRemainingBalance: Money | null = null;
  effectiveCombinedCoupon: Coupon | null = null;
  date?: Date;
  disableAddSessionsToCartByCapacity = false;
  emailField = 'email';
  filters: SearchFilter;
  forceDisableIncreaseCounter = false;
  hasShiftsEnabled = false;
  get membershipsData(): MembershipsData {
    return this.#memberships.data();
  }
  multiPlanCartEnabled = false;
  readonly paymentMethodDisplay = new Map<PaymentType, PaymentMethodDisplay>();
  includeShopProducts = false;
  canOverrideCapacities = false;
  isInOverrideZone = false;
  includeOverrideCapacity = false;
  includeTimeSlotCapacity = true;
  paymentType: WritableSignal<PaymentType | null> = signal<PaymentType>(null);
  isPaymentsMenuConfirmButtonEnabled: Signal<boolean> = computed(() => {
    return !!this.paymentType();
  });
  isReleaseTicketsSheetOpen: WritableSignal<boolean> = signal<boolean>(false);
  releaseTicketSeats: WritableSignal<AccessTicket[]> = signal<AccessTicket[]>([]);
  releaseTicketSelections: WritableSignal<boolean[]> = signal<boolean[]>([]);
  releaseTicketsRequiredCount: WritableSignal<number> = signal<number>(0);
  releaseTicketsSelectedCount: Signal<number> = computed(() => this.releaseTicketSelections().filter(Boolean).length);
  // B2BP-1995 ((internal ticket)): commented out with the release-tickets sheet of
  // one-stop-shop.component.html. To enable it again, first migrate the legacy ignt-bottom-sheet-dialog to the Ignite Dialog.
  // releaseTicketsFooter: FooterConfiguration = {
  //   primaryActionText: this.translate.instant('oneStopShop.releaseTickets.button.label'),
  //   onPrimaryActionClick: () => this.onReleaseTickets(),
  //   primaryActionDisabled: () => this.releaseTicketsSelectedCount() !== this.releaseTicketsRequiredCount(),
  // };
  releaseTicketsAddedCount: WritableSignal<number> = signal<number>(0);
  lastSelectorStep = contactInformationSelectorStep;
  logErrorModal = true;
  readonly maxPaymentMethodInOneStep = 3;
  minutesBeforeToExpire = 0.5;
  onsiteSetupSelected: OnsiteSetup;
  paymentConfiguration: PaymentConfiguration | null = null;
  paymentInProgress = false;
  paymentTypes: PaymentType[];
  phoneField = 'phoneNumber';
  shouldResetOboSecondScreenToStandBy = true;
  showCartDetails = false;
  showCommonPaymentButton = false;
  showCouponOneStep = false;
  showDateSelectorFrom = true;
  showOnlyTotalInPriceViewer = false;
  showPaymentsInLateral = false;
  showPhoneNumberContactInformation = false;
  showEmailContactInformation = true;
  totalPrintViewerTimeout: NodeJS.Timeout;
  updateTicketTypeCounter: Subject<UpdateTicketTypeCounter> = new Subject<UpdateTicketTypeCounter>();
  useCacheEnabled = false;
  readonly updateCartTotalTrigger$ = new Subject<void>();

  override clearAll(): void {
    if (this.isReservationSettlementMode()) {
      this.releaseReservationSettlementCartLocally();
      this.restoreToBeginning();
      return;
    }
    super.clearAll();
  }

  protected override clearSelectedTicketsReferences(): void {
    const hasProducts = this.productSessions.length > 0;
    const hasDataToPreserve = this.selectedTicketsBySessionId.size > 0 || this.selectedTicketsBySessionType.size > 0;
    if (!hasProducts || !hasDataToPreserve) {
      super.clearSelectedTicketsReferences();
      return;
    }

    const { customTabSelectionsBySessionId, customTabSelectionsBySessionType } = this.#extractCustomTabsSelections();
    super.clearSelectedTicketsReferences();
    this.#restoreCustomTabsSelections(customTabSelectionsBySessionId, customTabSelectionsBySessionType);
  }

  override createCart(cart: Cart): Observable<BaseResponse<Cart>> {
    if (!this.partner) {
      return EMPTY;
    }
    const query: CreateCartQuery = {
      channel: this.channel,
      channelId: this.channelId,
      hasSeating: cart.hasSeating,
      locale: cart.locale,
      partnerId: this.partner.id,
      seatingHoldTokensBySessionId: this.shouldUseSeatingHoldTokensBySession ? this.seatingHoldTokensBySessionId : undefined,
      seatingToken: this.seatingToken,
      sessionItemsByDatetime: cart.sessionItemsByDatetime,
      useSessionItemLines: true,
      ...(this.#shouldSendOverrideCapacity() && { overrideCapacity: true }),
    };
    return this.cartService!.createCart(query) as Observable<BaseResponse<Cart>>;
  }

  override createOrUpdateCart(): Observable<BaseResponse<Cart>> {
    if (this.#isReadyForSeatReleasePayment || this.isReservationSettlementMode()) {
      const cart = this.cart ?? this.nonConfirmedCart;
      return cart ? of({ data: cart, error: null } as BaseResponse<Cart>) : EMPTY;
    }
    const freshCart = this.getCart();
    if (freshCart !== null) {
      this.nonConfirmedCart = freshCart;
    }
    if (this.cart === null && this.nonConfirmedCart !== null) {
      return this.createCart(this.nonConfirmedCart);
    }
    const updatedCart = this.currentStep == this.seatingSelectorStep ? this.cart : this.nonConfirmedCart;
    if (!updatedCart) {
      return of();
    }
    const newCart: Cart = new Cart(new Map([...updatedCart.sessionItemsByDatetime]));
    newCart.hasSeating = this.nonConfirmedCart?.hasSeating ?? false;
    newCart.id = this.cart!.id;
    newCart.sessionItemLines = this.cart?.sessionItemLines ?? [];
    return this.#updateCartWithOverrideCapacity(newCart);
  }

  #updateCartWithOverrideCapacity(cart: Cart, retryCount: number = 0): Observable<BaseResponse<Cart>> {
    if (!this.partner) {
      return EMPTY;
    }
    const partnerId = this.partner.id;
    const updateCartQuery: UpdateCartQuery = {
      cartId: cart.id!,
      hasSeating: cart.hasSeating,
      partnerId,
      seatingHoldTokensBySessionId: this.shouldUseSeatingHoldTokensBySession ? this.seatingHoldTokensBySessionId : undefined,
      seatingMapState: this.seatingMapState ?? undefined,
      sessionItemLines: cart.sessionItemLines,
      sessionItemsByDatetime: cart.sessionItemsByDatetime,
      useSessionItemLines: true,
      ...(this.#shouldSendOverrideCapacity() && { overrideCapacity: true }),
    };
    if (this.seatingMapState && !this.seatingMapState.hold_token && this.seatingToken) {
      updateCartQuery.seatingMapState = {
        ...this.seatingMapState,
        hold_token: this.seatingToken,
      };
    }
    const discardCartQuery: DiscardCartQuery = {
      cartId: cart.id!,
      partnerId,
    };
    return (this.cartService!.updateCart(updateCartQuery) as Observable<BaseResponse<Cart>>).pipe(
      switchMap(response => {
        const errorCode = response.error?.code;
        const isFixUpdateCartEnabled =
          this.channel === Channel.BoxOffice && (this.optimizelyService?.isFeatureEnabled('fix_update_cart_box_office') ?? false);
        if (cart.hasSeating === true && this.#invalidCartStatusMatches(errorCode, invalidCartStatusCodesForUpdate)) {
          return this.#handleInvalidCartStatus().pipe(switchMap(() => EMPTY));
        }
        if (this.#invalidCartStatusMatches(errorCode, invalidCartStatusCodesForUpdate)) {
          if (retryCount >= maxCartUpdateRetries) {
            return of(response);
          }
          return this.cartService!.discardCart(discardCartQuery).pipe(
            switchMap(() => this.createCart(cart)),
            switchMap(res => this.checkResponseData(res)),
            tap(res => {
              this.cart = res.data;
              this.cartDetailService?.setCart(this.cart!);
              this.cart!.hasSeating = this.nonConfirmedCart?.hasSeating ?? false;
            }),
            switchMap(res => {
              if (res.data == null) {
                return throwError(() => res);
              }
              return this.#updateCartWithOverrideCapacity(res.data, retryCount + 1);
            }),
          );
        }
        if (isFixUpdateCartEnabled) {
          return this.cartService!.getCart(partnerId, cart.id!) as Observable<BaseResponse<Cart>>;
        }
        return of(response);
      }),
      catchError((error: unknown) => {
        const code = (error as BaseResponse<unknown> | undefined)?.error?.code;
        if (cart.hasSeating === true && this.#invalidCartStatusMatches(code, invalidCartStatusCodesForUpdate)) {
          return this.#handleInvalidCartStatus().pipe(switchMap(() => EMPTY));
        }
        return throwError(() => error);
      }),
    );
  }

  override discardCartBeforeNavigation(): Observable<void> {
    if (this.isReservationSettlementMode()) {
      this.releaseReservationSettlementCartLocally();
      return of(void 0);
    }
    return super.discardCartBeforeNavigation();
  }

  override getUnloadDiscardCartQuery(): DiscardCartQuery | null {
    if (this.isReservationSettlementMode()) {
      return null;
    }
    return super.getUnloadDiscardCartQuery();
  }

  override onClearSelectionRequested(): void {
    if (this.isReservationSettlementMode()) {
      this.releaseReservationSettlementCartLocally();
      return;
    }
    super.onClearSelectionRequested();
  }

  protected override getSessionAvailable(params: GetSessionAvailableParams): void {
    if (!this.partner || !this.selectedPlan || !this.fromDate || !this.timezone) {
      return;
    }
    this.error = false;
    this.errorObject = null;
    this.hasResult = false;
    const isModifyOrderEntry = this.#isModifyOrderEntry();
    const query: GetAvailableSessionQuery = {
      businessId: this.businessId,
      cacheTimeoutInSeconds: params.cacheTimeoutInSeconds ?? this.cacheTimeoutInSeconds,
      channel: this.getAvailabilityQueryChannel(),
      channelId: this.getAvailabilityQueryChannelId(),
      contentLanguage: this.translate.currentLang,
      daysWithActiveSession: params.daysWithActiveSession ?? this.daysWithActiveSession,
      fromDate: this.fromDate,
      includeOngoing: params.includeOngoing ?? this.includeOngoing,
      includeSoldOutSessions: isModifyOrderEntry ? true : (params.includeSoldOutSessions ?? this.includeSoldOutSessions),
      partnerId: this.partner.id,
      placeId: this.selectedPlace.id,
      planId: this.selectedPlan.id,
      sessionTypeIds: this.sessionTypeIds,
      timezone: this.timezone,
    };

    if (this.availabilityInUtc) {
      query.utc = true;
    }

    if (this.isHidden !== undefined) {
      query.isHidden = this.isHidden;
    }

    if (this.includeTimeSlotCapacity) {
      query.includeTimeSlotCapacity = this.includeTimeSlotCapacity;
    }

    if (this.includeOverrideCapacity) {
      query.includeOverrideCapacity = true;
    }

    const rescheduleOrderId = this.getRescheduleOrderId();
    if (rescheduleOrderId !== undefined) {
      query.rescheduleOrderId = rescheduleOrderId;
    }

    this.getSessionAvailableSubscription?.unsubscribe();
    this.getSessionAvailableSubscription = this.changePlan()
      .pipe(
        mergeMap(() => {
          query.includeOngoing = params.includeOngoing ?? this.getIncludeOngoing();
          query.includeShopProducts = this.includeShopProducts;
          return this.#getDatesAndSessionsAvailabilityOverride(
            query,
            isModifyOrderEntry ? false : (params.useCacheEnabled ?? this.useCacheEnabled),
            params.onlyGetSessions ?? true,
          );
        }),
        finalize(() => this.onGetSessionAvailableEnd()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(
        response => {
          this.isLoadingSessions = false;
          this.isLoadingDates = false;
          if (response?.data) {
            this.hasResult =
              response.data.regularSessionAvailabilitySummaryByDates && response.data.regularSessionAvailabilitySummaryByDates.length > 0;
            this.sendLoadTicketingEvent(this.hasResult);
            const availabilityDates = this.filterOutWhenOnlyGlobalAddons(response.data.regularSessionAvailabilitySummaryByDates);
            this.hasResult = availabilityDates.length > 0;
            this.regularSessionAvailabilitySummaryByDateList = availabilityDates;
            const newProductSessions = response?.data?.productSessions ?? [];
            newProductSessions.forEach(newProductSession => {
              if (!this.productSessions.some(existingProductSession => existingProductSession.id === newProductSession.id)) {
                this.productSessions.push(newProductSession);
              }
            });
            const newProductTypes = response?.data?.getProductTypes() ?? [];
            newProductTypes.forEach(newProductType => {
              if (!this.productTypes.some(existingProductType => existingProductType.sessionId === newProductType.sessionId)) {
                this.productTypes.push(newProductType);
              }
            });
            this.allowMultiSessionPurchase = response.data.allowMultiSessionPurchase;
            this.hasExplodePipe = response.data.hasExplodePipe;
            this.timezone = response.data.timezone;
            this.resetScroll();
            this.selectDefaultSessionForAdvancedFlow();
            this.updateTicketTypeFields();
            this.currency =
              (this.regularSessionAvailabilitySummaryByDateList ?? [])[0]?.sessionAvailabilityByDatetimeList[0]?.sessionAvailabilityList[0]
                ?.ticketPrice?.currency ?? null;
            this.sessionSelectorType = response.data.sessionSelectorType as SessionSelectorType;
            this.updateFreeMapMode();
            this.applyModifyOrderSharedAvailabilityRules();
            this.sessionAvailableReady.next();
          } else {
            this.error = true;
            this.errorObject = response?.error;
          }
          this.changeDetectorRef.markForCheck();
          this.#resetPreservingCartAfterRender();
        },
        error => {
          this.isLoadingSessions = false;
          this.isLoadingDates = false;
          this.error = true;
          this.errorObject = error;
          this.changeDetectorRef.detectChanges();
          this.#resetPreservingCartAfterRender();
        },
      );
  }

  protected override onGetSessionAvailableEnd(): void {
    super.onGetSessionAvailableEnd();
    const hasItemsInCart = (this.nonConfirmedCart?.sessionItemsByDatetime?.size ?? 0) > 0;
    const noAvailability = !this.hasResult && this.regularSessionAvailabilitySummaryByDateList.length === 0;

    if (noAvailability && !this.isReservationSettlementActive() && (!this.multiPlanCartEnabled || !hasItemsInCart)) {
      this.clearCart();
      this.clearSelectedTickets();
    }
  }

  override updateSeatsInCart(data: FreeSeatResponse): void {
    if (this.#isReadyForSeatReleasePayment) {
      return;
    }
    if (!data.adding && !this.selectedTicketsBySessionId.has(data.sessionId.toString())) {
      return;
    }

    const previousCount = this.selectedTicketsBySessionId.get(data.sessionId.toString()) ?? 0;
    const newCount = data.adding ? previousCount + 1 : previousCount - 1;
    this.#seatTrackingTrigger$.next({ newCount, previousCount, sessionId: data.sessionId });

    super.updateSeatsInCart(data);
    this.#syncHighlightedSeatsStorage();
    this.refreshCartTotal();
  }

  addCustomTileSessionsToTicketTypes(customTilesData: OssCustomTilesData): void {
    customTilesData.customTiles.forEach(customTile => {
      customTile.customTile.sessions.forEach(session => {
        const ticketType = new TicketType(
          session.name,
          session.sessionType?.id,
          session.minimumTicketsAllowedPerBooking,
          session.getMaximumSelectableTickets(this.canOverrideCapacities),
          !this.#isSessionDisabledConsideringOverride(session),
          session.isHidden,
          session.availableTickets,
          session.ticketPrice,
          session.surchargePerTicket,
          session.id,
          session.sessionType?.reservationRestriction,
          session.sessionType?.ticketReceiptLabel,
          session.sessionType?.isAddOn ?? false,
          session.details,
          session.sessionType?.isShopProduct ?? false,
          undefined,
          undefined,
          session.sessionType?.ticketSelectorStepQuantity ?? 1,
          false,
          undefined,
          undefined,
          undefined,
          session.sessionType?.tileColor,
        );
        ticketType.overrideAvailableTickets = session.overrideAvailableTickets;

        if (session.sessionType?.isShopProduct) {
          if (!this.productTypes.some(productType => productType.sessionId === session.id)) {
            this.productTypes.push(ticketType);
          }

          return;
        }

        if (!this.ticketTypes.some(ticketType => ticketType.sessionId === session.id)) {
          this.ticketTypes.push(ticketType);
        }
      });
    });
  }

  addProductSessionsByCustomTabsProductSessions(customTilesData: OssCustomTilesData): void {
    customTilesData.customTiles.forEach(customTile => {
      customTile.customTile.sessions.forEach(session => {
        if (session.sessionType?.isShopProduct && !this.productSessions.some(productSession => productSession.id === session.id)) {
          this.productSessions.push(session);
        }
      });
    });
  }

  addSessionsToCart(): void {
    this.#checkCartSessionsIsAboutToExpire();
    this.showShiftModal();
  }

  addSessionsToCartIsDisabled(): boolean {
    if (this.#cartIsNotEmptyAndContainsOnlyShopProducts(this.nonConfirmedCart)) {
      return this.isLoadingCart;
    }

    if (this.disableAddSessionsToCartByCapacity || super.addSessionsToCartIsDisabled()) {
      return true;
    }

    return !this.selectedSession;
  }

  applyCouponDiscountOneStep(code: string, lazyCouponType: string | null = null): void {
    this.lastPromoCodeInModal = code;
    this.#applyCouponOneStep$(code, lazyCouponType).pipe(takeUntil(this.destroy$)).subscribe();
  }

  resetPromoCodeModalSession(): void {
    this.lastPromoCodeInModal = '';
    this.#hadCouponApplyErrorInModal = false;
  }

  trackPromoCodeModalClosed(): void {
    if (this.#hadCouponApplyErrorInModal) {
      return;
    }

    if (this.couponCodeApplied.getValue()) {
      this.#trackPosCheckoutPromoCodesService.trackCloseModal(this.lastPromoCodeInModal, 'apply_promo_code');
      return;
    }

    this.#trackPosCheckoutPromoCodesService.trackCloseModal(this.lastPromoCodeInModal, 'close');
  }

  applyOnsiteSetup(): void {
    this.channelId = this.onsiteSetupSelected.channel_id ?? Channel.BoxOffice;
    this.#updatePaymentConfigurationFromOnsiteSetup();
    this.daysWithActiveSession = this.#getMaxPurchasableDays(this.onsiteSetupSelected);
    this.hasShiftsEnabled = this.onsiteSetupSelected.shift_strategy !== ShiftStrategyEnum.disabled;
    this.includeSoldOutSessions = this.onsiteSetupSelected.show_sold_out_sessions;
    this.canOverrideCapacities = this.onsiteSetupSelected.can_override_capacities ?? false;
    this.includeOverrideCapacity = this.canOverrideCapacities;
    this.#updatePaymentMethodsAvailable();
    this.trackingService.track(
      new OnsiteSetupSelectedEvent({
        details: JSON.stringify(this.onsiteSetupSelected),
        name: this.onsiteSetupSelected.name,
      }),
    );
  }

  clickOnPayOneStep(paymentType?: PaymentType, trackSelectPayment = false): void {
    if (this.isReservationSettlementMode()) {
      if (!this.#matchesReservationSettlementCart()) {
        this.#isCheckoutModalFlow = false;
        this.#requestedCheckoutFlow = 'fullCheckout';
        this.#raiseReservationSettlementMismatch();
        return;
      }
      this.isReservationSettlementMismatch.set(false);
    }

    if (this.isModifyOrderMode()) {
      if (this.modifyOrderPaymentCart() !== null) {
        this.payModifyOrderDifference(paymentType);
        return;
      }
      this.confirmModifyOrder();
      return;
    }

    if (trackSelectPayment && paymentType != null) {
      this.trackSelectPaymentMethod(paymentType, 'button');
    }

    if (this.#shouldSendOverrideCapacity()) {
      this.#openOverrideCapacityConfirmationModal()
        .pipe(take(1), filter(Boolean))
        .subscribe(() => this.#proceedWithPayOneStep(paymentType));
      return;
    }
    this.#proceedWithPayOneStep(paymentType);
  }

  protected override handleCartContent(): Observable<BaseResponse<Cart> | never | void> {
    const emptyCart = !this.nonConfirmedCart || this.nonConfirmedCart.getNumberOfTicketAndProductCounts() === 0;
    if (emptyCart) {
      this.showModalError();
      return EMPTY;
    }
    if (this.manageAsFreeSeatingMap && !this.isReservationSettlementMode()) {
      if (!this.seatingSelectorRef) {
        return EMPTY;
      }
      this.confirmSeatingMap$.complete();
      this.confirmSeatingMap$ = new ReplaySubject<void>(1);
      this.finishSeating();
      return this.confirmSeatingMap$;
    }
    return this.addSessionsToCartObservable(false);
  }

  #proceedWithPayOneStep(paymentType?: PaymentType): void {
    this.#contactInformationCollectedForCoupon = false;
    this.currentStep = this.ticketSelectorStep;

    if (paymentType) {
      this.paymentType.set(paymentType);
    }

    if (this.nonConfirmedCart) {
      this.priceViewerService.showTotal(this.onsiteSetupSelected, this.nonConfirmedCart.total.currency, this.nonConfirmedCart.total.amount);
    }

    const checkedCashRegisterId = this.activeShift()?.cashRegister;
    this.#guardFiscalCompliance(this.nonConfirmedCart)
      .pipe(
        take(1),
        filter((eligible: boolean) => eligible),
        switchMap(() =>
          this.#efrHealthCheckModalService.guardPurchase(
            this.onsiteSetupSelected?.place?.country_iso_code_2,
            this.#efrGuardPurchaseContext(),
          ),
        ),
        take(1),
        filter((healthy: boolean) => healthy),
        switchMap(() => this.#validateShift()),
        take(1),
        switchMap(() => this.#guardFiscalComplianceAfterShiftValidation(checkedCashRegisterId, this.nonConfirmedCart)),
        take(1),
        filter((eligible: boolean) => eligible),
        switchMap(() => this.#guardPurchaseAfterShiftValidation(checkedCashRegisterId)),
        take(1),
        filter((healthy: boolean) => healthy),
        switchMap(() => this.#handleCouponCombinationPaymentPreSteps$()),
        take(1),
        switchMap(() =>
          this.handleCartContent().pipe(
            take(1),
            switchMap(() =>
              this.#checkCartTotalIsZeroIfPaymentMethodIsFree().pipe(
                take(1),
                switchMap(() =>
                  this.#checkCartSessionsIsAboutToExpireObservable().pipe(
                    take(1),
                    switchMap(() =>
                      this.#handleContactInformation().pipe(
                        take(1),
                        switchMap(() => this.#discardAndRecreateCartIfCustomerChanged$()),
                        filter(Boolean),
                        switchMap(() => this.#guardFiscalTaxes(this.cart)),
                        take(1),
                        filter((fiscalisable: boolean) => fiscalisable),
                        switchMap(() =>
                          this.#handleBookingQuestions().pipe(
                            take(1),
                            switchMap(() =>
                              this.#openCheckoutModalIfNeeded().pipe(
                                take(1),
                                switchMap(() =>
                                  this.#handleCashCalculator().pipe(
                                    take(1),
                                    switchMap((cash: { amount: number } | null) =>
                                      this.#validateCashCalculator(cash).pipe(
                                        take(1),
                                        switchMap(() => {
                                          this.cashCalculatorCashReceived = cash !== null ? cash.amount : null;
                                          this.#isReadyForSeatReleasePayment = true;
                                          return this.#payInOneStepWithModalRetry().pipe(
                                            concatMap(response => this.#modifyOrderLinkAfterPayInOneStep(response)),
                                          );
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
        error: (error: unknown) => {
          this.#isReadyForSeatReleasePayment = false;
          this.#ticketingUnsavedChangesBypass?.clearPendingBypass();

          if (this.#handleFiscalComplianceBlockOnPrepare(error)) {
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

          if (this.#invalidCartStatusMatches((error as BaseResponse<unknown> | undefined)?.error?.code, invalidCartStatusCodesForPrepare)) {
            this.#handleInvalidCartStatus().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
            return;
          }
          const transactionId = this.oneStepPurchaseService.getLastPaymentTransactionId(this.cart?.id);
          if (
            this.paymentType() === PaymentType.CARD_SPLIT &&
            transactionId &&
            this.cart?.id &&
            this.oneStepPurchaseService.getIsCancellingPayment()
          ) {
            this.#paymentCheckoutAdyenService.cancelHadCompletedPayments$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe({
              error: () => this.#showPaymentErrorModal(error),
              next: hadCompletedPayments => {
                if (hadCompletedPayments) {
                  this.#splitPaymentRetryUiService.showCancellationErrorModal(this.partner.id, this.cart!.id!, transactionId);
                } else {
                  this.#showPaymentErrorModal(error);
                }
              },
            });
          } else if (this.cart?.id && this.manageAsFreeSeatingMap) {
            this.#handlePaymentError(error);
          } else {
            this.#showPaymentErrorModal(error);
          }
        },
        next: (response: PayOneStepResponse) => {
          const payOneStepQuery = this.#paidQuerySnapshot ?? this.#generatePayOneStepQueryParams();
          const paidCart = this.#paidCartSnapshot;
          this.#trackPosCheckoutPaymentCompleted(payOneStepQuery.paymentType);
          if (paidCart !== null) {
            this.#sendCreateOrderEvent(response, payOneStepQuery, paidCart);
          }
          this.clearReservationSettlementSession();
          const navigationExtras: NavigationExtras = {
            queryParams: {
              cityId: this.selectedCity.id,
              mode: null,
              modified_order_id: null,
              planId: this.selectedPlan.id,
              reservation_cart_id: null,
              reservation_id: null,
              venueId: this.selectedPlace.id,
            },
            queryParamsHandling: 'merge',
            state: {
              autoPrint: true,
              isOssFlow: true,
              paymentTransactionId: this.oneStepPurchaseService.getLastPaymentTransactionId(payOneStepQuery.cartId),
              plan: this.plan,
            },
          };
          this.updateOboSecondScreenPayment();
          this.shouldResetOboSecondScreenToStandBy = false;

          if (this.#isUpgradeSeatingMode() || this.#isAddTicketsMode()) {
            if (this.#isUpgradeSeatingMode()) {
              this.#upgradeSeatingRelease();
            } else {
              this.#navigateToSuccessPage();
            }
          } else {
            const doNavigate = (): void => {
              this.#efrUserMessageModalService
                .showIfPresent()
                .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
                .subscribe(() => {
                  const purchasedCartId = payOneStepQuery.cartId ?? this.cart?.id;
                  if (purchasedCartId != null) {
                    this.#ticketingUnsavedChangesBypass?.markPendingBypass();
                    this.router.navigate(['/box-office/purchased-cart/', purchasedCartId], navigationExtras);
                    return;
                  }
                  this.#ticketingUnsavedChangesBypass?.markPendingBypass();
                  this.router.navigate(['/box-office/order/', response.order.id], navigationExtras);
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
          }
        },
      });
  }

  openSplitPaymentOptionsModal(): void {
    this.#isCheckoutModalFlow = true;
    this.clickOnPayOneStep();
  }

  openFullPaymentCash(): void {
    this.#isCheckoutModalFlow = true;
    this.#requestedCheckoutFlow = 'fullPaymentCash';
    this.clickOnPayOneStep();
  }

  openFullPaymentIntegrated(): void {
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

  #openCheckoutModalIfNeeded(charged?: { cart: Cart; total: Money }): Observable<void> {
    if (!this.#isCheckoutModalFlow) {
      return of(void 0);
    }
    const storedDeviceId = this.paymentConfigStorageService.getConfiguration()?.deviceId;
    const paymentOptions = this.#checkoutPaymentOptionsService.resolve(this.onsiteSetupSelected, storedDeviceId);
    const cashCaptureMode = this.#onsiteCheckoutContextResolver.resolveCashCaptureMode({
      activeShift: this.activeShift(),
      onsiteSetup: this.onsiteSetupSelected,
    });
    return this.#checkoutModalFlowService
      .openAndAwaitMethod({
        availableMethods: paymentOptions.methods,
        availableTerminals: paymentOptions.terminals,
        basePaymentConfiguration: paymentOptions.basePaymentConfiguration,
        checkoutFlows: paymentOptions.checkoutFlows,
        fitToTiles: paymentOptions.fitToTiles,
        cartItems: mapCartToCheckoutCartItems(charged?.cart ?? this.cart ?? this.nonConfirmedCart),
        cartTotal: charged?.total ?? this.cartTotalMoney,
        cashCaptureMode,
        locale: this.translate.currentLang ?? 'en-US',
        flow: this.#requestedCheckoutFlow,
        selectedTerminalId: paymentOptions.selectedTerminalId,
      })
      .pipe(
        take(1),
        tap((paymentType: PaymentType) => this.paymentType.set(paymentType)),
        map((): undefined => void 0),
      );
  }

  get currentSelectedDatetime(): string | null {
    if (!this.selectedSession?.selectedDatetime?.datetime) {
      return null;
    }
    return new Date(this.selectedSession.selectedDatetime.datetime).toISOString().replace(/.\d+Z$/g, 'Z');
  }

  getButtonImageUrl(paymentType: PaymentType): string | null {
    return this.paymentMethodDisplay.get(paymentType)?.imageUrl ?? null;
  }

  getButtonLabel(paymentType: PaymentType): string {
    return this.paymentMethodDisplay.get(paymentType)?.label ?? resolvePaymentMethodLabel(null, paymentType);
  }

  isButtonImageTintable(paymentType: PaymentType): boolean {
    return this.paymentMethodDisplay.get(paymentType)?.isImageTintable === true;
  }

  getCart(): Cart | null {
    const productSessions = this.getProductSessions();
    const sessionContextBySessionId = this.buildSessionCartContextForCart();
    return generateCart({
      allowMultiTimeSlotSelection: this.allowMultiTimeSlotSelection,
      cart: this.nonConfirmedCart ?? new Cart(),
      currentPlanIds: this.#getCurrentPlanIds(),
      productSessions,
      selectedTickets: {
        bySeating: this.selectedTicketsSeatsBySessionId,
        bySessionId: this.selectedTicketsBySessionId,
        bySessionType: this.selectedTicketsBySessionType,
      },
      session: this.selectedSession,
      timezone: this.timezone,
      sessionContextBySessionId: sessionContextBySessionId.size > 0 ? sessionContextBySessionId : undefined,
    });
  }

  getCurrentCart(): Cart | null {
    return this.nonConfirmedCart;
  }

  getMandatoryFields(): string[] {
    if (this.#cartIsNotEmptyAndContainsOnlyShopProducts(this.nonConfirmedCart)) {
      return this.#mergeMandatoryContactForCouponRemaining([]);
    }

    if (this.cart !== null && passSessionInCart(this.regularSessionAvailabilitySummaryByDateList, this.cart)) {
      return this.#mergeMandatoryContactForCouponRemaining([...this.contactFields]);
    }

    const mandatoryFields: string[] = [];
    const hasSessionsInFuture = this.cart && this.cart.hasSessionsInFuture;
    const hasContactInformationRequirement =
      this.onsiteSetupSelected?.contact_information_setup?.requirement_on_current_day == ContactInformationRequirementEnum.REQUIRED;

    if (hasSessionsInFuture || hasContactInformationRequirement) {
      if (this.showEmailContactInformation) {
        mandatoryFields.push(this.emailField);
      }
      if (this.showPhoneNumberContactInformation) {
        mandatoryFields.push(this.phoneField);
      }
    }

    return this.#mergeMandatoryContactForCouponRemaining(mandatoryFields);
  }

  getModifyOrderPayModalPayload(): {
    alertTitleKey?: string;
    interpolationParams?: Record<string, string>;
    messageKey: string;
    mode: 'error' | 'warning';
    titleKey: string;
  } | null {
    if (!this.#isUpgradeSeatingMode()) {
      return null;
    }

    const cart = this.getCart();
    const selectedSeatCount = cart ? this.#getSeatIdsFromCart(cart).length : 0;
    const originalOrderSeatCount = this.#getOriginalOrderSeatIds().length;
    const messageBase = 'oneStopShop.errors.modifyOrderValidation';
    const hasOriginalSeats = originalOrderSeatCount > 0;

    if (hasOriginalSeats && selectedSeatCount === 0) {
      return {
        messageKey: `${messageBase}.noSeatSelected`,
        mode: 'error',
        titleKey: `${messageBase}.noSeatSelectedTitle`,
      };
    }
    if (hasOriginalSeats && selectedSeatCount > originalOrderSeatCount) {
      return {
        messageKey: `${messageBase}.tooManySeats`,
        mode: 'error',
        titleKey: `${messageBase}.seatSelectionError`,
      };
    }

    const proceedWithoutUpgradeAddon = this.#getModifyOrderProceedWithoutUpgradeAddonWarning();
    if (proceedWithoutUpgradeAddon) {
      return proceedWithoutUpgradeAddon;
    }

    return null;
  }

  goToCheckout(): void {
    if (this.isReservationSettlementMode()) {
      return;
    }
    this.spinnerService.show();
    this.#discardAndRecreateCartIfCustomerChanged$()
      .pipe(
        concatMap((cartReadyForCustomer: boolean) => {
          if (!cartReadyForCustomer || this.cart?.id == null) {
            this.spinnerService.hide();
            return EMPTY;
          }
          return this.#guardFiscalTaxes(this.cart).pipe(take(1));
        }),
        concatMap((fiscalisable: boolean) => {
          if (!fiscalisable) {
            this.spinnerService.hide();
            return EMPTY;
          }
          this.#recordCartPrepareAttempt();
          return this.customerService.create(this.partner.id, this.customer);
        }),
        concatMap((response: any) => {
          if (response?.data) {
            this.customer = response.data;
            this.checkoutLogger.info('Going to prepare cart', this.#getCurrentLoggerContext(CheckoutStageEnum.CART_PREPARE), {
              cartId: this.cart?.id,
            });
            return this.cartService
              .prepareAndGetCart({
                cartId: this.cart.id,
                channel: this.channelId,
                onsiteSetupId: this.onsiteSetupSelected?.id,
                partnerId: this.partner.id,
                placeId: this.#getCheckoutPlaceId(),
                planId: this.plan.id,
                userId: response.data.id,
                ...(this.#shouldSendOverrideCapacity() && { overrideCapacity: true }),
              })
              .pipe(
                tap(prepareResponse =>
                  this.#onsiteSetupRequiredApiErrorService.logPrepareCartResponseIfOnsiteSetupIdRequired(
                    'oss_ticketing_go_to_checkout_prepare_and_get_cart',
                    prepareResponse,
                    {
                      cartId: this.cart.id,
                      channel: this.channelId,
                      partnerId: this.partner.id,
                      placeId: this.#getCheckoutPlaceId(),
                      planId: this.plan.id,
                      userId: response.data.id,
                    },
                  ),
                ),
              );
          }
          return throwError(response);
        }),
        catchError(err => {
          this.checkoutLogger.error(
            `Fail on prepare cart: ${err.toString()}`,
            this.#getCurrentLoggerContext(CheckoutStageEnum.CART_PREPARE),
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
            this.checkoutLogger.info('Successfully prepared cart', this.#getCurrentLoggerContext(CheckoutStageEnum.CART_PREPARE), {
              cartId: this.cart?.id,
            });
            this.seatingMapUrl = null;
            this.seatingMapState = null;
            this.#lastSeatingMapLoadContext = null;
            this.#sendPrepareCartEvent();
            this.#checkoutUserStorageService.setUserIdForCart(this.cart.id, this.customer.id);
            const navigationExtras: NavigationExtras = {
              queryParamsHandling: 'merge',
              state: {
                isInOverrideZone: this.#shouldSendOverrideCapacity(),
                cart: this.cart,
                plan: this.plan,
                userId: this.customer.id,
              },
            };
            this.shouldResetOboSecondScreenToStandBy = false;
            this.#ticketingUnsavedChangesBypass?.markPendingBypass();
            this.router.navigate(['/box-office/checkout/', this.cart.id], navigationExtras);
          } else {
            this.checkoutLogger.error(
              'Error on prepare cart',
              this.#getCurrentLoggerContext(CheckoutStageEnum.CART_PREPARE, {
                code: response.error?.code,
                message: response.error?.message,
              }),
              { cartId: this.cart?.id, error: response.error },
            );
            if (this.#fiscalComplianceBlockModalService.openIfNeeded(response)) {
              this.spinnerService.hide();
              return;
            }
            if (this.#invalidCartStatusMatches(response.error?.code, invalidCartStatusCodesForPrepare)) {
              this.#handleInvalidCartStatus().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
              return;
            }
            this.spinnerService.hide();
            const formattedError = this.#formatBackendError(response.error?.message, response.error?.code);
            this.showModal(formattedError.title, formattedError.message, response.error?.code);
          }
        },
        (response: BaseResponse<any>) => {
          this.checkoutLogger.error(
            'Error on prepare cart',
            this.#getCurrentLoggerContext(CheckoutStageEnum.CART_PREPARE, {
              code: response.error?.code,
              message: response.error?.message,
            }),
            { cartId: this.cart?.id, error: response.error },
          );
          if (this.#fiscalComplianceBlockModalService.openIfNeeded(response)) {
            this.spinnerService.hide();
            return;
          }
          if (this.#invalidCartStatusMatches(response.error?.code, invalidCartStatusCodesForPrepare)) {
            this.#handleInvalidCartStatus().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
            return;
          }
          this.spinnerService.hide();
          const formattedError = this.#formatBackendError(response.error?.message, response.error?.code);
          this.showModal(formattedError.title, formattedError.message, response.error?.code);
        },
      );
  }

  handleDisplayedSessionTypeChange(selectedSessionType: SessionAvailabilitySummaryByDateType): void {
    this.displayedSessionType = selectedSessionType;

    const newProductTypes = this.sessionAvailabilitySummary?.getProductTypes() ?? [];
    newProductTypes.forEach(newProductType => {
      if (!this.productTypes.some(existingProductType => existingProductType.sessionId === newProductType.sessionId)) {
        this.productTypes.push(newProductType);
      }
    });

    this.ticketTypes = this.sessionAvailabilitySummary?.getTicketTypes() ?? [];

    this.#restoreMissingTypesToSelection();

    this.updateTicketTypeFields();
  }

  handleProductScannedCode(code: string): void {
    if (!this.isProductCatalogLoaded()) {
      const warningMessage = this.translate.instant('boxOffice.cart.toastBanner.catalogNotLoadedMessage');
      this.#toastService.add({
        autoHide: true,
        delay: 3000,
        message: warningMessage,
        sentiment: AlertSentiment.warning,
      });
      return;
    }

    const productSession = this.#productSessionsSummaryService.getSessionDataByProductCode(code);

    if (productSession) {
      const previousCount = this.selectedTicketsBySessionId.get(productSession.id.toString()) ?? 0;
      this.addProductSessionToCartUsingTicketTypeCounter(productSession, true);
      this.trackPosCartItemQuantityChange({
        newCount: previousCount + 1,
        previousCount,
        sessionId: productSession.id,
        source: 'from_scanner',
      });
    } else {
      const errorMessage = this.translate.instant('boxOffice.cart.toastBanner.errorMessage', {
        code: code,
      });
      this.showScannedCodeNotFoundToast(errorMessage);
    }
  }

  handleShowAvailabilityFromDateChange(selectedDateString: string): void {
    const selectedDate = new Date(selectedDateString);
    this.selectedAvailabilityFromDate = selectedDateString;
    this.loadNewSearch(this.filters, selectedDate);
  }

  loadNewSearch(filters: SearchFilter, date?: Date): void {
    this.filters = filters;
    this.date = date;
    this.priceViewerService.clear(this.onsiteSetupSelected);
    this.#changeDetectorRef.markForCheck();

    if (filters?.selectedPlan) {
      const userAttributes = {
        plan_id: filters.selectedPlan.id.toString(),
      };
      if (this.selectedPlan?.id != null && this.selectedPlan.id !== filters.selectedPlan.id) {
        this.#sessionAvailabilityStoredService.clear();
        this.#sessionAvailabilityForDateStoredService.clear();
        this.#datesAvailabilityStoredService.clear();
      }
      const cacheConfig = computeEffectiveCacheConfig({
        planId: filters.selectedPlan.id,
        onsiteSetup: this.onsiteSetupSelected,
      });
      this.useCacheEnabled = cacheConfig.useCacheEnabled;
      this.#useCacheSwrEnabled = cacheConfig.useCacheSwrEnabled;
      this.cacheTimeoutInSeconds = cacheConfig.cacheTimeoutInSeconds;
      this.cashModalMandatory = this.optimizelyService.isFeatureEnabled('obo_cash_modal_mandatory', userAttributes);
      this.daysWithActiveSession = this.#getMaxPurchasableDays();
      this.showPhoneNumberContactInformation = this.#shouldShowPhoneNumber();
      this.showEmailContactInformation = this.#shouldShowEmail();
      this.allowMultiTimeSlotSelection =
        this.isModifyOrderMode() ||
        this.isReservationSettlementActive() ||
        (this.optimizelyService.isFeatureEnabled(FeatureFlags.MULTI_TIME_SLOT_SELECTION, userAttributes) ?? false);
      // Box Office is the page the next-upcoming-session preselection is for (GAME-1552).
      this.preselectNextUpcomingSession = this.resolveNextUpcomingSessionFlag(filters.selectedPlan);
      this.#changeDetectorRef.markForCheck();
    }

    if (this.onsiteSetupSelected && filters) {
      const shouldResetCart =
        !this.isModifyOrderMode() && !this.isReservationSettlementActive() && this.#shouldResetCartForNewSearch(filters, date);

      if (shouldResetCart) {
        this.isPreservingCart = false;
        this.cart = null;
        this.nonConfirmedCart = null;
        this.seatingMapUrl = null;
        this.seatingMapState = null;
        this.#lastSeatingMapLoadContext = null;
        this.seatingToken = null;
        this.seatingHoldTokensBySessionId = new Map();
        this.clearSelectedTickets();
        this.#clearHighlightedSeatsStorage();
        this.#clearCoupon();
        // The cart is going away for a new search — the member's perks belonged to the old one.
        this.clearMembershipsMember();
      }

      this.partner = filters.partner;
      this.selectedCity = filters.selectedCity;
      this.selectedPlan = filters.selectedPlan;
      this.selectedPlace = filters.selectedPlace;
      this.timezone = filters.timezone;
      this.isDefaultFilter = filters.isDefaultFilter;
      this.filtersSelected = Boolean(filters.selectedCity && filters.selectedPlan && filters.selectedPlace);
      const today = new Date();
      this.fromDate = date ? date : new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      this.regularSessionAvailabilitySummaryByDateList = [];
      this.ticketTypes = [];
      this.datesAvailability = [];
      this.selectedSession = null;
      this.isLoadingSessions = true;
      this.resetIncludeOngoing();
      if (this.filtersSelected) {
        this.requestDatesAndSessionsAvailability();
      } else {
        this.getSessionAvailableSubscription?.unsubscribe();
        this.isLoadingSessions = false;
      }
      this.#updatePaymentMethodsAvailable();
      this.#changeDetectorRef.markForCheck();
    }

    this.#updateOboSecondScreenPlace(filters?.selectedPlace?.id);
  }

  protected override loadFreeSeatingMap() {
    this.resetSecondScreenSeatingMapVisibility();
    return super.loadFreeSeatingMap();
  }

  loadOneStepFreeSeatingMap(): void {
    if (!this.manageAsFreeSeatingMap) {
      return;
    }

    if (!this.selectedSession?.selectedDatetime?.sessionAvailabilityList) {
      return;
    }

    const hasActiveSeats = (this.selectedTicketsSeatsBySessionId?.size ?? 0) > 0;
    const currentContext = this.#getCurrentSeatingMapContext();
    const sameContextAsLastLoaded =
      currentContext != null &&
      this.#lastSeatingMapLoadContext != null &&
      this.#lastSeatingMapLoadContext.datetime === currentContext.datetime &&
      this.#lastSeatingMapLoadContext.poolId === currentContext.poolId;

    if (this.seatingMapUrl && hasActiveSeats && sameContextAsLastLoaded) {
      return;
    }
    this.loadFreeSeatingMap()
      .pipe(
        finalize(() => this.#changeDetectorRef.markForCheck()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (error: any) => {
          this.seatingMapUrl = null;
          this.seatingMapState = null;
          this.#lastSeatingMapLoadContext = null;
          this.#clearHighlightedSeatsStorage();
          this.showModalError(error?.error?.message);
        },
        next: (response: BaseResponse<any, any>) => {
          if (response && response.data) {
            this.seatingMapUrl = response.data.url;
            this.seatingMapState = response.data.state;
            this.#lastSeatingMapLoadContext = this.#getCurrentSeatingMapContext();
            this.#syncHighlightedSeatsStorage();
          } else {
            this.seatingMapUrl = null;
            this.seatingMapState = null;
            this.#lastSeatingMapLoadContext = null;
            this.#clearHighlightedSeatsStorage();
          }
        },
      });
  }

  protected clearLastSeatingMapLoadContext(): void {
    this.#lastSeatingMapLoadContext = null;
  }

  /**
   * Recomputes the displayed cart total from the current `nonConfirmedCart`.
   *
   * Subclasses that change the cart contents after `updateSeatsInCart()` has already priced it (the
   * multiplan merge in `OneStopShopComponent`) call this to repair the header — B2BO-8391.
   */
  protected refreshCartTotal(): void {
    if (this.coupon) {
      this.updateCartTotalTrigger$.next();
      this.updateOboSecondScreenCart();
      this.#changeDetectorRef.markForCheck();
      return;
    }
    this.#updateCartTotalImmediate();
  }

  override generateFreeSeatingMap(): void {
    this.#lastSeatingMapLoadContext = null;
    super.generateFreeSeatingMap();
  }

  #getCurrentSeatingMapContext(): { datetime: string; poolId: number } | null {
    const datetime = this.selectedSession?.selectedDatetime?.datetime;
    const poolId = this.selectedSession?.selectedDatetime?.sessionAvailabilityList?.find(s => s.seating != null)?.seating?.poolId;
    if (datetime == null || datetime === '' || poolId == null) {
      return null;
    }
    return { datetime, poolId };
  }

  ngOnDestroy(): void {
    this.setOboSecondScreenSeatingMapFullscreen(false);
    if (this.shouldResetOboSecondScreenToStandBy) {
      this.#oboSecondScreenDataService.resetCart();
    }
    this.#clearHighlightedSeatsStorage();
    this.priceViewerService.clear(this.onsiteSetupSelected);
    super.ngOnDestroy();
  }

  ngOnInit(): void {
    this.#audioService.preload(audioFile.scanError);
    this.priceViewerService.clear(this.onsiteSetupSelected);
    this.oneStepPurchaseService.franceAsyncFiscalFailure$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.paymentInProgress = false;
      this.spinnerService.hide();
      this.clearCart();
    });
    this.#initialiseActiveShiftEvent();
    this.modifiedOrder.set(history.state?.order);
    this.paymentConfigStorageService
      .listenStorage()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#updatePaymentMethodsAvailable();
        this.#changeDetectorRef.markForCheck();
      });
  }

  onReleaseTickets(): void {
    this.isReleaseTicketsSheetOpen.set(false);

    const selectedTickets = this.releaseTicketSeats().filter((_, index) => this.releaseTicketSelections()[index]);

    if (selectedTickets.length === 0) {
      this.#navigateToSuccessPage();
      return;
    }

    const cancellations = this.#buildCancellationsFromTickets(selectedTickets);

    if (cancellations.length === 0) {
      this.#navigateToSuccessPage();
      return;
    }

    this.spinnerService.show();

    this.#seatsManagementService
      .cancelCodesAndReleaseSeats(cancellations, this.#getModifyOrderLinking())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.spinnerService.hide();
          this.showModalError();
        },
        next: () => {
          this.spinnerService.hide();
          this.#navigateToSuccessPage();
        },
      });
  }

  openLateralPayments(): void {
    this.showPaymentsInLateral = true;
    this.paymentType.set(null);
  }

  payWithCardIsDisabled(paymentType: PaymentType): boolean {
    const cardPayments = [
      PaymentType.ALIPAY,
      PaymentType.CARD,
      PaymentType.CARD_SPLIT,
      PaymentType.CREDIT_CARD,
      PaymentType.DEBIT_CARD,
      PaymentType.GRABPAY_SG,
      PaymentType.ID_PAYMENT,
      PaymentType.PAY_NOW,
      PaymentType.PIX,
      PaymentType.QUICPAY,
      PaymentType.SIMPLE_PAYMENTS_KR,
      PaymentType.SQUARE_QR,
      PaymentType.IC_CARD,
      PaymentType.WECHAT_PAY,
    ];

    if (!cardPayments.includes(paymentType)) {
      return false;
    }

    const currentCart = this.nonConfirmedCart;

    if (!currentCart || !currentCart?.total) {
      return true;
    }

    const paymentConfigurationStorage: PaymentConfiguration | undefined = this.paymentConfigStorageService.getConfiguration();
    const cartAmountIsZero: boolean = currentCart?.total?.amount === 0;

    const isDisallowed: boolean = this.paymentService.isCardPaymentDisallowed(
      this.paymentConfiguration,
      paymentConfigurationStorage,
      cartAmountIsZero,
      this.#boxOfficePaymentMethodsService.getGatewayProvider(this.onsiteSetupSelected),
      this.#boxOfficePaymentMethodsService.allowsDelegatedCardPayment(this.onsiteSetupSelected),
    );

    if (!isDisallowed) {
      return false;
    }

    if (cartAmountIsZero) {
      return true;
    }

    return !this.shouldShowDeviceSelector(paymentType, this.onsiteSetupSelected, paymentConfigurationStorage);
  }

  getCardDisabledTooltip(paymentType: PaymentType): string | null {
    if (!this.payWithCardIsDisabled(paymentType)) {
      return null;
    }
    return this.paymentService.getCardDisabledTooltip(
      this.paymentConfigStorageService.getConfiguration(),
      this.#boxOfficePaymentMethodsService.getGatewayProvider(this.onsiteSetupSelected),
      this.#boxOfficePaymentMethodsService.allowsDelegatedCardPayment(this.onsiteSetupSelected),
    );
  }

  protected shouldShowDeviceSelector(
    paymentType: PaymentType | undefined,
    onsiteSetup: OnsiteSetup | null | undefined,
    storedPaymentConfig: PaymentConfiguration | null | undefined,
  ): boolean {
    return this.#boxOfficePaymentMethodsService.requiresDeviceSelection(onsiteSetup, paymentType, storedPaymentConfig);
  }

  removeAppliedDiscount(): void {
    if (this.#isRemovingInheritedSettlementCoupon()) {
      this.#removeInheritedSettlementCoupon();
      return;
    }

    this.#removeAppliedDiscountLocally();
  }

  #removeAppliedDiscountLocally(): void {
    this.#clearCoupon();
    if (this.cart !== null) {
      this.cart.appliedCoupon = null;
      this.#clearCartSessionsWithoutUnits();
    }

    if (this.nonConfirmedCart !== null) {
      this.nonConfirmedCart.appliedCoupon = null;
    }

    this.#syncCartChanges(this.cart);
    this.updateOboSecondScreenCart();
    this.#changeDetectorRef.markForCheck();
  }

  isCouponCombinationUiActive(): boolean {
    return this.couponCombinationEnabled && (this.combinedCoupons.length > 0 || this.coupon != null);
  }

  canAddMoreCoupons(): boolean {
    if (!this.isCouponCombinationUiActive()) {
      return false;
    }
    const subtotal = this.cartTotalMoneyWithoutCoupon?.amount ?? 0;
    const appliedDiscount = this.combinedCoupons.length > 0 ? this.couponCombinationSubtotal : (this.coupon?.discount.amount ?? 0);
    return subtotal - appliedDiscount > 0;
  }

  openAddAdditionalCouponModal(inputCode?: string): void {
    this.couponError.next(null);
    const couponCode$ = new Subject<CouponCodeEvent>();
    const scannedCode$ = new BehaviorSubject<string | null>(null);

    this.#addAdditionalCouponDialogRef = this.#igntDialogService.openModal<CouponCodeModalResult>(CouponCodeModalComponent, {
      data: {
        couponCode$,
        error: this.couponError,
        hasNavigation: false,
        inputCode,
        lazyCouponType: null,
        scannedCode: scannedCode$,
        subtitleKey: 'oneStopShop.couponCodeSelector.subtitle',
        title: this.translate.instant('oneStopShop.couponCodeSelector.title'),
      },
      size: 'sm',
    });

    couponCode$.pipe(takeUntil(this.destroy$)).subscribe(({ code }: CouponCodeEvent) => {
      this.#applyCouponOneStep$(code, null)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (this.couponError.getValue() === null && this.#addAdditionalCouponDialogRef) {
            this.#addAdditionalCouponDialogRef.close();
            this.#addAdditionalCouponDialogRef = null;
          }
        });
    });

    this.#addAdditionalCouponDialogRef.closed$.pipe(take(1), takeUntil(this.destroy$)).subscribe((result: CouponCodeModalResult) => {
      this.#addAdditionalCouponDialogRef = null;
      if (result === 'Open scanner') {
        this.#trackPosCheckoutPromoCodesService.trackOpenManualScanner('additional');
        const scannerRef = this.#igntDialogService.openModal<string>(ScannerComponent, { size: 'sm' });
        scannerRef.closed$.pipe(take(1), takeUntil(this.destroy$)).subscribe((scannedValue: string | undefined) => {
          this.openAddAdditionalCouponModal(scannedValue);
        });
      }
    });
  }

  /**
   * `plan` is a plain field, so this predicate is only reactive through its `partner` leg. Callers
   * that live inside a `computed()` must read `activePlan()` themselves — see the header action menu
   * in `OneStopShopComponent`.
   */
  canIdentifyMember(): boolean {
    return (
      this.userService.hasPermission(Permissions.CAN_MANAGE_MEMBERSHIPS) &&
      !!this.partner?.hasMemberships &&
      this.plan?.id != null &&
      !this.multiPlanCartEnabled
    );
  }

  hasIdentifiedMember(): boolean {
    return this.#memberships.hasIdentifiedMember();
  }

  hasActiveMemberPerks(): boolean {
    return this.#memberships.hasActivePerks();
  }

  identifyMembershipsMember(): void {
    const partnerId = this.partner?.id;
    const planId = this.plan?.id;
    if (!this.canIdentifyMember() || partnerId == null || planId == null) {
      return;
    }

    if (this.#rejectMemberIdentifyForCoupon()) {
      return;
    }

    this.#memberships
      .identify$(partnerId, planId, () => !this.#rejectMemberIdentifyForCoupon())
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.#updateCartTotalImmediate());
  }

  removeMembershipsMember(): void {
    this.#memberships
      .remove$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.#updateCartTotalImmediate());
  }

  /** Drops the member without confirming and without tracking a removal — for state resets. */
  clearMembershipsMember(): void {
    this.#memberships.clear();
  }

  selectPaymentType(paymentType: PaymentType): void {
    this.paymentType.set(paymentType);
    this.trackSelectPaymentMethod(paymentType, 'lateral_menu');
  }

  protected trackSelectPaymentMethod(paymentType: PaymentType, source: PosCheckoutSelectPaymentMethodSource): void {
    const cart = this.cart ?? this.nonConfirmedCart;
    this.#fzTracking.track(
      posCheckoutSelectPaymentMethod(
        buildPosCheckoutSelectPaymentMethodData({
          availablePaymentMethods: this.paymentTypes ?? [],
          cart,
          paymentMethod: paymentType,
          source,
          totalAmount: this.cartTotalMoney?.amount ?? cart?.total?.amount ?? 0,
        }),
      ),
    );
  }

  sessionHasSeating(sessionId: number): boolean {
    const sessions = this.selectedSession?.selectedDatetime?.sessionAvailabilityList ?? [];
    const session = sessions.find(s => s.id === sessionId);
    return session?.seating !== null && session?.seating !== undefined;
  }

  setActiveShift(shift: ActiveShift): void {
    this.activeShift.set(shift);
    this.activeShiftReady = true;
    this.activeShiftOneStepReady$.next();
    if (!this.onsiteSetupSelected) {
      this.activeShiftReady$.next(shift);
    }
  }

  modifiedOrder: WritableSignal<Order | undefined> = signal<Order | undefined>(undefined);

  modifyOrderPaymentCart: WritableSignal<Cart | null> = signal<Cart | null>(null);

  protected override getRescheduleOrderId(): number | undefined {
    if (this.#isUpgradeSeatingMode()) {
      return this.modifiedOrder()?.id;
    }
    if (!this.#isModifyOrderEntry()) {
      return undefined;
    }
    return this.modifiedOrder()?.id ?? this.#getModifiedOrderIdFromUrl();
  }

  #getModifiedOrderIdFromUrl(): number | undefined {
    const urlOrderId = Number(this.#activatedRoute.snapshot.queryParams['modified_order_id']);
    return Number.isFinite(urlOrderId) && urlOrderId > 0 ? urlOrderId : undefined;
  }

  protected override getAvailabilityQueryChannel(): Channel {
    const order = this.modifiedOrder();
    if (this.isModifyOrderMode() && order != null) {
      return this.#getModifyOrderOriginalChannel(order);
    }
    return this.channel;
  }

  protected override getAvailabilityQueryChannelId(): string {
    const order = this.modifiedOrder();
    if (this.isModifyOrderMode() && order != null) {
      return this.#getModifyOrderOriginalChannelId(order);
    }
    return this.channelId;
  }

  protected isModifyOrderFlowAborted(): boolean {
    return false;
  }

  #isModifyOrderEntry(): boolean {
    if (this.isModifyOrderFlowAborted()) {
      return false;
    }
    const params = this.#activatedRoute.snapshot.queryParams;
    return (
      params['mode'] === ModifiedOrderModeEnum.ModifyOrder &&
      params['modified_order_id'] != null &&
      this.isOrderModificationWithOssEnabled()
    );
  }

  showShiftModal(): void {
    const hasCompatibleActiveShift = this.currency === this.activeShift()?.currency;

    if (!this.hasShiftsEnabled || hasCompatibleActiveShift) {
      this.manageAsFreeSeatingMap ? super.generateFreeSeatingMap() : super.addSessionsToCart();
      return;
    }

    if (!this.activeShift()) {
      if (this.onsiteSetupSelected.shift_strategy === ShiftStrategyEnum.mandatory) {
        this.#askUserOpenMandatoryShift()
          .pipe(takeUntil(this.destroy$), filter(Boolean))
          .subscribe(() => (this.manageAsFreeSeatingMap ? super.generateFreeSeatingMap() : super.addSessionsToCart()));
      } else {
        this.#askUserContinueWithoutShift()
          .pipe(takeUntil(this.destroy$), filter(Boolean))
          .subscribe(() => (this.manageAsFreeSeatingMap ? super.generateFreeSeatingMap() : super.addSessionsToCart()));
      }
    } else if (!hasCompatibleActiveShift) {
      this.#askUserCloseCurrentShift().pipe(takeUntil(this.destroy$)).subscribe();
    }
  }

  get ticketTypesForAddonsTab(): TicketType[] {
    return this.ticketTypes.filter(tt => tt.isAddon || (tt.sessionId !== undefined && !this.sessionHasSeating(tt.sessionId)));
  }

  toggleReleaseTicketSelection(index: number): void {
    const selections = [...this.releaseTicketSelections()];
    const isSelecting = !selections[index];
    if (isSelecting && this.releaseTicketsSelectedCount() >= this.releaseTicketsRequiredCount()) {
      return;
    }
    selections[index] = isSelecting;
    this.releaseTicketSelections.set(selections);
  }

  updateCustomer(customer: Customer): void {
    if (!customer || customer.type === CustomerType.ANONYMOUS) {
      this.customer = null;
      return;
    }
    this.customer = customer;
    this.customer.cityStandardId = this.selectedCity.id;
  }

  updateOboSecondScreenCart(): void {
    this.#oboSecondScreenDataService.setCart(this.#buildOboSecondScreenCartToSync());
    const isEmpty = !this.nonConfirmedCart || this.nonConfirmedCart.getNumberOfTicketAndProductCounts() === 0;
    if (isEmpty) {
      this.#clearHighlightedSeatsStorage();
    } else {
      this.#syncHighlightedSeatsStorage();
    }
  }

  /**
   * The copy of the cart the customer screen renders.
   *
   * `upgrade_seating` mode zeroes the seating lines and returns early — no tax is disclosed there.
   * Otherwise the confirmed cart's `taxItems` are overlaid on a clone of `nonConfirmedCart`, which
   * is where the backend-computed tax lives, together with the total already shown on the Pay
   * button. The overlay is gated on the confirmed cart still representing the live selection, so
   * the tax row self-invalidates the moment the cashier edits the cart and comes back once the
   * cart is confirmed again. `nonConfirmedCart` itself is never mutated.
   */
  #buildOboSecondScreenCartToSync(): Cart | null {
    const upgradeSessionTypeIds = new Set(this.#getOptimizelyUpgradeSessionTypeIds());
    if (isUpgradeSeatingMode(this.#activatedRoute.snapshot.queryParams as Record<string, string | undefined>)) {
      return applyUpgradeSeatingPricing(this.nonConfirmedCart, { upgradeSessionTypeIds });
    }
    if (this.nonConfirmedCart === null) {
      return null;
    }
    const cartToSync = this.nonConfirmedCart.clone();
    const confirmedCart = this.cart;
    if (confirmedCart != null && confirmedCart.hasSameContent(this.nonConfirmedCart)) {
      cartToSync.taxItems = confirmedCart.taxItems != null ? [...confirmedCart.taxItems] : undefined;
      cartToSync.total = this.cartTotalMoney ?? cartToSync.total;
    } else {
      cartToSync.taxItems = undefined;
    }
    return cartToSync;
  }

  updateOboSecondScreenPayment() {
    this.#oboSecondScreenDataService.finishPayment();
  }

  updateOboSecondScreenPlan(plan: Plan): void {
    this.#oboSecondScreenDataService.setPlan(plan);
  }

  updateTicketTypeFields(): void {
    this.#updateTicketTypes();
    if (!this.selectedSession) {
      this.rebuildOngoingMultiDayTicketGroups();
      return;
    }
    this.ticketTypes.forEach(ticketType => {
      if (!ticketType.isShopProduct) {
        ticketType.availableTickets = 0;
        ticketType.isHidden = false;
        ticketType.price = null;
        ticketType.partySizeMinimum = 0;
      }
    });
    if (this.selectedSession.selectedDatetime !== null) {
      const timeslotSessions = this.selectedSession.selectedDatetime.sessionAvailabilityList;
      timeslotSessions.forEach(session => {
        const index = this.ticketTypes.findIndex(ticketType => ticketType.sessionId === session.id);
        if (this.ticketTypes[index]) {
          this.ticketTypes[index].availableTickets = session.availableTickets ? session.availableTickets : 0;
          this.ticketTypes[index].isHidden = session.isHidden;
          this.ticketTypes[index].price = session.ticketPrice;
          this.ticketTypes[index].isPurchasable = !this.#isSessionDisabledConsideringOverride(session);
          this.ticketTypes[index].sessionId = session.id;
          this.ticketTypes[index].overrideAvailableTickets = session.overrideAvailableTickets;
          this.ticketTypes[index].maximum = session.getMaximumSelectableTickets(this.canOverrideCapacities);
          this.ticketTypes[index].partySizeMinimum = SessionAvailability.partySizeMinimumForSession(session, timeslotSessions);
        }
      });
      this.ticketTypes = [...this.ticketTypes];
    }
    this.rebuildOngoingMultiDayTicketGroups();
  }

  protected override rebuildOngoingMultiDayTicketGroups(): void {
    super.rebuildOngoingMultiDayTicketGroups();
    this.#applyOverrideCapacityToOngoingTicketGroups();
  }

  protected addProductSessionToCartUsingTicketTypeCounter(productSession: ProductSession, skipPosCartTracking = false): void {
    if (this.isReservationSettlementMode()) {
      return;
    }
    this.#addProductSessionToProductTypesIfNotPresent(productSession);
    this.#addProductSessionToProductSessionAvailabilitiesIfNotPresent(productSession);
    this.updateTicketTypeFields(); // TODO I may only need this if I've had to add the session to the product session availabilities

    const sessionIdStr = productSession.id.toString();
    const currentCountById = this.selectedTicketsBySessionId.get(sessionIdStr) || 0;
    const currentCountByType = this.selectedTicketsBySessionType.get(productSession.title) || 0;
    const newCount = Math.max(currentCountById, currentCountByType) + 1;

    const updatedBySessionId = new Map(this.selectedTicketsBySessionId);
    const updatedBySessionType = new Map(this.selectedTicketsBySessionType);

    updatedBySessionId.set(sessionIdStr, newCount);
    updatedBySessionType.set(productSession.session_type.label, newCount);

    const ticketTypeCounter = {
      bySessionId: updatedBySessionId,
      bySessionType: updatedBySessionType,
    };
    this.newSelectTicketCounter(ticketTypeCounter, true, skipPosCartTracking);
  }

  protected changePlan(): Observable<Plan> {
    return super.changePlan().pipe(
      tap(plan => {
        this.#updatePaymentConfigurationFromOnsiteSetup();
        this.#displaySquareAlertModalIfNeeded();
        this.updateOboSecondScreenPlan(plan);
        if (this.nonConfirmedCart) {
          this.updateOboSecondScreenCart();
        } else {
          this.#oboSecondScreenDataService.resetCart();
        }
        this.setOboSecondScreenSeatingMapFullscreen(false);
        this.#clearHighlightedSeatsStorage();
        this.#changeDetectorRef.markForCheck();
      }),
    );
  }

  protected clearCart() {
    this.removeAppliedDiscount();
    this.clearMembershipsMember();
    super.clearCart();
    this.resetCartPresentation();
  }

  protected createOrUpdateCartResponse(response: BaseResponse<Cart>, hasSeating: boolean): void {
    this.#sendLogConfirmedCart(this.nonConfirmedCart, response.data);
    super.createOrUpdateCartResponse(response, hasSeating);
    this.updateOboSecondScreenCart();
  }

  protected findSessionAndApplySelectionForTimestamp(
    timeStamp: number,
    orderSessionStartsAtRaw?: string | null,
  ): SessionAvailabilitySummaryByDate | undefined {
    const list = this.regularSessionAvailabilitySummaryByDateList ?? [];
    const normalizeInstant = (iso: string): string => new Date(iso).toISOString().replace(/\.\d+Z$/, 'Z');
    const matchesOrderSlot = (availDatetime: string): boolean => {
      const availMs = new Date(availDatetime).getTime();
      if (orderSessionStartsAtRaw && normalizeInstant(availDatetime) === normalizeInstant(orderSessionStartsAtRaw)) {
        return true;
      }
      return timeStamp === availMs;
    };
    for (const session of list) {
      const dateTime = session.sessionAvailabilityByDatetimeList?.find(sa => matchesOrderSlot(sa.datetime));
      if (dateTime) {
        session.selectedDatetime = dateTime;
        return session;
      }
    }
    return undefined;
  }

  protected getCartMixpanelData(): ClickClearAllCartData {
    const cartMixpanelData = super.getCartMixpanelData();
    return {
      ...cartMixpanelData,
      obo_flow_type: this.onsiteSetupSelected?.obo_flow_type,
    };
  }

  protected getProductSessions() {
    return this.sessionAvailabilitySummary?.productSessions ?? [];
  }

  protected goToNextStep(): void {
    if (this.manageAsFreeSeatingMap) {
      super.goToNextStep();
    } else {
      this.priceViewerService.showTotal(this.onsiteSetupSelected, this.cart.total.currency, this.cart.total.amount);
      if (this.currentStep.nextStep) {
        if (this.#canGoToCheckout()) {
          this.goToCheckout();
        } else {
          this.currentStep = this.currentStep.nextStep;
        }
      }
    }
    this.#changeDetectorRef.markForCheck();
  }

  protected newSelectTicketCounter(
    ticketTypeCounter: { bySessionId: Map<string, number>; bySessionType: Map<string, number> },
    modifiedSessionIsShopProduct: boolean = false,
    skipPosCartTracking = false,
  ): void {
    if (!skipPosCartTracking) {
      for (const [sessionIdStr, newCount] of ticketTypeCounter.bySessionId.entries()) {
        const previousCount = this.selectedTicketsBySessionId.get(sessionIdStr) ?? 0;
        if (newCount !== previousCount) {
          this.trackPosCartItemQuantityChange({ newCount, previousCount, sessionId: sessionIdStr, source: 'from_tile' });
        }
      }

      for (const [sessionIdStr, previousCount] of this.selectedTicketsBySessionId.entries()) {
        if (previousCount > 0 && !ticketTypeCounter.bySessionId.has(sessionIdStr)) {
          this.trackPosCartItemQuantityChange({ newCount: 0, previousCount, sessionId: sessionIdStr, source: 'from_tile' });
        }
      }
    }

    if (!modifiedSessionIsShopProduct) {
      const { preservedCustomTabsBySessionId, preservedCustomTabsBySessionType } = this.#preserveCustomTabsBySessionId(ticketTypeCounter);
      this.updateTicketTypeFields();
      this.#combinedPreservedCustomTabsBySessionId(ticketTypeCounter, preservedCustomTabsBySessionId, preservedCustomTabsBySessionType);
    } else {
      this.updateTicketTypeFields();
    }

    this.selectedTicketsBySessionType = ticketTypeCounter.bySessionType;
    this.selectedTicketsBySessionId = ticketTypeCounter.bySessionId;

    this.updateNonConfirmedCart();
    this.updateCapacityLimit();

    this.#changeDetectorRef.detectChanges();

    this.#checkCartSessionsIsAboutToExpire();
    if (this.coupon) {
      this.updateCartTotalTrigger$.next();
    } else {
      this.#updateCartTotalImmediate();
    }
  }

  protected discardCartAfterPaymentError(): void {
    if (this.isReservationSettlementMode()) {
      this.releaseReservationSettlementCartLocally();
      this.showModal('boxOffice.cart.reservationSettlementAfterError.title', 'boxOffice.cart.reservationSettlementAfterError.message');
      return;
    }

    const query: DiscardCartQuery = {
      partnerId: this.partner.id,
      cartId: this.cart!.id!,
    };

    this.cartService
      .discardCart(query)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((response: BaseResponse<boolean | null>) => {
        if (response.data && !response.error) {
          this.cart = null;
          this.nonConfirmedCart = null;
        }
        this.showModal('boxOffice.cart.discardedAfterError.title', 'boxOffice.cart.discardedAfterError.message');
      });
  }

  protected ossUpdateSessionAvailabilitySummary(): void {
    this.sessionAvailabilitySummary = new SessionAvailabilitySummary(
      this.timezone,
      this.allowMultiSessionPurchase,
      this.hasExplodePipe,
      this.selectedSession && this.selectedSession instanceof RegularSessionAvailabilitySummaryByDate
        ? [this.selectedSession]
        : this.regularSessionAvailabilitySummaryByDateList,
      this.nextAvailableDate,
      this.sessionSelectorType,
      this.productSessions,
    );
  }

  protected releaseReservationSettlementCartLocally(): void {
    this.clearSelectedTicketsReferences();
    this.seatingHoldTokensBySessionId = new Map();
    this.nonConfirmedCart = null;
    this.seatingToken = null;
    this.cart = null;
    this.cartDetailService?.clearCart();
    this.clearReservationSettlementSession();
    this.clearReservationSettlementParams();
    this.removeAppliedDiscount();
  }

  protected clearReservationSettlementParams(): void {
    this.router.navigate([], {
      queryParams: { mode: null, reservation_cart_id: null, reservation_id: null },
      queryParamsHandling: 'merge',
      relativeTo: this.#activatedRoute,
      replaceUrl: true,
    });
  }

  protected resetCartPresentation(): void {
    this.#oboSecondScreenDataService.resetCart();
    this.#clearHighlightedSeatsStorage();
    this.#changeDetectorRef.markForCheck();
    this.updateCapacityLimit();
  }

  protected trackPosCartItemQuantityChange(opts: {
    newCount: number;
    previousCount: number;
    sessionId: number | string;
    source: PosCartSource;
  }): void {
    this.#trackPosCartItemQuantityChangeService.track({
      newCount: opts.newCount,
      planId: this.selectedPlan?.id ?? 0,
      previousCount: opts.previousCount,
      productTypes: this.productTypes,
      sessionId: opts.sessionId,
      source: opts.source,
      ticketTypes: this.ticketTypes,
    });
  }

  protected restoreToBeginning(): void {
    this.#lastSeatingMapLoadContext = null;
    super.restoreToBeginning();
    this.updateOboSecondScreenCart();
  }

  protected resetSecondScreenSeatingMapVisibility(): void {
    this.setOboSecondScreenSeatingMapFullscreen(false);
  }

  protected selectDefaultSessionForAdvancedFlow(): void {
    const hasOnlyShopProductsSelected = this.#selectedTicketsContainOnlyShopProducts();
    const hasAvailableSessions = this.regularSessionAvailabilitySummaryByDateList.length > 0;

    if (hasOnlyShopProductsSelected && !this.selectedSession && hasAvailableSessions) {
      const list = this.regularSessionAvailabilitySummaryByDateList;
      const firstAvailableSession =
        this.selectedDateAvailability?.date != null ? (list.find(s => s.date === this.selectedDateAvailability.date) ?? list[0]) : list[0];
      this.selectedSession = firstAvailableSession;

      if (firstAvailableSession.sessionAvailabilityByDatetimeList.length > 0) {
        this.selectedSession.selectedDatetime = firstAvailableSession.sessionAvailabilityByDatetimeList[0];
      }

      return;
    }

    super.selectDefaultSessionForAdvancedFlow();
  }

  protected sendLoadTicketingEvent(hasResult: boolean): void {
    const ticketingData: LoadTicketingData = {
      ...this.getLoadTicketingData(hasResult),
      obo_flow_type: this.onsiteSetupSelected?.obo_flow_type,
    };
    this.trackingService.track(new LoadBoxOfficeEvent(ticketingData));
    this.#changeDetectorRef.markForCheck();
  }

  protected setOboSecondScreenSeatingMapFullscreen(isFullscreen: boolean): void {
    this.#oboSecondScreenDataService.setIsSeatingMapVisible(isFullscreen);
  }

  protected showScannedCodeNotFoundToast(message: string): void {
    this.#toastService.add({
      autoHide: true,
      contrast: true,
      delay: 3000,
      message,
      sentiment: AlertSentiment.danger,
    });
    this.#audioService.play(audioFile.scanError);
  }

  protected syncHighlightedSeatsStorageForSecondScreen(): void {
    this.#syncHighlightedSeatsStorage();
  }

  protected updateCapacityLimit(): void {
    const selectedDatetime = this.selectedSession?.selectedDatetime;
    const maxCapacity = selectedDatetime?.capacity;
    if (!this.includeTimeSlotCapacity || maxCapacity == null) {
      this.forceDisableIncreaseCounter = false;
      this.disableAddSessionsToCartByCapacity = false;
      this.isInOverrideZone = false;
      this.#changeDetectorRef.markForCheck();
      return;
    }

    let effectiveCapacity = maxCapacity;
    if (this.canOverrideCapacities && selectedDatetime?.overrideCapacity != null) {
      effectiveCapacity = maxCapacity + selectedDatetime.overrideCapacity;
    }

    const currentCart = this.nonConfirmedCart ?? this.cart;
    const numberOfTicketsCountingTowardCapacity = currentCart?.getNumberOfTicketCounts?.(false) ?? 0;
    const hasNormalTickets = numberOfTicketsCountingTowardCapacity > 0;
    this.forceDisableIncreaseCounter = hasNormalTickets && numberOfTicketsCountingTowardCapacity >= effectiveCapacity;
    this.disableAddSessionsToCartByCapacity = hasNormalTickets && numberOfTicketsCountingTowardCapacity > effectiveCapacity;
    this.isInOverrideZone = this.#shouldSendOverrideCapacity();
    this.#changeDetectorRef.markForCheck();
  }

  #shouldSendOverrideCapacity(): boolean {
    const selectedDatetime = this.selectedSession?.selectedDatetime;
    const baseCapacity = selectedDatetime?.capacity;
    const overrideCapacity = selectedDatetime?.overrideCapacity;
    const currentCart = this.nonConfirmedCart ?? this.cart;
    const numberOfTicketsCountingTowardCapacity = currentCart?.getNumberOfTicketCounts?.(false) ?? 0;

    return (
      this.canOverrideCapacities &&
      this.includeTimeSlotCapacity &&
      baseCapacity != null &&
      overrideCapacity != null &&
      overrideCapacity > 0 &&
      numberOfTicketsCountingTowardCapacity > baseCapacity
    );
  }

  protected updateNonConfirmedCart(): void {
    super.updateNonConfirmedCart();

    this.updateOboSecondScreenCart();
    this.#changeDetectorRef.markForCheck();
  }

  #refreshCouponCombinationAggregates(cart: Cart | null = this.nonConfirmedCart ?? this.cart): void {
    if (this.combinedCoupons.length === 0) {
      this.couponCombinationSubtotal = 0;
      this.couponRemainingBalance = null;
      this.effectiveCombinedCoupon = null;
      return;
    }
    const sum = this.combinedCoupons.reduce((acc, coupon) => acc + (coupon.discount?.amount ?? 0), 0);
    const currency = this.combinedCoupons[0].discount?.currency ?? this.cartTotalMoney?.currency ?? '';
    cart?.calculateTotal();
    const subtotal = cart?.totalWithoutDiscount?.amount ?? 0;
    const effectiveAmount = Math.min(sum, subtotal);
    const remaining = Math.max(0, sum - subtotal);

    this.couponCombinationSubtotal = sum;
    this.couponRemainingBalance = remaining > 0 ? new Money(remaining, currency) : null;

    const code = this.combinedCoupons.length > 1 ? 'oneStopShop.cart.combinedCoupons' : this.combinedCoupons[0].code;
    this.effectiveCombinedCoupon = {
      code,
      creationPurpose: this.combinedCoupons[0].creationPurpose ?? 'gift_card',
      discount: new Money(effectiveAmount, currency),
    };
  }

  #addCoupon(cart: Cart | null, coupon: Coupon): void {
    if (cart !== null) {
      cart.appliedCoupon = coupon;
    }
    if (this.nonConfirmedCart !== null) {
      this.nonConfirmedCart.appliedCoupon = coupon;
    }
    this.#syncCartChanges(cart, coupon);
  }

  #addProductSessionToProductSessionAvailabilitiesIfNotPresent(productSession: ProductSession): void {
    if (!this.productSessions.some(session => session.id === productSession.id)) {
      const sessionAvailability = this.#convertProductSessionToSessionAvailability(productSession);
      this.productSessions.push(sessionAvailability);
    }
  }

  #addProductSessionToProductTypesIfNotPresent(productSession: ProductSession): void {
    if (this.productTypes.some(productType => productType.sessionId === productSession.id)) {
      return;
    }

    this.productTypes.push(
      new TicketType(
        productSession.title,
        productSession.session_type.id,
        productSession.tickets_allowed_per_booking.minimum || 1,
        productSession.tickets_allowed_per_booking.maximum || 10,
        productSession.sellable,
        productSession.is_hidden,
        productSession.available_tickets,
        productSession.price,
        productSession.surcharge_per_ticket,
        productSession.id,
        undefined,
        undefined,
        false,
        undefined,
        true,
      ),
    );
  }

  #addSessionsTypesToNonConfirmedCart() {
    if (this.selectedSession) {
      const allSessions = this.#getAllSessions();
      this.nonConfirmedCart.sessionItemsByDatetime.forEach(cartSessions => {
        cartSessions.forEach(cartSession => {
          const session = allSessions.find(a => a.id === cartSession.sessionId);
          if (session) {
            cartSession.sessionType = session.sessionType;
          }
        });
      });
    }
  }

  #allCouponCodesApplied(couponCodes: string[]): boolean {
    const appliedCodes =
      this.combinedCoupons.length > 0
        ? this.combinedCoupons.map((coupon: Coupon) => coupon.code)
        : this.coupon != null
          ? [this.coupon.code]
          : [];
    return couponCodes.every(code => appliedCodes.includes(code));
  }

  #applyCouponToCart(coupon: Coupon, code: string, lazyCouponType: string | null, shouldScrollToCartDetails: boolean): void {
    this.#trackPosCheckoutPromoCodesService.trackApplyResult(code, lazyCouponType, true);
    this.coupon = coupon;
    this.couponCodeApplied.next(true);
    this.showCouponOneStep = false;
    this.#addCoupon(this.cart, coupon);
    this.#addSessionsTypesToNonConfirmedCart();
    this.updateOboSecondScreenCart();
    this.#printTotal(this.onsiteSetupSelected, this.cartTotalMoney);

    if (shouldScrollToCartDetails) {
      setTimeout(() => {
        const container = document.querySelector('.aside__detail-content') as HTMLElement;
        if (container !== null) {
          container.scrollTo({ behavior: 'smooth', top: container.scrollHeight });
        }
      }, 100);
    }
  }

  #rejectCouponEntryForMemberPerks(): boolean {
    if (!this.hasActiveMemberPerks()) {
      return false;
    }

    this.#setPromoCodeApplyError(new Error('oneStopShop.couponCodeSelector.memberPerksActive'));
    this.couponCodeApplied.next(false);
    return true;
  }

  #rejectMemberIdentifyForCoupon(): boolean {
    if (this.coupon == null && this.combinedCoupons.length === 0) {
      return false;
    }

    this.#toastService.addError(this.translate.instant('boxOffice.memberships.identifyMember.blockedByCoupon'));
    return true;
  }

  #setPromoCodeApplyError(error: Error): void {
    this.couponError.next(error);
    this.#hadCouponApplyErrorInModal = true;
  }

  #applyCouponOneStep$(code: string, lazyCouponType: string | null): Observable<void> {
    if (this.#rejectCouponEntryForMemberPerks()) {
      return EMPTY;
    }

    this.couponError.next(null);
    this.#hadCouponApplyErrorInModal = false;
    return this.createOrUpdateCart().pipe(
      mergeMap(response => this.checkResponseData(response)),
      takeUntil(this.destroy$),
      mergeMap(response => {
        const cartData = response.data;
        this.cart = cartData;
        this.cart.hasSeating = cartData.hasSeating;
        if (cartData.id == null) {
          return EMPTY;
        }
        return this.cartService
          .getCouponForCart({
            cartId: cartData.id,
            couponCode: code,
            lazyCouponType,
            partnerId: this.partner.id,
          })
          .pipe(
            tap(couponResponse => {
              if (couponResponse.data) {
                if (this.#rejectCouponEntryForMemberPerks()) {
                  this.#trackPosCheckoutPromoCodesService.trackApplyResult(code, lazyCouponType, false, this.couponError.getValue());
                  return;
                }

                const newCoupon = couponResponse.data;
                const combinationStack = this.combinedCoupons.length > 0 ? this.combinedCoupons : this.coupon != null ? [this.coupon] : [];

                if (this.couponCombinationEnabled) {
                  const isDuplicate = combinationStack.some((stackedCoupon: Coupon) => stackedCoupon.code === newCoupon.code);
                  if (isDuplicate) {
                    this.#setPromoCodeApplyError(new Error('oneStopShop.couponCodeSelector.duplicateCouponError'));
                    this.couponCodeApplied.next(false);
                    this.#trackPosCheckoutPromoCodesService.trackApplyResult(code, lazyCouponType, false, this.couponError.getValue());
                    return;
                  }
                  if (combinationStack.length > 0 && newCoupon.creationPurpose !== combinationStack[0].creationPurpose) {
                    this.#setPromoCodeApplyError(new Error('oneStopShop.couponCodeSelector.couponsNotCompatible'));
                    this.couponCodeApplied.next(false);
                    this.#trackPosCheckoutPromoCodesService.trackApplyResult(code, lazyCouponType, false, this.couponError.getValue());
                    return;
                  }
                  this.combinedCoupons = [...combinationStack, newCoupon];
                  this.#refreshCouponCombinationAggregates(this.cart);
                  if (this.effectiveCombinedCoupon === null) {
                    this.couponCodeApplied.next(false);
                    this.#trackPosCheckoutPromoCodesService.trackApplyResult(code, lazyCouponType, false);
                    return;
                  }
                  this.#applyCouponToCart(this.effectiveCombinedCoupon, code, lazyCouponType, false);
                  return;
                }

                this.#applyCouponToCart(newCoupon, code, lazyCouponType, true);
              } else if (couponResponse.error) {
                this.#setPromoCodeApplyError(couponResponse.error);
                this.couponCodeApplied.next(false);
                this.#trackPosCheckoutPromoCodesService.trackApplyResult(code, lazyCouponType, false, couponResponse.error);
              }
            }),
            finalize(() => this.#changeDetectorRef.markForCheck()),
            map((): undefined => void 0),
          );
      }),
      catchError(error => {
        this.errorModalService.open(error);
        return EMPTY;
      }),
      finalize(() => {
        this.isLoadingCart = false;
        this.#changeDetectorRef.markForCheck();
      }),
      map((): undefined => void 0),
    );
  }

  #askUserCloseCurrentShift(): Observable<boolean> {
    return this.#openShiftConfirmationModal('boxOffice.notCompatibleShiftModal').pipe(
      map(value => {
        if (value) {
          this.#emitShiftAction(ShiftsActionsEnum.end);
        }
        return !value;
      }),
    );
  }

  #askUserContinueWithoutShift(): Observable<boolean> {
    this.#fzTracking.track(posCheckoutShiftShowModal({ shiftType: 'optional' }));

    return this.#openShiftConfirmationModal('boxOffice.noShiftStartedModal').pipe(
      map(value => {
        this.#fzTracking.track(posCheckoutShiftCloseModal({ shiftType: 'optional' }));
        if (value) {
          this.#emitShiftAction(ShiftsActionsEnum.start);
        }
        return !value;
      }),
    );
  }

  #askUserOpenMandatoryShift(): Observable<boolean> {
    this.#fzTracking.track(posCheckoutShiftShowModal({ shiftType: 'required' }));

    return this.#openShiftConfirmationModal('boxOffice.shiftStartedMandatoryModal').pipe(
      map(value => {
        if (value) {
          this.#fzTracking.track(posCheckoutShiftCloseModal({ shiftType: 'required' }));
          this.#emitShiftAction(ShiftsActionsEnum.start);
        }
        return value;
      }),
    );
  }

  #buildCancellationsFromTickets(tickets: AccessTicket[]): SeatCancellationItem[] {
    return tickets
      .filter(ticket => ticket.seatId != null)
      .map(ticket => ({
        code_id: parseInt(ticket.id, 10),
        seat_id: ticket.seatId!,
      }));
  }

  #canGoToCheckout(): boolean {
    return false;
  }

  #canSkipContactInformation(): boolean {
    if (!this.cart?.hasSessionsInFuture) {
      return this.onsiteSetupSelected?.contact_information_setup?.requirement_on_current_day === ContactInformationRequirementEnum.DISABLED;
    }

    return false;
  }

  #cartIsNotEmptyAndContainsOnlyShopProducts(cart: Cart | null): boolean {
    if (!cart?.sessionItemsByDatetime) {
      return false;
    }

    const allSessions: CartSession[] = [];
    cart.sessionItemsByDatetime.forEach(sessions => {
      allSessions.push(...sessions);
    });

    if (allSessions.length === 0) {
      return false;
    }

    return allSessions.every(session => session.sessionType?.isShopProduct === true);
  }

  #checkCartSessionsIsAboutToExpire(): void {
    if (this.nonConfirmedCart === null || this.isReservationSettlementMode()) {
      return;
    }
    const allSessionsAvailability: SessionAvailability[] = this.#getAllSessionsAvailability();
    const allSessionsIds: number[] = this.#getAllSessionsIds(this.nonConfirmedCart);
    const isSomeSessionAboutToExpire: boolean = allSessionsIds.some(sessionId => {
      const sessionAvailability: SessionAvailability | undefined = allSessionsAvailability.find(
        (availability: SessionAvailability) => availability.id === sessionId,
      );
      return sessionAvailability?.purchasableUntilDate && this.#isSessionDisabledConsideringOverride(sessionAvailability);
    });
    if (isSomeSessionAboutToExpire) {
      this.#clearCounters();
      this.clearCart();
      this.updateTicketTypeFields();
      this.showModal('common.errorTitle', 'boxOffice.ticketExpireSoon', 'ticketExpireSoon');
    }
  }

  #checkCartSessionsIsAboutToExpireObservable(): Observable<void> {
    if (this.nonConfirmedCart === null) {
      return EMPTY;
    }
    if (this.isReservationSettlementMode()) {
      return of(void 0);
    }
    const allSessionsAvailability: SessionAvailability[] = this.#getAllSessionsAvailability();
    const allSessionsIds: number[] = this.#getAllSessionsIds(this.nonConfirmedCart);
    const isSomeSessionAboutToExpire: boolean = allSessionsIds.some(sessionId => {
      const sessionAvailability: SessionAvailability | undefined = allSessionsAvailability.find(
        (availability: SessionAvailability) => availability.id === sessionId,
      );
      return sessionAvailability?.purchasableUntilDate && this.#isSessionDisabledConsideringOverride(sessionAvailability);
    });
    if (isSomeSessionAboutToExpire) {
      this.#clearCounters();
      this.clearCart();
      this.updateTicketTypeFields();
      return throwError(() => new Error('boxOffice.ticketExpireSoon'));
    }
    return of(void 0);
  }

  #checkExistingActiveShift() {
    const requestShiftEvent = new CustomEvent(OSS_SHIFT_REQUEST_EVENT_KEY);
    window.dispatchEvent(requestShiftEvent);
  }

  #isSessionDisabledConsideringOverride(sessionAvailability?: SessionAvailability): boolean {
    return sessionAvailability?.isDisabled(this.canOverrideCapacities) ?? true;
  }

  #applyOverrideCapacityToOngoingTicketGroups(): void {
    if (!this.canOverrideCapacities) {
      return;
    }
    const ongoingSessionsById = new Map<number, SessionAvailability>();
    for (const bucket of this.getOngoingMultiDayBuckets()) {
      for (const slot of bucket.sessionAvailabilityByDatetimeList) {
        for (const session of slot.sessionAvailabilityList) {
          ongoingSessionsById.set(session.id, session);
        }
      }
    }
    for (const group of this.ongoingMultiDayTicketGroups) {
      for (const ticketType of group.ticketTypes) {
        const session = ticketType.sessionId === undefined ? undefined : ongoingSessionsById.get(ticketType.sessionId);
        if (!session) {
          continue;
        }
        ticketType.isPurchasable = !this.#isSessionDisabledConsideringOverride(session);
        ticketType.overrideAvailableTickets = session.overrideAvailableTickets;
        ticketType.maximum = session.getMaximumSelectableTickets(this.canOverrideCapacities);
      }
    }
  }

  #clearCartSessionsWithoutUnits(): void {
    if (!this.cart?.sessionItemsByDatetime) {
      return;
    }

    const hasItemsWithUnits = Array.from(this.cart.sessionItemsByDatetime.values()).some(sessions =>
      sessions.some(session => session.units > 0),
    );

    if (!hasItemsWithUnits) {
      this.cart.sessionItemsByDatetime = null;
    }
  }

  #clearCounters() {
    const emptyValues: Array<[string, number]> = Array.from(this.selectedTicketsBySessionType.keys()).map(key => [key, 0]);
    this.selectedTicketsBySessionType = new Map(emptyValues);
  }

  #clearCoupon(): void {
    this.#clearCouponCombinationState();
    this.coupon = null;
    this.couponError.next(null);
    this.couponCodeApplied.next(false);
    this.showCouponOneStep = this.optimizelyService.isFeatureEnabled('coupons_in_one_step');
  }

  #clearCouponCombinationState(): void {
    this.#contactInformationCollectedForCoupon = false;
    this.combinedCoupons = [];
    this.couponCombinationSubtotal = 0;
    this.couponRemainingBalance = null;
    this.effectiveCombinedCoupon = null;
  }

  #clearHighlightedSeatsStorage(): void {
    this.#secondScreenSeatingMapStorageService.removeSecondScreenSeatingMapStorage();
  }

  #combinedPreservedCustomTabsBySessionId(
    ticketTypeCounter: {
      bySessionId: Map<string, number>;
      bySessionType: Map<string, number>;
    },
    preservedCustomTabsBySessionId: Map<string, number>,
    preservedCustomTabsBySessionType: Map<string, number>,
  ) {
    const combinedSelectionsBySessionType = new Map(ticketTypeCounter.bySessionType);
    const combinedSelectionsBySessionId = new Map(ticketTypeCounter.bySessionId);
    preservedCustomTabsBySessionId.forEach((units, sessionId) => {
      if (units > 0) {
        combinedSelectionsBySessionId.set(sessionId, units);
      }
    });
    preservedCustomTabsBySessionType.forEach((units, sessionType) => {
      if (units > 0) {
        combinedSelectionsBySessionType.set(sessionType, units);
      }
    });

    ticketTypeCounter.bySessionId = combinedSelectionsBySessionId;
    ticketTypeCounter.bySessionType = combinedSelectionsBySessionType;
  }

  #convertProductSessionToSessionAvailability(productSession: ProductSession): SessionAvailability {
    const sessionType = new SessionType(
      productSession.session_type.id,
      productSession.session_type.label,
      false, // isPass
      false, // isAddOn
      undefined, // reservationRestriction
      undefined, // ticketReceiptLabel
      false, // ignoreTimeSlotCapacity
      productSession.tickets_allowed_per_booking.minimum,
      productSession.tickets_allowed_per_booking.maximum,
      true, // isShopProduct
    );

    return new SessionAvailability(
      productSession.id,
      productSession.title,
      productSession.start_date,
      productSession.end_date,
      productSession.price,
      productSession.sellable,
      productSession.available_tickets,
      productSession.tickets_allowed_per_booking.minimum,
      productSession.tickets_allowed_per_booking.maximum,
      productSession.start_date, // purchasableFromDate
      productSession.purchasable_until_date,
      productSession.is_hidden,
      productSession.surcharge_per_ticket,
      null, // seating
      [], // bookingQuestions
      undefined, // minutesBeforeToExpire
      sessionType,
      undefined, // details
      productSession.main_plan_id,
      undefined, // strikethroughPrice
      this.selectedPlace?.id,
    );
  }

  #countCartUnits(cart: Cart | null): number {
    if (!cart?.sessionItemsByDatetime) return 0;
    return Array.from(cart.sessionItemsByDatetime.values())
      .flat()
      .reduce((total, session) => total + (session.units ?? 0), 0);
  }

  #displaySquareAlertModal(): void {
    const [title, message] =
      this.paymentConfiguration !== null && this.paymentConfiguration.squareConfiguration !== undefined
        ? ['square.notCompatiblePlanModal.title', 'square.notCompatiblePlanModal.message']
        : ['square.notEnabledPlanModal.title', 'square.notEnabledPlanModal.message'];
    this.showModal(title, message);
  }

  #displaySquareAlertModalIfNeeded(): void {
    const storedPaymentConfiguration: PaymentConfiguration | undefined = this.paymentConfigStorageService.getConfiguration();
    const isApplicable: boolean = storedPaymentConfiguration?.isConfigApplicable() === true;
    if (storedPaymentConfiguration?.squareConfiguration != null && !isApplicable) {
      this.#displaySquareAlertModal();
    }
  }

  #clearStoredPaymentConfigIfStale(): void {
    const stored = this.paymentConfigStorageService.getConfiguration();
    if (!stored) {
      return;
    }
    const gateway = this.#boxOfficePaymentMethodsService.getGatewayProvider(this.onsiteSetupSelected);
    if (gateway === 'undefined') {
      return;
    }
    const storedProvider = stored.adyenConfiguration
      ? 'adyen'
      : stored.squareConfiguration
        ? 'square'
        : stored.razorpayConfiguration
          ? 'razorpay'
          : stored.payhereConfiguration
            ? 'payhere'
            : null;
    if (storedProvider === null) {
      return;
    }
    if (storedProvider !== gateway) {
      this.paymentConfigStorageService.removeConfiguration();
      return;
    }
    if (
      storedProvider !== 'square' &&
      stored.deviceId != null &&
      !this.#boxOfficePaymentMethodsService.getGatewayTerminalIds(this.onsiteSetupSelected).includes(stored.deviceId)
    ) {
      this.paymentConfigStorageService.removeConfiguration();
    }
  }

  #updatePaymentConfigurationFromOnsiteSetup(): void {
    this.#clearStoredPaymentConfigIfStale();
    const storedDeviceId: string | undefined = this.paymentConfigStorageService.getConfiguration()?.deviceId;
    this.paymentConfiguration = this.#boxOfficePaymentMethodsService.buildPaymentConfiguration(this.onsiteSetupSelected, storedDeviceId);
  }

  // The backend keeps a cart bound to the user of its first prepare attempt, so preparing again with a
  // corrected email would still validate user-restricted coupons against the first user (B2BO-5389).
  // Emits true to continue the flow, false when the recreated cart could not take the applied coupons back.
  #discardAndRecreateCartIfCustomerChanged$(): Observable<boolean> {
    const cartId = this.cart?.id ?? null;
    const attempt = this.#lastCartPrepareAttempt;
    const customerEmail = this.customer?.email ?? null;
    if (cartId === null || attempt === null || attempt.cartId !== cartId || attempt.customerEmail === customerEmail) {
      return of(true);
    }
    if (this.isReservationSettlementMode()) {
      this.#lastCartPrepareAttempt = null;
      return of(true);
    }
    this.datadogService.logWarn('[OSS-CART] Customer changed after a prepare attempt, discarding cart and recreating', {
      cartId,
      partnerId: this.partner?.id,
    });
    this.#lastCartPrepareAttempt = null;
    this.cart = null;
    return this.cartService.discardCart({ cartId, partnerId: this.partner.id }).pipe(
      catchError(() => of(null)),
      switchMap(() => this.#recreateCartWithAppliedCoupons$()),
    );
  }

  #emitShiftAction(shiftAction: string): void {
    const ossShiftActionEvent = new CustomEvent(OSS_SHIFT_ACTION_EVENT_KEY, {
      detail: { shiftAction },
    });
    window.dispatchEvent(ossShiftActionEvent);
  }

  #extractCustomTabsSelections() {
    const customTabSelectionsBySessionId = new Map<string, number>();
    const customTabSelectionsBySessionType = new Map<string, number>();

    this.selectedTicketsBySessionId.forEach((units, sessionId) => {
      const sessionIdNum = parseInt(sessionId);
      const isCustomTabProduct = this.productTypes.some(pt => pt.sessionId === sessionIdNum && pt.isShopProduct === true);
      if (isCustomTabProduct && units > 0) {
        customTabSelectionsBySessionId.set(sessionId, units);
      }
    });

    this.selectedTicketsBySessionType.forEach((units, sessionType) => {
      const isCustomTabProduct = this.productTypes.some(pt => pt.name === sessionType && pt.isShopProduct === true);
      if (isCustomTabProduct && units > 0) {
        customTabSelectionsBySessionType.set(sessionType, units);
      }
    });

    return { customTabSelectionsBySessionId, customTabSelectionsBySessionType };
  }

  #formatBackendError(errorMessage?: string, errorCode?: string | number): FormattedError {
    const code = Number(errorCode);

    switch (code) {
      case allowedTicketsErrorCode:
        return this.#formatTicketRequirementsError905(errorMessage);
      default:
        return { message: errorMessage ?? 'errors.generic', title: 'common.errorTitle' };
    }
  }

  /**
   * @param error
   * Returns "errorTitle,errorMessage,errorCode" The chunk errorCode is optional
   */
  #formatErrorMessage(error: string): string {
    const chunks = error.split(',');
    if (chunks.length < 2) {
      return 'common.errorTitle,errors.generic';
    } else if (chunks.length <= 3) {
      return error;
    } else {
      return chunks.slice(0, 3).join(',');
    }
  }

  #formatTicketRequirementsError905(errorMessage?: string): FormattedError {
    if (!errorMessage) {
      return genericTicketRequirementsError;
    }

    const parsedError = this.#parseTicketRequirementsFromError(errorMessage);
    if (!parsedError) {
      return genericTicketRequirementsError;
    }

    const sessionName = this.#getSessionNameById(parsedError.sessionId) || this.translate.instant('common.session');

    const message = this.translate.instant('oneStopShop.errors.ticketRequirements.message', {
      max: parsedError.max,
      min: parsedError.min,
      sessionName,
    });

    return {
      message,
      title: 'oneStopShop.errors.ticketRequirements.title',
    };
  }

  #generatePayOneStepQueryParams(): PayOneStepQuery {
    const memberCouponCode = this.#getEffectiveMemberCouponCode();
    const inCombinationMode = memberCouponCode === null && this.couponCombinationEnabled && this.combinedCoupons.length > 0;
    const couponCode = memberCouponCode ?? (inCombinationMode ? this.combinedCoupons[0].code : (this.coupon?.code ?? null));
    const additionalGiftCardCodes =
      inCombinationMode && this.combinedCoupons.length > 1 ? this.combinedCoupons.slice(1).map(coupon => coupon.code) : undefined;
    return {
      cartId: this.cart.id,
      channel: this.channelId,
      checkoutFlow: this.#isCheckoutModalFlow ? 'modal' : 'legacy',
      cityId: this.selectedCity.id,
      couponCode,
      customer: this.customer,
      onsiteSetupId: this.onsiteSetupSelected?.id,
      partnerId: this.partner.id,
      paymentConfiguration: this.paymentConfiguration,
      paymentType: this.paymentType(),
      placeId: this.#getCheckoutPlaceId(),
      planId: this.plan.id,
      ...(additionalGiftCardCodes && { additionalGiftCardCodes }),
      ...(this.#shouldSendOverrideCapacity() && { overrideCapacity: true }),
    };
  }

  #getCheckoutPlaceId(): number {
    return this.onsiteSetupSelected?.place?.id ?? this.onsiteSetupSelected?.place_id ?? this.plan.places[0].id;
  }

  #getAllSessions(): SessionAvailability[] {
    return [
      ...this.productSessions,
      ...(this.selectedSession?.sessionAvailabilityByDatetimeList?.flatMap(datetime => datetime.sessionAvailabilityList) ?? []),
    ];
  }

  #getAllSessionsAvailability() {
    const sessionAvailabilityByDateTime = flatArray(
      [...this.regularSessionAvailabilitySummaryByDateList].map(availability => availability.sessionAvailabilityByDatetimeList),
    );
    return flatArray(sessionAvailabilityByDateTime.map(session => session.sessionAvailabilityList));
  }

  #getAllSessionsIds(cart: Cart): Array<number> {
    return flatArray(Array.from(cart?.sessionItemsByDatetime.values() || [])).map(session => session.sessionId);
  }

  #getCartSeatIds(): string[] {
    return this.#getSeatIdsFromCart(this.#paidCartSnapshot ?? this.cart ?? new Cart());
  }

  #getCurrentLoggerContext(stage: CheckoutStageEnum, data?: Record<string, unknown>): CheckoutLogContext {
    return {
      cartId: this.cart ? this.cart.id : null,
      data,
      stage,
    };
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

  #getMaxPurchasableDays(onsiteSetup: OnsiteSetup = this.onsiteSetupSelected): number {
    const maxPurchasableDaysOneStep = 3;
    if (!onsiteSetup) {
      return maxPurchasableDaysOneStep;
    }
    if (onsiteSetup.max_purchasable_days > maxPurchasableDaysOneStep) {
      return maxPurchasableDaysOneStep;
    }
    return onsiteSetup.max_purchasable_days;
  }

  #getModifyOrderProceedWithoutUpgradeAddonWarning(): {
    messageKey: string;
    mode: 'warning';
    titleKey: string;
  } | null {
    const cart = this.getCart();
    const hasCoupon = Boolean(this.coupon ?? cart?.appliedCoupon);
    if (!hasCoupon || cart == null) {
      return null;
    }
    if (this.#getUpgradeSeatCount(cart) > 0) {
      return null;
    }
    const messageBase = 'oneStopShop.errors.modifyOrderValidation.proceedWithoutUpgradeAddon';
    return {
      messageKey: `${messageBase}.message`,
      mode: 'warning',
      titleKey: `${messageBase}.title`,
    };
  }

  #getOriginalOrderSeatIds(): number[] {
    return (
      this.modifiedOrder()
        ?.assignedSeatsIds?.map(seat => seat.seatsIds)
        .flat() ?? []
    );
  }

  #getModifyOrderLinking(): { sourceOrderId: number; targetOrderId: number } | undefined {
    const sourceOrderId = this.modifiedOrder()?.id;
    const targetOrderId = this.#modifyOrderNewOrderId;
    if (sourceOrderId == null || targetOrderId == null) {
      return undefined;
    }
    return { sourceOrderId, targetOrderId };
  }

  #linkOrdersForModifyOrder(): Observable<BaseResponse<void>> {
    const linking = this.#getModifyOrderLinking();
    if (linking == null) {
      return of(new BaseResponse<void>(null, null));
    }

    const rescheduleType = this.#isAddTicketsMode()
      ? LinkOrdersRescheduleType.AddTicketsModify
      : LinkOrdersRescheduleType.FixedPriceUpgrade;

    return this.#seatsManagementService.linkOrders({
      source_order_id: linking.sourceOrderId,
      target_order_id: linking.targetOrderId,
      reschedule_type: rescheduleType,
    });
  }

  #upgradeSeatingRelease(): void {
    const cartSeatIdsCount = this.#getCartSeatIds().length;
    const originalOrderSeatIdsCount = this.#getOriginalOrderSeatIds().length;

    if (cartSeatIdsCount < originalOrderSeatIdsCount) {
      this.#openPostPaymentSeatReconsiliationModal();
    } else if (cartSeatIdsCount === originalOrderSeatIdsCount) {
      this.#releaseAllOriginalSeatsAndNavigate();
    }
  }

  #getContactInformationFromModifiedOrder(): Customer | undefined {
    const user = this.modifiedOrder()?.user;
    if (!user) {
      return undefined;
    }
    if (user.id === environment.OBO.GENERIC_USER_ID) {
      return undefined;
    }
    const hasData = user.email || user.firstName || user.lastName;
    if (!hasData) {
      return undefined;
    }

    return {
      acceptedTerms: [Terms.ON_SITE_TERMS_OF_PRIVACY],
      email: user.email,
      firstName: user.firstName,
      id: user.id,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber ?? '',
      type: CustomerType.USER,
    };
  }

  #getSeatIdsFromCart(cart: Cart): string[] {
    return Array.from(cart.sessionItemsByDatetime?.values() ?? [])
      .reduce((acc, val) => acc.concat(val), [] as CartSession[])
      .map((session: CartSession) => session.seats)
      .filter((seats): seats is string[] => seats != null)
      .flat();
  }

  #getSeatingSessionIdsForSecondScreen(): number[] {
    const selectedDatetimeSessionIds = (this.selectedSession?.selectedDatetime?.sessionAvailabilityList ?? [])
      .map(session => session.id)
      .filter((sessionId): sessionId is number => typeof sessionId === 'number');
    if (selectedDatetimeSessionIds.length > 0) {
      return [...new Set(selectedDatetimeSessionIds)].sort(
        (firstSessionId: number, secondSessionId: number) => firstSessionId - secondSessionId,
      );
    }

    const fallbackSessionIds = this.regularSessionAvailabilitySummaryByDateList
      .flatMap(summaryByDate => summaryByDate.sessionAvailabilityByDatetimeList)
      .flatMap(datetimeAvailability => datetimeAvailability.sessionAvailabilityList)
      .map(session => session.id)
      .filter((sessionId): sessionId is number => typeof sessionId === 'number');

    return [...new Set(fallbackSessionIds)].sort((firstSessionId: number, secondSessionId: number) => firstSessionId - secondSessionId);
  }

  #getSessionNameById(sessionId: number): string | null {
    const allSessions = this.#getAllSessions();
    const session = allSessions.find(s => s.id === sessionId);
    return session?.name || session?.sessionType?.label || null;
  }

  #getOptimizelyUpgradeSessionTypeIds(): number[] {
    return (
      this.optimizelyService.getFeatureVariableJSON<{ session_type_ids: number[] }>(
        'modify_order_with_seating_through_new_pos',
        'session_type_ids_considered_as_seating_upgrades',
      )?.session_type_ids ?? []
    );
  }

  #getUpgradeSeatCount(cart: Cart): number {
    return this.#getUpgradeSessionsInCart(cart).reduce((sum, session) => sum + session.units, 0);
  }

  #getUpgradeSessionsInCart(cart: Cart): CartSession[] {
    const upgradeIds = new Set(this.#getOptimizelyUpgradeSessionTypeIds());
    const sessions = Array.from(cart.sessionItemsByDatetime?.entries() ?? [])
      .filter(([key]) => key !== 'products')
      .flatMap(([, cartSessions]) => cartSessions);

    return sessions.filter((s: CartSession) => s.sessionType?.id != null && upgradeIds.has(s.sessionType!.id));
  }

  #handlePostBookingQuestions(orderId?: number): Observable<boolean> {
    const order = new Order({ cart: this.cart ?? undefined, id: orderId });
    return this.#bookingQuestionsModalService.handlePostBookingQuestions(order);
  }

  #handleBookingQuestions(): Observable<boolean> {
    this.#clearHighlightedSeatsStorage();
    return this.#bookingQuestionsModalService
      .handlePreBookingQuestions(this.cart, this.customer)
      .pipe(switchMap(v => iif(() => v, of(v), EMPTY)));
  }

  #handleCashCalculator(): Observable<{ amount: number } | null> {
    if (this.cart.total.amount <= 0) {
      return of({ amount: 0 });
    }
    if (this.#isCheckoutModalFlow) {
      return of({ amount: 0 });
    }
    return this.#showCashCalculatorModal();
  }

  #checkCartTotalIsZeroIfPaymentMethodIsFree(): Observable<void> {
    if (this.paymentType() !== PaymentType.FREE) {
      return of(void 0);
    }

    this.updateCartTotalMoney(this.cart || this.nonConfirmedCart, this.coupon);
    if ((this.cartTotalMoney?.amount ?? 0) === 0) {
      return of(void 0);
    }
    this.showModal('oneStopShop.errors.freePayment.cartTotalUpdated.title', 'oneStopShop.errors.freePayment.cartTotalUpdated.message');
    this.paymentType.set(null);
    return EMPTY;
  }

  #handleContactInformation(): Observable<void> {
    if (this.#contactInformationCollectedForCoupon) {
      this.#contactInformationCollectedForCoupon = false;
      return of(void 0);
    }
    const member = this.membershipsData.member;
    if (member !== null) {
      return this.#showMembershipsAcceptTermsModal(member);
    }
    if (this.#isUpgradeSeatingMode() || this.#isAddTicketsMode()) {
      const customerFromModifiedOrder = this.#getContactInformationFromModifiedOrder();
      if (customerFromModifiedOrder !== undefined) {
        this.updateCustomer(customerFromModifiedOrder);
        this.#trackContactInfoCloseModal(customerFromModifiedOrder, { autoFilled: true });
        return of(void 0);
      }
    }
    if (this.cart?.hasSessionsInFuture || !this.#canSkipContactInformation()) {
      return this.#showContactInformationModal().pipe(mergeMap((customer: Customer | null) => (customer ? of(void 0) : EMPTY)));
    }
    return of(void 0);
  }

  #contactInformationCollectedForCoupon = false;

  #couponRemainingBalanceRequiresContact(): boolean {
    return (
      this.couponCombinationEnabled &&
      this.combinedCoupons.length > 0 &&
      this.couponRemainingBalance !== null &&
      this.couponRemainingBalance.amount > 0
    );
  }

  #handleCouponCombinationPaymentPreSteps$(): Observable<void> {
    if (!this.couponCombinationEnabled || this.combinedCoupons.length === 0) {
      return of(void 0);
    }
    const needsContact = this.couponRemainingBalance !== null && this.couponRemainingBalance.amount > 0;
    if (!needsContact) {
      return of(void 0);
    }
    return this.#showContactInformationModal().pipe(
      mergeMap((customer: Customer | null) => {
        if (!customer) {
          return EMPTY;
        }
        this.#contactInformationCollectedForCoupon = true;
        return of(void 0);
      }),
    );
  }

  #handleInvalidCartStatus(): Observable<void> {
    if (this.#cartRecoveryInProgress) {
      return EMPTY;
    }
    this.#cartRecoveryInProgress = true;

    const cartId = this.cart?.id ?? this.nonConfirmedCart?.id ?? null;
    const partnerId = this.partner?.id ?? null;

    this.datadogService.logWarn('[OSS-CART] Invalid cart status detected, discarding cart and resetting state', {
      cartId,
      partnerId,
    });

    this.spinnerService.hide();
    this.showModal('oneStopShop.errors.cartNoLongerValid.title', 'oneStopShop.errors.cartNoLongerValid.message');
    this.clearCartFromCartDetail();
    this.clearMembershipsMember();
    this.cart = null;
    this.nonConfirmedCart = null;

    const discard$: Observable<unknown> =
      cartId && partnerId ? this.cartService.discardCart({ cartId, partnerId }).pipe(catchError(() => of(null))) : of(null);

    return discard$.pipe(
      take(1),
      map((): undefined => void 0),
      finalize(() => {
        this.#cartRecoveryInProgress = false;
      }),
    );
  }

  #invalidCartStatusMatches(errorCode: string | number | undefined, codes: readonly number[]): boolean {
    if (errorCode == null) {
      return false;
    }
    const code = Number(errorCode);
    return codes.includes(code);
  }

  #mergeMandatoryContactForCouponRemaining(fields: string[]): string[] {
    if (!this.#couponRemainingBalanceRequiresContact()) {
      return fields;
    }
    const merged = new Set(fields);
    merged.add(this.emailField);
    return [...merged];
  }

  /**
   * A fiscal compliance block rejected while preparing the cart: no money was collected, so the checkout
   * modal is closed and the compliance dialog opened in the same turn — the dismissal must not get
   * the chance to unwind the flow before the dialog is up.
   */
  #handleFiscalComplianceBlockOnPrepare(error: unknown): boolean {
    if (!(error instanceof FiscalComplianceBlockPrepareError)) {
      return false;
    }
    this.spinnerService.hide();
    this.#fiscalComplianceBlockModalService.open(error.code, () => this.#checkoutModalFlowService.dismissActiveModal());
    return true;
  }

  #handlePaymentError(error: unknown): void {
    this.cartService
      .getCart(this.partner.id, this.cart!.id!)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response: BaseResponse<Cart | null>) => {
          if (response.data?.preparedAt) {
            this.discardCartAfterPaymentError();
          } else {
            this.#showPaymentErrorModal(error);
          }
        },
        error: () => {
          this.#showPaymentErrorModal(error);
        },
      });
  }

  #initialiseActiveShiftEvent() {
    this.#checkExistingActiveShift();

    fromEvent(window, OSS_SHIFT_READY_EVENT_KEY)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((event: CustomEvent) => {
        const activeShift = event.detail.activeShift;
        this.setActiveShift(activeShift);
      });
  }

  #getModifyOrderMode(): ModifiedOrderMode | undefined {
    const params = this.#activatedRoute.snapshot.queryParams;
    const urlOrderId = params['modified_order_id'];
    const mode = params['mode'];
    const order = this.modifiedOrder();
    if (!urlOrderId || !order || order.id !== Number(urlOrderId)) {
      return undefined;
    }
    if (mode === ModifiedOrderModeEnum.UpgradeSeating || mode === ModifiedOrderModeEnum.AddTickets) {
      return mode;
    }
    if (mode === ModifiedOrderModeEnum.ModifyOrder && this.isOrderModificationWithOssEnabled()) {
      return mode;
    }
    return undefined;
  }

  protected isOrderModificationWithOssEnabled(): boolean {
    return (
      this.optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.ORDER_MODIFICATION_WITH_OSS,
        team: 'game-centers',
      }) === true
    );
  }

  #isUpgradeSeatingMode(): boolean {
    return this.#getModifyOrderMode() === ModifiedOrderModeEnum.UpgradeSeating;
  }

  #isAddTicketsMode(): boolean {
    return this.#getModifyOrderMode() === ModifiedOrderModeEnum.AddTickets;
  }

  isModifyOrderMode(): boolean {
    return this.#getModifyOrderMode() === ModifiedOrderModeEnum.ModifyOrder;
  }

  #isRemovingInheritedSettlementCoupon(): boolean {
    return (
      this.isReservationSettlementMode() &&
      isInheritedReservationSettlementCoupon(this.coupon, this.reservationSettlementSessionService.session())
    );
  }

  #matchesReservationSettlementCart(): boolean {
    return matchesReservationSettlementSession(this.cart ?? this.nonConfirmedCart, this.reservationSettlementSessionService.session());
  }

  #removeInheritedSettlementCoupon(): void {
    const session = this.reservationSettlementSessionService.session();

    if (session === null) {
      this.#removeAppliedDiscountLocally();
      return;
    }

    if (session.cart.userId == null) {
      this.showModal(
        'boxOffice.cart.reservationSettlementCouponRemovalError.title',
        'boxOffice.cart.reservationSettlementCouponRemovalError.message',
      );
      return;
    }

    this.cartService
      .applyCouponToCart({ cartId: session.cartId, couponCode: null, partnerId: session.partnerId, userId: session.cart.userId })
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((response: BaseResponse<Cart | null>) => {
        if (response.error != null || response.data == null) {
          this.showModal(
            'boxOffice.cart.reservationSettlementCouponRemovalError.title',
            'boxOffice.cart.reservationSettlementCouponRemovalError.message',
          );
          return;
        }

        adoptReservationSettlementCartAfterCouponRemoval(session, response.data, this.cart ?? this.nonConfirmedCart);
        this.#removeAppliedDiscountLocally();
      });
  }

  #raiseReservationSettlementMismatch(): void {
    const session = this.reservationSettlementSessionService.session();
    const cart = this.cart ?? this.nonConfirmedCart;

    this.isReservationSettlementMismatch.set(true);
    this.datadogService.logWarn('Reservation settlement cart no longer matches the reservation, refusing to pay', {
      cartId: cart?.id ?? null,
      partnerId: this.partner?.id,
      reservationCartId: session?.cartId ?? null,
      reservationId: session?.reservationId ?? null,
    });
    this.changeDetectorRef.markForCheck();
  }

  #isMultiTimeSlotSelectionEnabled(): boolean {
    const userAttributes = this.selectedPlan ? { plan_id: this.selectedPlan.id.toString() } : {};
    return this.optimizelyService.isFeatureEnabled(FeatureFlags.MULTI_TIME_SLOT_SELECTION, userAttributes) ?? false;
  }

  isReservationSettlementActive(): boolean {
    return (
      this.isReservationSettlementMode() || this.reservationSettlementSessionService.isEntry(this.#activatedRoute.snapshot.queryParams)
    );
  }

  isReservationSettlementMode(): boolean {
    return this.reservationSettlementSessionService.session() !== null;
  }

  clearReservationSettlementSession(): void {
    this.reservationSettlementSessionService.clear();
    this.reservationSettlementSeededCartId = null;
    this.isReservationSettlementRejected.set(false);
    this.isReservationSettlementMismatch.set(false);
    this.allowMultiTimeSlotSelection = this.isModifyOrderMode() || this.#isMultiTimeSlotSelectionEnabled();
    this.isPreservingCart = false;
  }

  #resolveSuccessCartId(): string | undefined {
    return this.#paidQuerySnapshot?.cartId ?? this.cart?.id;
  }

  #navigateToSuccessPage(): void {
    const purchasedCartId = this.#resolveSuccessCartId();
    this.clearReservationSettlementSession();
    const navigationExtras: NavigationExtras = {
      queryParams: {
        cityId: this.selectedCity.id,
        mode: null,
        modified_order_id: null,
        planId: this.selectedPlan.id,
        reservation_cart_id: null,
        reservation_id: null,
        venueId: this.selectedPlace.id,
      },
      queryParamsHandling: 'merge',
      state: {
        autoPrint: true,
        isOssFlow: true,
        isOrderModificationLanding: this.isModifyOrderMode(),
        paymentTransactionId: this.oneStepPurchaseService.getLastPaymentTransactionId(purchasedCartId),
        plan: this.plan,
      },
    };

    if (purchasedCartId != null) {
      this.#efrUserMessageModalService
        .showIfPresent()
        .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => {
          this.#ticketingUnsavedChangesBypass?.markPendingBypass();
          this.router.navigate(['/box-office/purchased-cart/', purchasedCartId], navigationExtras);
        });
      return;
    }
  }

  confirmModifyOrder(): void {
    const order = this.modifiedOrder();
    const nonConfirmedCart = this.nonConfirmedCart;
    if (
      order?.id == null ||
      order.planId == null ||
      nonConfirmedCart == null ||
      nonConfirmedCart.getNumberOfTicketAndProductCounts() === 0
    ) {
      this.showModalError();
      return;
    }

    const targetSessionItemsByDatetime = this.#buildModifyOrderSessionItemsByDatetime(nonConfirmedCart);
    const sessionItems = this.#buildModifyOrderSessionItems(targetSessionItemsByDatetime);
    if (sessionItems.length === 0 || sessionItems.some(sessionItem => !sessionItem.sessionId)) {
      this.showModalError('reschedule.error.sessionTicketTypeMismatch');
      return;
    }

    const planId = order.planId;
    const placeId = this.selectedPlace?.id;
    const cityId = this.selectedCity?.id;
    const partnerId = this.partner?.id;
    if (placeId == null || cityId == null || partnerId == null) {
      this.showModalError();
      return;
    }

    this.#rescheduleService.primeReschedulePricingFeatureFlags(planId);

    const rescheduledSessionDate = this.#getEarliestTargetSessionDate(targetSessionItemsByDatetime);

    this.#rescheduleService
      .determineWhoPays(order, nonConfirmedCart)
      .pipe(
        mergeMap(paymentType =>
          this.#rescheduleService.confirmReschedule(
            paymentType,
            cityId,
            planId,
            placeId,
            sessionItems,
            order,
            rescheduledSessionDate,
            partnerId,
            Channel.BoxOffice,
            Channel.BoxOffice,
            nonConfirmedCart,
            null,
            targetSessionItemsByDatetime,
          ),
        ),
        catchError((error: { error?: { message?: string }; message?: string } | undefined) => {
          this.spinnerService.hide();
          if (error instanceof RescheduleModalCancelledError) {
            return EMPTY;
          }
          if (this.#fiscalComplianceBlockModalService.openIfNeeded(error)) {
            return EMPTY;
          }
          this.showModalError(error?.message ?? error?.error?.message ?? 'errors.generic');
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(response => this.#handleModifyOrderRescheduleResponse(order, response));
  }

  confirmModifyOrderIsDisabled(): boolean {
    const emptyCart = this.nonConfirmedCart == null || this.nonConfirmedCart.getNumberOfTicketAndProductCounts() === 0;
    return (
      emptyCart ||
      this.isLoadingCart ||
      this.isLoadingSessions ||
      this.#modifyOrderCartIsUnchanged() ||
      (this.gatesAddToCartOnGroupRuleViolations() && this.hasGroupRuleViolations())
    );
  }

  #modifyOrderCartIsUnchanged(): boolean {
    const orderCart = this.modifiedOrder()?.cart;
    if (orderCart == null || this.nonConfirmedCart == null) {
      return false;
    }
    return this.nonConfirmedCart.hasSameContent(orderCart);
  }

  getModifyOrderPriceDifference(): Money | null {
    const paymentCartTotal = this.modifyOrderPaymentCart()?.total;
    if (paymentCartTotal != null) {
      return new Money(paymentCartTotal.amount, paymentCartTotal.currency);
    }
    const orderCart = this.modifiedOrder()?.cart;
    const newTotal = this.cartTotalMoney;
    if (orderCart == null || newTotal == null) {
      return null;
    }
    const originalOrderAmount = (orderCart.total?.amount ?? 0) + (orderCart.appliedCoupon?.discount.amount ?? 0);
    return new Money(newTotal.amount - originalOrderAmount, newTotal.currency || orderCart.total?.currency || '');
  }

  #handleModifyOrderRescheduleResponse(order: Order, response: Cart | BaseResponse<OrderRescheduled> | PayOneStepResponse): void {
    if (response instanceof Cart) {
      this.spinnerService.hide();
      this.#enterModifyOrderPaymentState(response);
      return;
    }

    const orderId = response instanceof BaseResponse ? response.data?.orderId : response.order?.id;
    if (orderId === undefined) {
      this.spinnerService.hide();
      this.showModalError();
      return;
    }

    this.#navigateToRescheduledOrder(orderId);
  }

  payModifyOrderDifference(paymentType?: PaymentType): void {
    const paymentCart = this.modifyOrderPaymentCart();
    if (paymentCart == null || this.paymentInProgress) {
      return;
    }
    if (paymentType !== undefined) {
      this.paymentType.set(paymentType);
    }
    const checkedCashRegisterId = this.activeShift()?.cashRegister;
    this.#guardFiscalCompliance(paymentCart)
      .pipe(
        take(1),
        filter((eligible: boolean) => eligible),
        switchMap(() =>
          this.#efrHealthCheckModalService.guardPurchase(
            this.onsiteSetupSelected?.place?.country_iso_code_2,
            this.#efrGuardPurchaseContext(),
          ),
        ),
        take(1),
        filter((healthy: boolean) => healthy),
        switchMap(() => this.#guardFiscalTaxes(paymentCart)),
        take(1),
        filter((fiscalisable: boolean) => fiscalisable),
        switchMap(() => this.#validateShift()),
        take(1),
        switchMap(() => this.#guardFiscalComplianceAfterShiftValidation(checkedCashRegisterId, paymentCart)),
        take(1),
        filter((eligible: boolean) => eligible),
        switchMap(() => this.#guardPurchaseAfterShiftValidation(checkedCashRegisterId)),
        take(1),
        filter((healthy: boolean) => healthy),
        switchMap(() => this.#openCheckoutModalIfNeeded({ cart: paymentCart, total: this.#modifyOrderChargedTotal(paymentCart) })),
        take(1),
        switchMap(() => this.#handleModifyOrderCashCalculator(paymentCart)),
        take(1),
        switchMap((cashReceived: { amount: number } | null) => {
          if (this.paymentType() === PaymentType.CASH && cashReceived === null) {
            this.paymentType.set(null);
            return EMPTY;
          }
          this.cashCalculatorCashReceived = cashReceived !== null ? cashReceived.amount : null;
          return this.#payInOneStepWithModalRetry();
        }),
        finalize(() => {
          this.#isCheckoutModalFlow = false;
          this.#requestedCheckoutFlow = 'fullCheckout';
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (error: unknown) => this.#handleModifyOrderPaymentError(error),
        next: (response: PayOneStepResponse | null) => {
          if (response !== null) {
            this.#navigateAfterModifyOrderPayment(response.order.id!);
          }
        },
      });
  }

  cancelModifyOrderPayment(): void {
    if (this.paymentInProgress) {
      return;
    }
    this.exitModifyOrderPaymentIfActive();
  }

  exitModifyOrderPaymentIfActive(): void {
    const paymentCart = this.modifyOrderPaymentCart();
    if (paymentCart == null || this.paymentInProgress) {
      return;
    }
    this.modifyOrderPaymentCart.set(null);
    this.cart = null;
    this.#changeDetectorRef.markForCheck();
    this.#discardModifyOrderCart(paymentCart);
  }

  #enterModifyOrderPaymentState(paymentCart: Cart): void {
    this.cart = paymentCart;
    this.modifyOrderPaymentCart.set(paymentCart);
    this.#changeDetectorRef.markForCheck();
  }

  #discardModifyOrderCart(paymentCart: Cart): void {
    const partnerId = this.partner?.id;
    if (paymentCart.id && partnerId != null) {
      this.cartService
        .discardCart({ cartId: paymentCart.id, partnerId })
        .pipe(
          take(1),
          catchError(() => EMPTY),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe();
    }
  }

  protected applyModifyOrderSharedAvailabilityRules(): void {
    if (!this.isModifyOrderMode() || this.nonConfirmedCart == null) {
      return;
    }
    const rulesBySessionId = new Map<number, SharedAvailabilityRule>();
    this.regularSessionAvailabilitySummaryByDateList.forEach(availabilityByDate =>
      availabilityByDate.sessionAvailabilityByDatetimeList.forEach(availabilityByDatetime =>
        availabilityByDatetime.sessionAvailabilityList.forEach(sessionAvailability => {
          if (sessionAvailability.sharedAvailabilityRule !== undefined) {
            rulesBySessionId.set(Number(sessionAvailability.id), sessionAvailability.sharedAvailabilityRule);
          }
        }),
      ),
    );
    if (rulesBySessionId.size === 0) {
      return;
    }
    let cartUpdated = false;
    this.nonConfirmedCart.sessionItemsByDatetime.forEach(sessions =>
      sessions.forEach(session => {
        if (session.sharedAvailabilityRule === undefined) {
          const rule = rulesBySessionId.get(session.sessionId);
          if (rule !== undefined) {
            session.sharedAvailabilityRule = rule;
            cartUpdated = true;
          }
        }
      }),
    );
    if (cartUpdated) {
      this.#changeDetectorRef.markForCheck();
    }
  }

  #handleModifyOrderCashCalculator(paymentCart: Cart): Observable<{ amount: number } | null> {
    if (this.paymentType() !== PaymentType.CASH) {
      return of(null);
    }
    if ((paymentCart.total?.amount ?? 0) <= 0) {
      return of({ amount: 0 });
    }
    if (this.#isCheckoutModalFlow) {
      return of({ amount: 0 });
    }
    const modal = this.modalService.open(CashChangeCalculatorModalComponent, {
      backdrop: 'static',
      injector: this.#injector,
      keyboard: false,
    });
    const instance = modal.componentInstance as CashChangeCalculatorModalComponent;
    instance.cart = paymentCart;
    instance.cashModalMandatory = this.cashModalMandatory;
    instance.trackViewEvent = posCheckoutCashCalcShowModal({ toBePaid: paymentCart.total!.amount });
    return merge(instance.cashReceived, modal.dismissed.pipe(map((): { amount: number } | null => null))) as Observable<{
      amount: number;
    } | null>;
  }

  #handleModifyOrderPaymentError(error: unknown): void {
    if (this.#handleFiscalComplianceBlockOnPrepare(error)) {
      return;
    }
    // The checkout modal owns its own failure and cancellation screens, exactly as in a normal sale
    // (see the purchase pipeline error handler): the legacy popups must never surface on top.
    if (this.#isModalPaymentSessionActive()) {
      return;
    }
    if (this.#isCheckoutModalFlow && isCancelledTransactionError(error)) {
      return;
    }
    this.#showPaymentErrorModal(error);
  }

  #modifyOrderChargedTotal(paymentCart: Cart): Money {
    const total = paymentCart.total;
    return total != null ? new Money(total.amount, total.currency || this.currency || '') : this.cartTotalMoney;
  }

  /** The modal owns the screen until it closes; only then may we leave the page. */
  #navigateAfterModifyOrderPayment(orderId: number): void {
    const navigate = (): void => {
      if (this.#resolveSuccessCartId() == null) {
        this.datadogService.logWarn(
          '[OSS-TICKETING] Modify order difference payment success cart ID is null, falling back to rescheduled order screen',
          {
            orderId,
          },
        );
        this.#navigateToRescheduledOrder(orderId);
        return;
      }
      this.#navigateToSuccessPage();
    };
    if (!this.#isCheckoutModalFlow) {
      navigate();
      return;
    }
    this.#checkoutPaymentDriver.modalClosed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(() => navigate());
  }

  #navigateToRescheduledOrder(orderId: number): void {
    this.#ticketingUnsavedChangesBypass?.markPendingBypass();
    this.router.navigate(['/box-office/order/', orderId], {
      queryParams: {
        cityId: this.selectedCity?.id,
        mode: null,
        modified_order_id: null,
        planId: this.selectedPlan?.id ?? this.modifiedOrder()?.planId,
        venueId: this.selectedPlace?.id,
      },
      queryParamsHandling: 'merge',
      state: {
        autoPrint: true,
        cart: this.cart,
        isOssFlow: true,
        plan: this.plan,
      },
    });
  }

  #buildModifyOrderSessionItems(sessionItemsByDatetime: Map<string, CartSession[]>): SessionItem[] {
    const unitsBySessionId = new Map<number, number>();
    sessionItemsByDatetime.forEach(sessions => {
      sessions.forEach(session => {
        unitsBySessionId.set(session.sessionId, (unitsBySessionId.get(session.sessionId) ?? 0) + session.units);
      });
    });
    return Array.from(unitsBySessionId.entries()).map(([sessionId, ticketNumber]) => ({ sessionId, ticketNumber }));
  }

  #buildModifyOrderSessionItemsByDatetime(cart: Cart): Map<string, CartSession[]> {
    const sessionItemsByDatetime = new Map<string, CartSession[]>();
    cart.sessionItemsByDatetime?.forEach((sessions, datetime) => {
      const cartSessions = sessions
        .filter(session => session.sessionId != null && session.units > 0)
        .map(session => new CartSession(session.sessionId, session.units));
      if (cartSessions.length > 0) {
        sessionItemsByDatetime.set(datetime, cartSessions);
      }
    });
    return sessionItemsByDatetime;
  }

  #getModifyOrderOriginalChannelId(order: Order): string {
    if (order.catalogPlan != null) {
      return Channel.BoxOffice;
    }
    return order.reservationChannelId || order.channelId || Channel.BoxOffice;
  }

  #getModifyOrderOriginalChannel(order: Order): Channel {
    const channelId = this.#getModifyOrderOriginalChannelId(order);
    const channelKey = Object.keys(Channel).find(key => Channel[key as keyof typeof Channel] === channelId);
    return channelKey !== undefined ? Channel[channelKey as keyof typeof Channel] : Channel.BoxOffice;
  }

  #getEarliestTargetSessionDate(sessionItemsByDatetime: Map<string, CartSession[]>): Date {
    const targetDatetime = this.#getEarliestSessionDatetime(sessionItemsByDatetime);
    if (targetDatetime !== undefined) {
      return new Date(targetDatetime);
    }
    const orderDatetime = this.#getEarliestSessionDatetime(this.modifiedOrder()?.cart?.sessionItemsByDatetime);
    return orderDatetime !== undefined ? new Date(orderDatetime) : new Date();
  }

  #getEarliestSessionDatetime(sessionItemsByDatetime: Map<string, CartSession[]> | undefined): string | undefined {
    return Array.from(sessionItemsByDatetime?.keys() ?? [])
      .filter(datetime => datetime !== 'products')
      .sort()[0];
  }

  #openOverrideCapacityConfirmationModal(): Observable<boolean> {
    return this.#openShiftConfirmationModal('boxOffice.overrideCapacity.confirmationModal');
  }

  #openPostPaymentSeatReconsiliationModal(): void {
    const order = this.modifiedOrder();
    const originalTickets = order?.accessTickets ? Array.from(order.accessTickets.values()).filter(ticket => ticket.seatId != null) : [];
    const newSeatsCount = this.#getCartSeatIds().length;

    this.releaseTicketSeats.set(originalTickets);
    this.releaseTicketSelections.set(originalTickets.map(() => false));
    this.releaseTicketsAddedCount.set(newSeatsCount);
    this.releaseTicketsRequiredCount.set(newSeatsCount);
    this.isReleaseTicketsSheetOpen.set(true);
  }

  #openShiftConfirmationModal(prefix: string): Observable<boolean> {
    const translate = (key: string): string => this.translate.instant(`${prefix}.${key}`);

    const modal = this.modalService.open(ConfirmModalComponent, {
      backdrop: 'static',
      windowClass: 'ticketing-confirmation-modal',
    });
    const component = modal.componentInstance as ConfirmModalComponent;

    component.config = {
      leftButtonText: translate('leftButton').toUpperCase(),
      message: translate('message'),
      rightButtonText: translate('rightButton').toUpperCase(),
      title: translate('title'),
    };

    const response: Observable<boolean> = component.response.pipe(
      take(1),
      finalize(() => modal.close()),
    );

    return merge(modal.dismissed.pipe(map((): boolean => false)), response) as Observable<boolean>;
  }

  #parseTicketRequirementsFromError(errorMessage: string): { max: number; min: number; sessionId: number } | null {
    const regex = /from\s+(\d+)\s+to\s+(\d+)\s+for\s+session\s+(\d+)/;
    const match = errorMessage.match(regex);

    if (!match) {
      return null;
    }

    return {
      max: Number(match[2]),
      min: Number(match[1]),
      sessionId: Number(match[3]),
    };
  }

  #isModalPaymentSessionActive(): boolean {
    return this.#checkoutPaymentDriver.isActive();
  }

  #payInOneStepWithModalRetry(): Observable<PayOneStepResponse | null> {
    return this.#checkoutModalResendService.payWithModalResend({
      onSessionEndedWithoutResend: () => this.#ticketingUnsavedChangesBypass?.clearPendingBypass(),
      payInOneStep: () => this.#payInOneStep(),
      setPaymentType: (paymentType: PaymentType) => this.paymentType.set(paymentType),
    });
  }

  #payInOneStep(): Observable<PayOneStepResponse | null> {
    this.showPaymentsInLateral = false;
    if (this.paymentInProgress || this.oneStepPurchaseService.isHandlingFranceAsyncFiscalFailure()) {
      return of(null);
    }
    this.#trackPosCheckoutPaymentStarted();
    this.#ticketingUnsavedChangesBypass?.markPendingBypass();
    this.spinnerService.show();
    this.paymentInProgress = true;
    if (this.cart?.id) {
      this.#cartTimingService.startPrepareCartTiming(this.cart.id);
    }
    this.#recordCartPrepareAttempt();
    const payOneStepQuery = this.#generatePayOneStepQueryParams();
    this.#paidQuerySnapshot = payOneStepQuery;
    this.#paidCartSnapshot = this.cart;
    return this.oneStepPurchaseService.payOneStep(payOneStepQuery, this.#destroyRef).pipe(
      catchError((error: unknown) => {
        this.#trackPosCheckoutPaymentFailed(error);
        return throwError(() => error);
      }),
      finalize(() => {
        this.paymentInProgress = false;
        // Reset on every termination (success/error/cancel). On Square/Payhere cancel the stream
        // completes without error, so the `error` handler never runs; without this reset the flag
        // stays true and createOrUpdateCart() short-circuits, leaving cart edits unsaved on retry.
        this.#isReadyForSeatReleasePayment = false;
        this.spinnerService.hide();
      }),
    );
  }

  #modifyOrderLinkAfterPayInOneStep(response: PayOneStepResponse | null): Observable<PayOneStepResponse | null> {
    if (response === null) {
      return of(null);
    }
    if (!this.#isUpgradeSeatingMode() && !this.#isAddTicketsMode()) {
      return of(response);
    }
    this.#modifyOrderNewOrderId = response.order.id ?? null;
    this.spinnerService.show();
    return this.#linkOrdersForModifyOrder().pipe(
      takeUntilDestroyed(this.#destroyRef),
      tap(() => {
        this.spinnerService.hide();
      }),
      map(() => response),
      catchError(() => {
        this.spinnerService.hide();
        this.showModalError();
        return of(response);
      }),
    );
  }

  #preserveCustomTabsBySessionId(ticketTypeCounter: { bySessionId: Map<string, number>; bySessionType: Map<string, number> }) {
    const preservedCustomTabsBySessionId = new Map<string, number>();
    const preservedCustomTabsBySessionType = new Map<string, number>();

    this.selectedTicketsBySessionId.forEach((units, sessionId) => {
      const sessionIdNum = parseInt(sessionId);
      const isCustomTabProduct = this.productTypes.some(pt => pt.sessionId === sessionIdNum && pt.isShopProduct === true);
      if (isCustomTabProduct && units > 0 && !ticketTypeCounter.bySessionId.has(sessionId)) {
        preservedCustomTabsBySessionId.set(sessionId, units);
      }
    });

    this.selectedTicketsBySessionType.forEach((units, sessionType) => {
      const isCustomTabProduct = this.productTypes.some(pt => pt.name === sessionType && pt.isShopProduct === true);
      if (isCustomTabProduct && units > 0 && !ticketTypeCounter.bySessionType.has(sessionType)) {
        preservedCustomTabsBySessionType.set(sessionType, units);
      }
    });
    return { preservedCustomTabsBySessionId, preservedCustomTabsBySessionType };
  }

  #printTotal(onsiteSetup: OnsiteSetup, total: Money): void {
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

  #recordCartPrepareAttempt(): void {
    if (this.cart?.id == null) {
      return;
    }
    this.#lastCartPrepareAttempt = { cartId: this.cart.id, customerEmail: this.customer?.email ?? null };
  }

  #recreateCartWithAppliedCoupons$(): Observable<boolean> {
    const inCombinationMode = this.couponCombinationEnabled && this.combinedCoupons.length > 0;
    const appliedCouponCodes = inCombinationMode
      ? this.combinedCoupons.map((coupon: Coupon) => coupon.code)
      : this.coupon != null
        ? [this.coupon.code]
        : [];
    if (appliedCouponCodes.length === 0) {
      return this.createOrUpdateCart().pipe(
        mergeMap(response => this.checkResponseData(response)),
        tap(response => {
          this.cart = response.data;
          this.cart!.hasSeating = this.nonConfirmedCart?.hasSeating ?? false;
          this.cartDetailService?.setCart(this.cart!);
        }),
        map(() => true),
      );
    }
    this.#clearCoupon();
    let lastCouponApplyError: Error | null = null;
    return from(appliedCouponCodes).pipe(
      concatMap(code =>
        this.#applyCouponOneStep$(code, null).pipe(
          defaultIfEmpty(void 0),
          tap(() => {
            lastCouponApplyError = this.couponError.getValue() ?? lastCouponApplyError;
          }),
        ),
      ),
      toArray(),
      map(() => {
        if (this.cart?.id == null || !this.#allCouponCodesApplied(appliedCouponCodes)) {
          if (lastCouponApplyError !== null && this.couponError.getValue() === null) {
            this.#setPromoCodeApplyError(lastCouponApplyError);
          }
          return false;
        }
        this.cartDetailService?.setCart(this.cart);
        return true;
      }),
    );
  }

  #releaseAllOriginalSeatsAndNavigate(): void {
    const order = this.modifiedOrder();
    const originalTickets = order?.accessTickets ? Array.from(order.accessTickets.values()).filter(ticket => ticket.seatId != null) : [];
    const cancellations = this.#buildCancellationsFromTickets(originalTickets);

    if (cancellations.length === 0) {
      this.#navigateToSuccessPage();
      return;
    }

    this.spinnerService.show();

    this.#seatsManagementService
      .cancelCodesAndReleaseSeats(cancellations, this.#getModifyOrderLinking())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.spinnerService.hide();
          this.showModalError();
        },
        next: () => {
          this.spinnerService.hide();
          this.#navigateToSuccessPage();
        },
      });
  }

  #resetPaymentState(): void {
    this.paymentType.set(null);
    this.cashCalculatorCashReceived = null;
  }

  #restoreCustomTabsSelections(customTabSelectionsBySessionId: Map<string, number>, customTabSelectionsBySessionType: Map<string, number>) {
    customTabSelectionsBySessionId.forEach((units, sessionId) => {
      if (units > 0) {
        this.selectedTicketsBySessionId.set(sessionId, units);
      }
    });
    customTabSelectionsBySessionType.forEach((units, sessionType) => {
      if (units > 0) {
        this.selectedTicketsBySessionType.set(sessionType, units);
      }
    });
  }

  #restoreMissingTypesToSelection() {
    if (this.selectedTicketsBySessionType.size === 0) {
      return;
    }

    const existingSelectionsBySessionType = new Map(this.selectedTicketsBySessionType);
    const existingSelectionsBySessionId = new Map(this.selectedTicketsBySessionId);

    const restoredSelectionsBySessionType = new Map(
      [...this.productTypes, ...this.ticketTypes].map(ticketType => [
        ticketType.name,
        existingSelectionsBySessionType.get(ticketType.name) || 0,
      ]),
    );

    // TODO remove count 0 here

    const restoredSelectionsBySessionId = new Map(
      [...this.productTypes, ...this.ticketTypes].map(ticketType => [
        ticketType.sessionId.toString(),
        existingSelectionsBySessionId.get(ticketType.sessionId.toString()) || 0,
      ]),
    );

    this.selectedTicketsBySessionType = restoredSelectionsBySessionType;
    this.selectedTicketsBySessionId = restoredSelectionsBySessionId;
  }

  #selectedTicketsContainOnlyShopProducts(): boolean {
    if (this.selectedTicketsBySessionId.size === 0) {
      return false;
    }

    let hasAnyProductWithUnits = false;

    for (const [sessionId] of this.selectedTicketsBySessionId.entries()) {
      const sessionIdNum = parseInt(sessionId);
      const isShopProduct = this.productTypes.some(pt => pt.sessionId === sessionIdNum && pt.isShopProduct === true);
      if (!isShopProduct) {
        return false;
      }
      hasAnyProductWithUnits = true;
    }

    return hasAnyProductWithUnits;
  }

  #sendCreateModifiedOrderEvent(newOrderId: number | undefined): void {
    const params = this.#activatedRoute.snapshot.queryParams;
    const urlOrderId = params['modified_order_id'];
    if (!urlOrderId) {
      return;
    }
    const originalOrderId = Number(urlOrderId);
    const mode = params['mode'];
    const hasValidIds = newOrderId != null && !Number.isNaN(originalOrderId);
    const isValidMode = mode === ModifiedOrderModeEnum.UpgradeSeating || mode === ModifiedOrderModeEnum.AddTickets;

    if (!hasValidIds || !isValidMode) {
      return;
    }

    this.trackingService.track(
      new CreateModifiedOrderEvent({
        mode,
        new_order_id: newOrderId,
        original_order_id: originalOrderId,
      }),
    );
  }

  #trackPosCheckoutPaymentCompleted(paymentMethod: PaymentType): void {
    if (!this.cart) {
      return;
    }

    this.#fzTracking.track(posCheckoutPaymentCompleted(buildPosCheckoutPaymentCompletedData(this.cart, paymentMethod)));
  }

  #trackPosCheckoutPaymentFailed(error: unknown): void {
    const paymentMethod = this.paymentType();
    if (paymentMethod == null) {
      return;
    }

    this.#fzTracking.track(posCheckoutPaymentFailed(buildPosCheckoutPaymentFailedData(this.cart, paymentMethod, error)));
  }

  #trackPosCheckoutPaymentStarted(): void {
    if (
      !shouldTrackAdyenPaymentStarted(
        this.paymentType(),
        this.paymentConfigStorageService.getConfiguration(),
        this.#boxOfficePaymentMethodsService.getGatewayProvider(this.onsiteSetupSelected),
      )
    ) {
      return;
    }

    this.#fzTracking.track(posCheckoutPaymentStarted());
  }

  #sendCreateOrderEvent(response: PayOneStepResponse, query: PayOneStepQuery, cart: Cart): void {
    const isUsingCashCalculator = query.paymentType === PaymentType.CASH && this.cashCalculatorCashReceived > 0;
    const { order, paymentTransactionId } = response;
    const inCombinationMode = this.couponCombinationEnabled && this.combinedCoupons.length > 0;
    const couponCode = inCombinationMode ? order.cart?.appliedCoupon?.code || null : cart.appliedCoupon?.code || null;

    this.#cartTimingService.recordOrderConfirmationTiming(order.id, query.cartId);
    this.trackingService.track(
      new CreateOrderEvent({
        cart_id: query.cartId,
        channel: this.channelId,
        city_id: this.selectedCity.id,
        city_name: this.selectedCity.title,
        coupon_code: couponCode,
        currency: cart.total != null ? cart.total.currency : '',
        customer_id: cart.userId,
        event_date: [...cart.sessionItemsByDatetime][0][0],
        feverzone_user: this.userService.getUserEmail(),
        obo_flow_type: this.onsiteSetupSelected?.obo_flow_type,
        order_id: order.id,
        payment_provider: response.paymentProvider,
        payment_transaction_id: paymentTransactionId,
        payment_type: query.paymentType,
        place_id: this.selectedPlace.id,
        place_name: this.selectedPlace.title,
        plan_id: this.selectedPlan.id,
        plan_name: this.selectedPlan.title,
        purchase_source: this.channelId,
        time: new Date().toISOString(),
        total: cart.total != null ? cart.total.amount : 0,
        total_purchased_tickets: cart.getNumberOfTicketAndProductCounts(),
        total_surcharge: cart.totalSurcharge != null ? cart.totalSurcharge.amount : 0,
        using_cash_calculator: isUsingCashCalculator,
        ...getMultiplanCartFlags(cart),
      }),
    );
    this.#sendCreateModifiedOrderEvent(order.id);
  }

  #sendLogConfirmedCart(nonConfirmedCart: Cart, confirmedCart: Cart): void {
    this.datadogService.logInfo(`[OBO-CART] CONFIRMED - Total: ${confirmedCart.total.amount} ${confirmedCart.total.currency}`, {
      cartTotalMoney: confirmedCart.total,
      coupon: confirmedCart.appliedCoupon,
      numberOfTickets: confirmedCart.numberOfTickets,
    });
    if (
      nonConfirmedCart.getNumberOfTicketAndProductCounts() === confirmedCart.getNumberOfTicketAndProductCounts() &&
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

  #trackContactInfoCloseModal(customer: Customer | null, options?: { autoFilled?: boolean }): void {
    const mandatoryFields = this.getMandatoryFields();

    this.#fzTracking.track(
      posCheckoutContactInfoCloseModal({
        action: resolveContactInfoCloseModalAction(customer, mandatoryFields, options),
        filledFields: getFilledContactInfoFields(customer),
        requiredFields: getRequiredContactInfoFields(mandatoryFields),
        visibleFields: getVisibleContactInfoFields(this.showEmailContactInformation, this.showPhoneNumberContactInformation),
      }),
    );
  }

  #trackContactInfoShowModal(): void {
    const mandatoryFields = this.getMandatoryFields();

    this.#fzTracking.track(
      posCheckoutContactInfoShowModal({
        requiredFields: getRequiredContactInfoFields(mandatoryFields),
        visibleFields: getVisibleContactInfoFields(this.showEmailContactInformation, this.showPhoneNumberContactInformation),
      }),
    );
  }

  #sendPrepareCartEvent(): void {
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

  #setupDebouncedCartTotal(): void {
    const debounceMs = OssTicketingComponent.cartTotalDebounceMs;
    this.updateCartTotalTrigger$
      .pipe(
        switchMap(() =>
          timer(debounceMs).pipe(
            switchMap(() => {
              if (this.#isReadyForSeatReleasePayment) {
                return EMPTY;
              }
              if (this.coupon && !this.isCouponCombinationUiActive()) {
                return this.#applyCouponOneStep$(this.coupon.code, null);
              }
              this.#updateCartTotalImmediate();
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #setupSeatTrackingBatch(): void {
    this.#seatTrackingTrigger$
      .pipe(
        groupBy(event => event.sessionId.toString()),
        mergeMap(group$ => group$.pipe(buffer(group$.pipe(debounceTime(OssTicketingComponent.seatTrackingBatchMs))))),
        filter(events => events.length > 0),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(events => {
        const { previousCount, sessionId } = events[0];
        const newCount = events[events.length - 1].newCount;
        if (newCount === previousCount) {
          return;
        }
        this.trackPosCartItemQuantityChange({ newCount, previousCount, sessionId, source: 'from_seating' });
      });
  }

  #shouldResetCartForNewSearch(newFilters: SearchFilter, date?: Date): boolean {
    if (!this.multiPlanCartEnabled && this.selectedCity?.id !== newFilters.selectedCity?.id) {
      return true;
    }
    if (
      this.manageAsFreeSeatingMap &&
      date != null &&
      this.fromDate != null &&
      this.fromDate.getTime() !== date.getTime() &&
      (!this.multiPlanCartEnabled || !this.hasMultiplanSeatingFlowContext)
    ) {
      return true;
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

  #showCashCalculatorModal(): Observable<{ amount: number } | null> {
    if (this.paymentType() !== PaymentType.CASH) {
      return of(null);
    }

    this.#clearHighlightedSeatsStorage();
    const cart = this.getCurrentCart();
    if (cart == null || cart.total == null) {
      return of(null);
    }
    const modal = this.modalService.open(CashChangeCalculatorModalComponent, {
      backdrop: 'static',
      injector: this.#injector,
      keyboard: false,
    });
    const instance = modal.componentInstance as CashChangeCalculatorModalComponent;
    instance.cart = cart;
    instance.cashModalMandatory = this.cashModalMandatory;
    instance.trackViewEvent = posCheckoutCashCalcShowModal({ toBePaid: cart.total.amount });
    return merge(instance.cashReceived, modal.dismissed.pipe(map((): { amount: number } | null => null))) as Observable<{
      amount: number;
    } | null>;
  }

  #showContactInformationModal(): Observable<Customer | null> {
    this.#clearHighlightedSeatsStorage();
    this.setOboSecondScreenSeatingMapFullscreen(false);
    const isDualScreenSynchronizationActive =
      (this.optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.ENABLE_SECOND_SCREEN_CONTACT_INFO,
        team: 'b2b-shops',
      }) ??
        false) &&
      this.#dualScreenStorageService.containsData();
    if (isDualScreenSynchronizationActive) {
      this.#oboSecondScreenDataService.setIsContactInfoActive(true);
    }
    const dialogRef = this.#igntDialogService.openModal<ContactInformationModalResult, ContactInformationModalData>(
      ContactInformationModalComponent,
      {
        data: {
          defaultCountry: this.partner?.countryCode ?? null,
          isDualScreenSynchronizationActive,
          mandatoryFields: this.getMandatoryFields(),
          previousUserDetails: null,
          showEmail: this.showEmailContactInformation,
          showPhoneNumber: this.showPhoneNumberContactInformation,
        },
        disableCloseShortcuts: true,
        size: 'sm',
      },
    );
    this.#trackContactInfoShowModal();

    return dialogRef.closed$.pipe(
      finalize(() => {
        if (isDualScreenSynchronizationActive) {
          this.#oboSecondScreenDataService.setIsContactInfoActive(false);
        }
      }),
      map((result: ContactInformationModalResult): Customer | null =>
        result != null && typeof result === 'object' && 'type' in result && result.type === CustomerType.USER ? result : null,
      ),
      map((customer: Customer | null) => {
        if (customer) {
          this.updateCustomer(customer);
        }
        this.#trackContactInfoCloseModal(customer);
        return customer;
      }),
    );
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

  #showPaymentErrorModal(error: unknown): void {
    if (typeof error === 'string') {
      const formattedErrorMessage = this.#formatErrorMessage(error);
      const [errorTitle, errorMessage, errorCode] = formattedErrorMessage.split(',');
      this.showModal(errorTitle, errorMessage, errorCode);
      return;
    }

    const typedError = error as PaymentError;

    if (Number(typedError?.error?.code) === allowedTicketsErrorCode) {
      const formattedError = this.#formatBackendError(typedError.error?.message, typedError.error?.code);
      this.showModal(formattedError.title, formattedError.message, typedError.error?.code);
    } else if (typedError?.message || typedError?.error?.message) {
      this.showModalError(typedError.message ?? typedError.error?.message);
    } else {
      this.showModalError();
    }
  }

  #syncCartChanges(cart: Cart | null, coupon?: Coupon): void {
    const incomingMatchesLocal =
      cart !== null && (this.nonConfirmedCart === null ? this.#countCartUnits(cart) === 0 : this.nonConfirmedCart.hasSameContent(cart));

    if (incomingMatchesLocal) {
      const localCart = this.nonConfirmedCart;
      this.updateCartTotalMoney(cart, coupon);
      this.nonConfirmedCart = cart?.clone() ?? null;
      if (this.nonConfirmedCart) {
        restoreLocalCartPresentation(this.nonConfirmedCart, localCart);
      }
    } else {
      this.updateCartTotalMoney(this.nonConfirmedCart, coupon);
    }
  }

  #syncHighlightedSeatsStorage(): void {
    if (!this.#dualScreenStorageService.containsData()) {
      return;
    }

    if (!this.hasPlanSeating()) {
      this.#clearHighlightedSeatsStorage();
      return;
    }

    const eventKey = this.seatingMapState?.event;

    const storedPayload = this.#secondScreenSeatingMapStorageService.getSecondScreenSeatingMapStoragePayload();

    const seats = this.#getSeatIdsFromCart(this.nonConfirmedCart ?? this.cart ?? new Cart()).filter(Boolean);
    const sessionIds = this.#getSeatingSessionIdsForSecondScreen();
    const payload: SecondScreenSeatingMapStorage = {
      channels: this.seatingMapState?.channels ?? storedPayload?.channels,
      eventKey: eventKey ?? storedPayload?.eventKey,
      providerPublicKey: this.seatingMapState?.provider_public_key ?? storedPayload?.providerPublicKey,
      seats: [...new Set(seats)],
      sessionIds,
    };
    this.#secondScreenSeatingMapStorageService.setSecondScreenSeatingMapStoragePayload(payload);
  }

  #updateCartTotalImmediate(): void {
    this.updateCartTotalMoney(this.getCurrentCart());
    this.updateOboSecondScreenCart();
    this.#changeDetectorRef.markForCheck();
    this.#printTotal(this.onsiteSetupSelected, this.cartTotalMoney);
  }

  protected updateCartTotalMoney(cart: Cart | null, coupon?: Coupon): void {
    const requestedCoupon = this.isReservationSettlementMode() ? (coupon ?? this.coupon ?? undefined) : coupon;
    const effectiveCoupon = this.#getEffectiveCouponForCartTotal(cart, requestedCoupon);
    if (cart !== null) {
      cart.appliedCoupon = effectiveCoupon ?? null;
      cart.appliedPlanDiscounts = selectEffectivePlanDiscounts(this.membershipsData.planDiscounts, cart);
      if (this.isReservationSettlementMode()) {
        applyReservationSettlementDiscount(cart, effectiveCoupon);
      } else {
        cart.calculateTotal(effectiveCoupon);
      }

      const totalMoney: Money = cart.total ?? new Money(0, '');
      const currency = totalMoney.currency || this.currency || '';
      this.cartTotalMoney = new Money(totalMoney.amount, currency);

      const totalMoneyWithoutCoupon: Money = cart.totalWithoutDiscount ?? new Money(0, '');
      const currencyWithoutCoupon = totalMoneyWithoutCoupon.currency || this.currency || '';
      this.cartTotalMoneyWithoutCoupon = new Money(totalMoneyWithoutCoupon.amount, currencyWithoutCoupon);
    } else {
      const emptyCurrency = this.currency ?? '';
      this.cartTotalMoney = new Money(0, emptyCurrency);
      this.cartTotalMoneyWithoutCoupon = new Money(0, emptyCurrency);
    }

    this.cartHasEffectiveDiscount = this.cartTotalMoneyWithoutCoupon?.amount !== this.cartTotalMoney?.amount;

    this.changeDetectorRef.detectChanges();
  }

  #getEffectiveCouponForCartTotal(cart: Cart | null, coupon?: Coupon): Coupon | undefined {
    if (this.hasActiveMemberPerks()) {
      return undefined;
    }

    if (!this.couponCombinationEnabled || this.combinedCoupons.length === 0 || cart === null) {
      return coupon;
    }

    this.#refreshCouponCombinationAggregates(cart);
    return this.effectiveCombinedCoupon ?? undefined;
  }

  #getEffectiveMemberCouponCode(): string | null {
    const planDiscounts = this.cart?.appliedPlanDiscounts ?? this.membershipsData.planDiscounts;

    return selectChargeableMemberCouponCode(planDiscounts, this.cart);
  }

  #updateOboSecondScreenPlace(placeId?: number): void {
    this.#oboSecondScreenDataService.setPlace(placeId);
    this.#changeDetectorRef.markForCheck();
  }

  #updatePaymentMethodsAvailable(): void {
    const { display, methods } = this.#boxOfficePaymentMethodsService.getAvailableMethods(this.onsiteSetupSelected);
    this.paymentTypes = methods;
    this.paymentMethodDisplay.clear();
    display.forEach((methodDisplay, paymentType) => this.paymentMethodDisplay.set(paymentType, methodDisplay));
    this.showCommonPaymentButton = this.paymentTypes?.length > this.maxPaymentMethodInOneStep;
  }

  #updateTicketTypes(): void {
    this.ossUpdateSessionAvailabilitySummary();
    if (this.selectedSession && this.selectedSession.selectedDatetime !== null) {
      this.ticketTypes = [];
      this.selectedSession.selectedDatetime.sessionAvailabilityList.forEach(session => {
        this.ticketTypes.push(
          new TicketType(
            session.name,
            session.sessionType?.id,
            session.minimumTicketsAllowedPerBooking,
            session.getMaximumSelectableTickets(this.canOverrideCapacities),
            !this.#isSessionDisabledConsideringOverride(session),
            session.isHidden,
            session.availableTickets,
            session.ticketPrice,
            session.surchargePerTicket,
            session.id,
            session.sessionType.reservationRestriction,
            session.sessionType.ticketReceiptLabel,
            session.sessionType.isAddOn,
            session.details,
            session.sessionType.isShopProduct ?? false,
            undefined,
            undefined,
            session.sessionType.ticketSelectorStepQuantity ?? 1,
            false,
            undefined,
            undefined,
            undefined,
            session.sessionType.tileColor,
          ),
        );
      });
    } else {
      this.ticketTypes = this.sessionAvailabilitySummary.getTicketTypes();
    }

    const existingShopProductsInCart = this.productTypes.filter(productType => {
      const isInCart = this.selectedTicketsBySessionId.has(productType.sessionId?.toString());
      return productType.isShopProduct && isInCart;
    });

    const newProductTypes = this.sessionAvailabilitySummary.getProductTypes();

    this.productTypes = [...existingShopProductsInCart];
    newProductTypes.forEach(newProduct => {
      if (!this.productTypes.some(existing => existing.sessionId === newProduct.sessionId)) {
        this.productTypes.push(newProduct);
      }
    });
  }

  #validateCashCalculator(cashReceived: { amount: number } | null): Observable<{ amount: number } | null> {
    if (this.paymentType() === PaymentType.CASH && !cashReceived) {
      this.#resetPaymentState();
      return EMPTY;
    }
    return of(cashReceived);
  }

  #getDatesAndSessionsAvailabilityOverride(
    query: GetAvailableSessionQuery,
    useCacheEnabled: boolean,
    onlyGetSessions: boolean,
  ): Observable<BaseResponse<SessionAvailabilitySummary>> {
    const needsUpdateAvailabilityFromDate = !this.selectedAvailabilityFromDate && this.showDateSelectorFrom;

    const getDatesAvailability: Observable<BaseResponse<DatesAvailabilityResponse> | null> =
      needsUpdateAvailabilityFromDate || !onlyGetSessions
        ? this.sessionAvailabilityService.getDatesAvailability(query, this.canApplyAvailabilityPerformance(), useCacheEnabled)
        : of(null);

    if (onlyGetSessions) {
      this.isLoadingDateSessions = true;

      return getDatesAvailability.pipe(
        mergeMap((datesResponse: BaseResponse<DatesAvailabilityResponse> | null) => {
          if (needsUpdateAvailabilityFromDate) {
            this.selectedAvailabilityFromDate = datesResponse?.data?.dates?.entries()?.next()?.value?.[0] ?? null;
          }

          query.includeOngoing = this.getIncludeOngoingForSessionsForDate();

          return this.sessionAvailabilityService
            .getSessionAvailableForDate(
              { ...query, utc: undefined },
              this.overrideMaximumTickets as number | undefined,
              this.minutesBeforeToExpire as number | undefined,
              useCacheEnabled,
              this.#useCacheSwrEnabled,
            )
            .pipe(tap(() => (this.isLoadingDateSessions = false)));
        }),
      ) as Observable<BaseResponse<SessionAvailabilitySummary>>;
    }

    this.regularSessionAvailabilitySummaryByDateList = [];
    this.isLoadingDateSessions = true;
    return getDatesAvailability.pipe(
      mergeMap((datesResponse: BaseResponse<DatesAvailabilityResponse> | null) => {
        const dates = this.getDatesAvailability(datesResponse?.data?.dates);

        this.nextAvailableDate = datesResponse?.data?.nextAvailableDate ?? '';
        const datesAvailability = dates?.size ? Array.from(dates.values()) : [];
        this.datesAvailability = this.datesAvailability.concat(datesAvailability);

        if (datesAvailability.length === 0) {
          this.isLoadingDateSessions = false;
          const emptyResponse = new SessionAvailabilitySummary(
            this.timezone,
            this.allowMultiSessionPurchase,
            this.hasExplodePipe,
            [],
            this.nextAvailableDate,
            this.sessionSelectorType,
          );
          return of(new BaseResponse(emptyResponse, null));
        }
        this.selectedDateAvailability = datesAvailability[0];
        const nextDate = moment(datesAvailability[0].date).toDate();
        const fromDate = new Date(Date.UTC(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()));
        this.fromDate = fromDate;
        query.fromDate = fromDate;
        query.includeOngoing = this.getIncludeOngoingForSessionsForDate();

        if (needsUpdateAvailabilityFromDate) {
          this.selectedAvailabilityFromDate = datesResponse?.data?.dates?.entries()?.next()?.value?.[0] ?? null;
        }

        return this.sessionAvailabilityService
          .getSessionAvailableForDate(
            { ...query, utc: undefined },
            this.overrideMaximumTickets as number | undefined,
            this.minutesBeforeToExpire as number | undefined,
            useCacheEnabled,
            this.#useCacheSwrEnabled,
          )
          .pipe(tap(() => (this.isLoadingDateSessions = false)));
      }),
    ) as Observable<BaseResponse<SessionAvailabilitySummary>>;
  }

  #resetPreservingCartAfterRender(): void {
    queueMicrotask(() => {
      if (this.hasMultiplanSeatingFlowContext) {
        const currentPlanId = this.selectedPlan?.id ?? 0;
        if (currentPlanId > 0) {
          if (this.nonConfirmedCart) {
            const activeSessionIds = new Set(
              [...this.selectedTicketsBySessionId.keys()].map(id => parseInt(id, 10)).filter((id): id is number => !Number.isNaN(id)),
            );
            const filteredNonConfirmed = CartUtil.removeSessionsByMainPlanId(
              this.nonConfirmedCart,
              currentPlanId,
              activeSessionIds.size > 0 ? activeSessionIds : undefined,
            );
            this.nonConfirmedCart = filteredNonConfirmed;
          }
          if (this.cart?.id && this.cartService && this.partner) {
            const removeQuery: RemovePlanFromCartQuery = {
              cart: this.cart,
              cartId: this.cart.id,
              mainPlanId: currentPlanId,
              partnerId: this.partner.id,
              useSessionItemLines: true,
            };
            this.cartService
              .removePlanFromCart(removeQuery)
              .pipe(takeUntilDestroyed(this.#destroyRef))
              .subscribe(response => {
                this.cart = response.data ?? null;
                if (this.cart) {
                  this.cartDetailService?.setCart(this.cart);
                } else {
                  this.cartDetailService?.clearCart();
                }
                this.changeDetectorRef.markForCheck();
              });
          }
        }
        this.isPreservingCart = true;
      } else {
        this.isPreservingCart = false;
      }
    });
  }

  #efrGuardPurchaseContext(): EfrGuardPurchaseContext {
    return {
      cashRegisterId: this.activeShift()?.cashRegister,
      hasActiveShift: this.activeShift() != null,
      partnerId: this.partner?.id,
      placeId: this.onsiteSetupSelected?.place?.id?.toString(),
    };
  }

  #guardPurchaseAfterShiftValidation(checkedCashRegisterId: string | undefined): Observable<boolean> {
    if (this.activeShift()?.cashRegister === checkedCashRegisterId) {
      return of(true);
    }
    return this.#efrHealthCheckModalService.guardPurchaseAfterShiftStart(
      this.onsiteSetupSelected?.place?.country_iso_code_2,
      this.#efrGuardPurchaseContext(),
    );
  }

  #guardFiscalTaxes(cart: Cart | null): Observable<boolean> {
    return this.#fiscalTaxGateService.guardPurchase(this.onsiteSetupSelected?.place?.country_iso_code_2, this.partner?.id, cart?.id);
  }

  #guardFiscalComplianceAfterShiftValidation(checkedCashRegisterId: string | undefined, cart: Cart | null): Observable<boolean> {
    if (this.activeShift()?.cashRegister === checkedCashRegisterId) {
      return of(true);
    }
    return this.#guardFiscalCompliance(cart);
  }

  #guardFiscalCompliance(cart: Cart | null): Observable<boolean> {
    const activeShift = this.activeShift();
    return this.#fiscalComplianceBlockGuardService.guardPurchase({
      channelId: this.channelId,
      complianceCheckoutEnabled: activeShift?.complianceCheckoutEnabled,
      hasActiveShift: activeShift !== null,
      onsiteSetupId: this.onsiteSetupSelected?.id,
      partnerId: this.partner.id,
      planIds: [...new Set([this.plan?.id, ...collectPlanIdsFromCart(cart)])].filter((planId): planId is number => planId !== undefined),
    });
  }

  #validateShift(): Observable<void> {
    const hasCompatibleActiveShift = this.currency === this.activeShift()?.currency;

    if (!this.hasShiftsEnabled || hasCompatibleActiveShift) {
      return of(void 0);
    }

    if (!this.activeShift()) {
      const shiftIsMandatory = this.onsiteSetupSelected.shift_strategy === ShiftStrategyEnum.mandatory;
      if (shiftIsMandatory) {
        return this.#askUserOpenMandatoryShift().pipe(
          mergeMap(confirmed => (confirmed ? this.activeShiftOneStepReady$.asObservable() : EMPTY)),
        );
      }
      return this.#askUserContinueWithoutShift().pipe(
        mergeMap(confirmed => (confirmed ? of(void 0) : this.activeShiftOneStepReady$.asObservable())),
      );
    }

    if (!hasCompatibleActiveShift) {
      return this.#askUserCloseCurrentShift().pipe(mergeMap(() => EMPTY));
    }

    return EMPTY;
  }
}
