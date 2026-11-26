import { computed, inject, Injectable, linkedSignal, signal, Signal, WritableSignal } from '@angular/core';

import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { ActiveShift } from '@fz-original/app/modules/box-office/ticketing/components/start-end-shift/start-end-shift.component';
import type { CheckoutFlowKind, CheckoutPreselectedMethod } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout.model';
import { ContactInformation } from '@fz-original/app/shared/components/contact-information/contact-information.component';
import { SelectDropdownCityOption } from '@fz-original/app/shared/dropdown/select-dropdown-city-option';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { SessionTypeDiscounts } from '@fz-original/app/shared/models/cart/session-type-discounts.model';
import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { AccessTicket } from '@fz-original/app/shared/models/order/access-ticket.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { SeatingMapState } from '@fz-original/app/shared/models/seating-map/seating-map.model';
import { DateAvailability } from '@fz-original/app/shared/models/session-availability/date-availability.model';
import { RegularSessionAvailabilitySummaryByDate } from '@fz-original/app/shared/models/session-availability/regular-session-availability-summary-by-date.model';
import {
  SessionAvailabilitySummaryByDate,
  SessionAvailabilitySummaryByDateType,
} from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-date.model';
import { SessionAvailabilitySummary } from '@fz-original/app/shared/models/session-availability/session-availability-summary.model';
import { SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';
import { contactInformationSelectorStep } from '@fz-original/app/shared/models/step/purchase-steps';
import { seatingSelectorStep, Step, ticketSelectorStep } from '@fz-original/app/shared/models/step/step.model';
import { MaxLimitTicketFieldEnum } from '@fz-original/app/shared/models/ticket-type/max-limit-ticket-field.enum';
import { OngoingMultiDayTicketGroup } from '@fz-original/app/shared/models/ticket-type/ongoing-multi-day-ticket-group.model';
import { TicketType } from '@fz-original/app/shared/models/ticket-type/ticket-type.model';
import { SearchFilter } from '@fz-original/app/shared/search-bar/models/search-filter.model';
import { SeatInfo } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seat-info.model';
import { SeatingProviderEnum } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { SessionSelectorType } from '@fz-original/app/shared/services/session-availability/session-selector-type.enum';
import { PaymentMethodDisplay } from '@fz-original/app/shared/utils/payment-method-display/payment-method-display.util';
import { type EntityId } from '@ngrx/signals/entities';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';

import { OssCustomTabData, OssCustomTilesData, OSSPlanConfig, OssTab, UpdateTicketTypeCounter } from '../../one-stop-shop/models';
import { ModifiedOrderMode } from '../../one-stop-shop/models/oss-modified-order-mode.model';
import {
  customTabIndexOf,
  toActiveTab,
  toOssTab,
  toPosTabKind,
  type PosActiveTab,
  type PosTabDescriptor,
} from '../models/store/pos-ticket-selector-store.model';
import { toOssCustomTabData } from '../services/ticket-selection/pos-legacy-custom-tab.adapter';
import { PosTicketSelectorStore } from '../store/pos-ticket-selector.store';

export interface ModifyOrderSeededProductLine {
  line: CartSession;
  maximum: number;
}

/**
 * Flat, logic-free holder for every piece of ticketing state the POS strategies share: plain mutable
 * fields, `Subject`s and `Map`s declared as-is, with no HTTP, business logic or `ChangeDetectorRef`.
 *
 * Signal members stay signals, but do not convert plain fields to signals here — that is the
 * iteration-2 seam.
 */
@Injectable()
export class PosTicketingState {
  // ───────────────────────────────────────────── availability ──────────────────────────────────────
  filters!: SearchFilter;
  filtersSelected = false;
  sessionAvailabilitySummary: SessionAvailabilitySummary | null = null;
  displayedSessionType: SessionAvailabilitySummaryByDateType = SessionAvailabilitySummaryByDateType.Regular;
  regularSessionAvailabilitySummaryByDateList: RegularSessionAvailabilitySummaryByDate[] = [];
  productSessions: SessionAvailability[] = []; // TODO rename to productSessionAvailabilities
  productTypes: TicketType[] = [];
  ticketTypes: TicketType[] = [];
  ongoingMultiDayTicketGroups: OngoingMultiDayTicketGroup[] = [];
  isLoadingSessions = true;
  isLoadingDates = false;
  isLoadingDateSessions = false;
  error = false;
  errorObject: unknown | null = null;
  locale!: string;
  plan: Plan | null = null;
  allowMultiSessionPurchase = false;
  allowMultiTimeSlotSelection = false;
  preselectNextUpcomingSession = false;
  hasExplodePipe = false;
  nextAvailableDate!: string;
  sessionSelectorType: SessionSelectorType = SessionSelectorType.BY_DATE_AND_TIME;
  selectedSession: SessionAvailabilitySummaryByDate | null = null;
  overrideMaximumTickets?: number | null = null;
  minutesBeforeToExpire: number | null = 0.5;
  currency: string | null = null;
  maxLimitTicketField = MaxLimitTicketFieldEnum.MAXIMUM;
  channel: Channel = Channel.BoxOffice;
  channelId: string = Channel.BoxOffice;
  selectedAvailabilityFromDate!: string | null;
  showDateSelectorFrom = true;
  hasResult = false;
  shouldRestoreToBeginning = false;
  date?: Date;
  readonly #partner: WritableSignal<Partner | null> = signal<Partner | null>(null);
  get partner(): Partner | null {
    return this.#partner();
  }
  set partner(value: Partner | null) {
    this.#partner.set(value);
  }
  isDefaultFilter!: boolean;
  timezone!: string;
  daysWithActiveSession = 8;
  includeSoldOutSessions!: boolean;
  fromDate!: Date;
  includeOngoing = true;
  isHidden!: boolean;
  includeTimeSlotCapacity = true;
  sessionTypeIds!: Array<number>;
  datesAvailability: Array<DateAvailability> = [];
  selectedDateAvailability!: DateAvailability;
  includeShopProducts = false;
  businessId: string | undefined;
  selectedCity!: SelectDropdownCityOption;
  selectedPlace!: SelectOption;
  selectedPlan!: SelectOption;
  /** Availability caching flags. */
  cacheTimeoutInSeconds = 0;
  useCacheEnabled = false;
  useCacheSwrEnabled = false;
  /** Emitted every time an availability fetch resolves. Name intentionally lacks the `$` suffix — template contract. */
  readonly sessionAvailableReady = new ReplaySubject<void>(1);
  readonly addCounterSessionId: Subject<number> = new Subject<number>();

  // ────────────────────────────────────────── ticket selection ─────────────────────────────────────
  readonly #selectionVersion = signal(0);
  readonly selectionVersion: Signal<number> = this.#selectionVersion.asReadonly();
  #selectedTicketsBySessionId = new Map<string, number>();
  #selectedTicketsBySessionType = new Map<string, number>();
  #selectedTicketsSeatsBySessionId = new Map<string, SeatInfo[]>();
  get selectedTicketsBySessionId(): Map<string, number> {
    return this.#selectedTicketsBySessionId;
  }
  set selectedTicketsBySessionId(value: Map<string, number>) {
    this.#selectedTicketsBySessionId = value;
    this.#selectionVersion.update(version => version + 1);
  }
  get selectedTicketsBySessionType(): Map<string, number> {
    return this.#selectedTicketsBySessionType;
  }
  set selectedTicketsBySessionType(value: Map<string, number>) {
    this.#selectedTicketsBySessionType = value;
    this.#selectionVersion.update(version => version + 1);
  }
  get selectedTicketsSeatsBySessionId(): Map<string, SeatInfo[]> {
    return this.#selectedTicketsSeatsBySessionId;
  }
  set selectedTicketsSeatsBySessionId(value: Map<string, SeatInfo[]>) {
    this.#selectedTicketsSeatsBySessionId = value;
    this.#selectionVersion.update(version => version + 1);
  }
  ticketCounterHasErrors = false;
  forceDisableIncreaseCounter = false;
  disableAddSessionsToCartByCapacity = false;
  canOverrideCapacities = false;
  isInOverrideZone = false;
  includeOverrideCapacity = false;
  readonly updateTicketTypeCounter: Subject<UpdateTicketTypeCounter> = new Subject<UpdateTicketTypeCounter>();
  /**
   * Fire-and-forget stream (two-mechanism rule): emitted from `#checkAndCloseCartIfEmpty()`.
   * The cart panel flag (`isCartDetailOpened`) is component-local UI, so the component subscribes
   * and closes the panel when the cart is empty.
   */
  readonly closeCartDetailWhenEmpty$ = new Subject<void>();

  // ─────────────────────────────────────────────── cart ────────────────────────────────────────────
  cart: Cart | null = null;
  nonConfirmedCart: Cart | null = null;
  isLoadingCart = false;
  showCartDetails = false;
  isPreservingCart = false;
  cartTotalMoney!: Money;
  cartTotalMoneyWithoutCoupon!: Money;
  cartHasEffectiveDiscount = false;
  multiPlanCartEnabled = false;
  /**
   * Selection the real-time cart with `cartId` was created from (`PosCartService.createCart`); `null` on
   * classic paths. Carries the cart id so a `cart` written by another path never matches a stale key.
   */
  realTimeCartSelectionKey: { cartId: string; selectionKey: string } | null = null;
  lastCartWrite: { cart: Cart; selectionKey: string } | null = null;
  readonly updateCartTotalTrigger$ = new Subject<void>();
  /** Wizard steps: `currentStep` gates cart-vs-seating update paths (see `createOrUpdateCart`). */
  ticketSelectorStep: Step = ticketSelectorStep;
  seatingSelectorStep: Step = seatingSelectorStep;
  lastSelectorStep: Step = contactInformationSelectorStep;
  currentStep: Step = ticketSelectorStep;

  // ────────────────────────────────────────────── seating ──────────────────────────────────────────
  seatingToken: string | null = null;
  seatingMapUrl: string | null = null;
  seatingMapState: SeatingMapState | null = null;
  /**
   * A real-time map kept mounted across a date change, waiting for the next free-map load to
   * re-initialise it with the new session. The template makes the map inert while it is set.
   */
  isRealTimeMapAwaitingSession = false;
  hasSeatsSelected = false;
  manageAsFreeSeatingMap = false;
  seatingProvider: SeatingProviderEnum = SeatingProviderEnum.SEATSIO;
  seatingHoldTokensBySessionId = new Map<string, string>();
  /** Not `readonly`: `handleCartContent` completes and replaces it per free-map confirmation. */
  confirmSeatingMap$ = new ReplaySubject<void>(1);
  /** Set when a seating map load succeeds; used to skip redundant reloads on tab switches, not on timeslot/pool change. */
  lastSeatingMapLoadContext: { datetime: string; poolId: number } | null = null;
  isReadyForSeatReleasePayment = false;

  // ───────────────────────────────────────────── purchase ──────────────────────────────────────────
  paymentType: WritableSignal<PaymentType | null> = signal<PaymentType | null>(null);
  paymentTypes: PaymentType[] = [];
  paymentConfiguration: PaymentConfiguration | null = null;
  /**
   * Cross-domain: the purchase pipeline parks the payment
   * the device guard interrupted and the device-pairing flow in `PosSetupService`
   * consumes it once a terminal is paired.
   */
  pendingPaymentType: PaymentType | null = null;
  paymentInProgress = false;
  payPipelineInFlight = false;
  isCheckoutModalFlow = false;
  requestedCheckoutFlow: CheckoutFlowKind = 'fullCheckout';
  requestedCheckoutMethod: CheckoutPreselectedMethod | null = null;
  cashModalMandatory = false;
  cashCalculatorCashReceived: number | null = null;
  customer: Customer | null = null;
  contactInformation: Partial<ContactInformation> = {};
  contactFields: string[] = ['email', 'firstName', 'lastName'];
  emailField = 'email';
  phoneField = 'phoneNumber';
  showEmailContactInformation = true;
  showPhoneNumberContactInformation = false;
  contactInformationCollectedForCoupon = false;
  showCommonPaymentButton = false;
  showPaymentsInLateral = false;
  showOnlyTotalInPriceViewer = false;
  logErrorModal = true;
  readonly maxPaymentMethodInOneStep = 3;
  totalPrintViewerTimeout: ReturnType<typeof setTimeout> | undefined;
  cartRecoveryInProgress = false;
  modifyOrderNewOrderId: number | null = null;
  modifiedOrder: WritableSignal<Order | undefined> = signal<Order | undefined>(undefined);
  /** In-place payment cart for the difference of a `modify_order` reschedule (GAME-970). */
  modifyOrderPaymentCart: WritableSignal<Cart | null> = signal<Cart | null>(null);
  isModifyOrderCartSeeded = false;
  /** Each F&B line the seeded modification cart registered a row for, as the order sold it, with the row's raised ceiling. */
  modifyOrderSeededProductLines = new Map<number, ModifyOrderSeededProductLine>();
  /** The session type discount the modified order carries into every rebuild of its cart. */
  readonly modifyOrderSessionTypeDiscounts: WritableSignal<SessionTypeDiscounts | null> = signal<SessionTypeDiscounts | null>(null);
  /** The entry plan comes from the deep link and legitimately differs from `order.planId`, so a latch is the only answer. */
  modifyOrderPlanChangedByOperator = false;
  /** The first plan a modification resolves to. What "still on another plan" is measured against. */
  modifyOrderEntryPlanId: number | null = null;
  /** Broader than the latch above: a place-only move leaves the order's session behind just the same. */
  modifyOrderSearchMovedByOperator = false;
  modifyOrderFlowAborted = false;
  reservationSettlementSeededCartId: string | null = null;
  isReservationSettlementRejected: WritableSignal<boolean> = signal<boolean>(false);
  isReservationSettlementMismatch: WritableSignal<boolean> = signal<boolean>(false);
  /** Why the mismatch banner refused the payment: the cart on screen, or the amount the server would charge. */
  reservationSettlementMismatchReason: WritableSignal<'amount' | 'cart'> = signal<'amount' | 'cart'>('cart');
  /** Backed by `toSignal()` over the `mode` query param — stays a signal. */
  modifiedOrderMode: WritableSignal<ModifiedOrderMode | undefined> = signal<ModifiedOrderMode | undefined>(undefined);
  isReleaseTicketsSheetOpen: WritableSignal<boolean> = signal<boolean>(false);
  releaseTicketSeats: WritableSignal<AccessTicket[]> = signal<AccessTicket[]>([]);
  releaseTicketSelections: WritableSignal<boolean[]> = signal<boolean[]>([]);
  releaseTicketsRequiredCount: WritableSignal<number> = signal<number>(0);
  releaseTicketsAddedCount: WritableSignal<number> = signal<number>(0);
  readonly paymentMethodDisplay = new Map<PaymentType, PaymentMethodDisplay>();

  // ───────────────────────────────────────── coupons / gift cards ──────────────────────────────────
  coupon: Coupon | null = null;
  readonly couponCodeApplied = new BehaviorSubject<boolean>(false);
  readonly couponCodeApplied$ = this.couponCodeApplied.asObservable();
  readonly couponError: BehaviorSubject<Error | null> = new BehaviorSubject<Error | null>(null);
  combinedCoupons: Coupon[] = [];
  couponCombinationSubtotal = 0;
  couponRemainingBalance: Money | null = null;
  effectiveCombinedCoupon: Coupon | null = null;
  showCouponOneStep = false;
  lastPromoCodeInModal = '';
  hadCouponApplyErrorInModal = false;
  /**
   * Lives here rather than on the component because
   * the scanner routes scanned codes to the coupon modal while it is open.
   */
  hasModalCouponCodeOpened = false;
  /**
   * Fire-and-forget request for the additional-gift-card modal. The modal stays open across
   * several attempts, so it is a stream (two-mechanism rule), not a `PosUiPortService` step: the
   * component opens `CouponCodeSelectorComponent` and feeds codes back through
   * `PosCouponsService.applyCouponOneStep$`.
   */
  readonly additionalCouponModalRequested$ = new Subject<void>();

  // ──────────────────────────────────────────────  setup ──────────────────────────────────────────
  onsiteSetupSelected!: OnsiteSetup;
  activeOnsiteSetup: WritableSignal<OnsiteSetup | null> = signal<OnsiteSetup | null>(null);
  activeOssPlanConfig: WritableSignal<OSSPlanConfig | null> = signal<OSSPlanConfig | null>(null);
  activePlan: WritableSignal<Plan | null> = signal<Plan | null>(null);
  availablePlans: WritableSignal<Plan[]> = signal<Plan[]>([]);
  /** Every on-sale plan before prioritised filtering; the modify-order deep link resolves against it. */
  onSalePlans: Plan[] = [];
  hasProductCatalog: WritableSignal<boolean> = signal(false);
  isProductCatalogLoaded: WritableSignal<boolean> = signal(false);
  isLoadingProductCatalog: WritableSignal<boolean> = signal<boolean>(false);
  isLoadingNewSearch: WritableSignal<boolean> = signal<boolean>(true);
  readonly #ticketSelector = inject(PosTicketSelectorStore);
  readonly #customTabInnerSignals = new Map<string, WritableSignal<OssCustomTabData | null>>();
  customTabSignals: WritableSignal<WritableSignal<OssCustomTabData | null>[]> = linkedSignal(() =>
    this.#ticketSelector.customTabIds().map(setupId => this.#customTabSignalFor(String(setupId))),
  );
  activeCustomTabIndex: WritableSignal<number> = linkedSignal<{ activeTab: PosActiveTab; customTabIds: readonly EntityId[] }, number>({
    source: computed(() => ({ activeTab: this.#ticketSelector.activeTab(), customTabIds: this.#ticketSelector.customTabIds() })),
    computation: ({ activeTab, customTabIds }, previous) => {
      if (customTabIds.length === 0) {
        return 0;
      }

      return activeTab.kind === 'custom' ? customTabIndexOf(customTabIds, activeTab) : (previous?.value ?? 0);
    },
  });
  get activeTabType(): OssTab {
    return toOssTab(this.#ticketSelector.activeTab().kind);
  }
  set activeTabType(value: OssTab) {
    const kind = toPosTabKind(value);
    const tabs = this.#ticketSelector.availableTabs();
    const index = tabs.findIndex((tab: PosTabDescriptor) => tab.kind === kind);

    this.#ticketSelector.selectTab(index === -1 ? toActiveTab(tabs, 0).index : index);
  }
  availableTabs: WritableSignal<OssTab[]> = linkedSignal(() =>
    this.#ticketSelector.availableTabs().map((tab: PosTabDescriptor) => toOssTab(tab.kind)),
  );
  preservedCustomTabTilesData: OssCustomTilesData | null = null;
  pendingSetupPreselection?: { onsiteSetupId?: string; venueId?: string };
  isDateChangeInProgress = false;
  preferredCartDatetimeAfterDateChange: string | null = null;

  // ────────────────────────────────────── secondary attraction selection ───────────────────────────
  readonly selectedSecondaryPlanIds = linkedSignal<number | undefined, ReadonlySet<number>>({
    source: () => this.activePlan()?.id,
    computation: () => new Set<number>(),
  });

  isModifyOrderTimeSlotApplied = false;
  skipModifyOrderPayWarningOnce = false;
  tileAddSessionId: number | null = null;
  hasShiftsEnabled = false;

  // ─────────────────────────────────────────────── shift ──────────────────────────────────────────
  activeShift: WritableSignal<ActiveShift | null> = signal<ActiveShift | null>(null);
  activeShiftReady = false;
  readonly activeShiftReady$: Subject<ActiveShift> = new Subject<ActiveShift>();
  readonly activeShiftOneStepReady$: Subject<void> = new Subject<void>();
  /** Fire-and-forget stream: the component opens the end-shift modal (two-mechanism rule). */
  readonly shiftMismatch$ = new Subject<ActiveShift>();

  // ───────────────────────────────────────── second screen ────────────────────────────────────────
  /**
   * Set to `false` once a payment settles. Unused as a gate in this flow — see
   * `PosSecondScreenService.resetToStandBy`.
   */
  shouldResetOboSecondScreenToStandBy = true;
  /**
   * Whether the second screen currently mirrors the seating map full-screen. Was already a
   * signal upstream; it moves into the state because `PosSecondScreenService` owns the deduped
   * visibility sync that the component used to perform, and drives the eye-button icon through
   * `seatingFullscreenButtonIcon`.
   */
  isSeatingMapFullscreen: WritableSignal<boolean> = signal<boolean>(false);

  // ─────────────────────────────────────────────  scanner ─────────────────────────────────────────
  readonly scannedCouponCode: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  /**
   * Fire-and-forget stream (two-mechanism rule): emitted from `PosScannerService` after a
   * scanned product landed in the cart. Scrolling is a `ViewChild` concern, so the component
   * subscribes.
   */
  readonly scrollToCartItem$ = new Subject<number>();

  #customTabSignalFor(setupId: string): WritableSignal<OssCustomTabData | null> {
    const cached = this.#customTabInnerSignals.get(setupId);

    if (cached !== undefined) {
      return cached;
    }

    const inner = linkedSignal<OssCustomTabData | null>(() =>
      toOssCustomTabData(
        this.#ticketSelector.customTabEntityMap()[setupId] ?? null,
        this.activeOnsiteSetup()?.custom_tabs?.find(customTab => customTab.id === setupId) ?? null,
      ),
    );
    this.#customTabInnerSignals.set(setupId, inner);

    return inner;
  }

  // ──────────────────────────────────────── derived (see AGENTS.md) ───────────────────────────────
  /**
   * Whether the mounted map sells in real time (OneBox basket, `state.is_real_time`). The one derived
   * member of this holder, recorded in AGENTS.md: it is not stored because every reset that tears the
   * map down already nulls `seatingMapState`, so the mode cannot outlive the map.
   */
  get isRealTimeSeating(): boolean {
    return this.seatingMapState?.is_real_time === true;
  }
}
