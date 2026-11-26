import type { EffectRef, Signal, WritableSignal } from '@angular/core';

import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import type { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import type { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import type { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import type { ActiveShift } from '@fz-original/app/modules/box-office/ticketing/components/start-end-shift/start-end-shift.component';
import type { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import type { BaseResponse } from '@fz-original/app/shared/models/base-response';
import type { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import type { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import type { Money } from '@fz-original/app/shared/models/money.model';
import type { AccessTicket } from '@fz-original/app/shared/models/order/access-ticket.model';
import type { Order } from '@fz-original/app/shared/models/order/order.model';
import type { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import type { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import type { ProductSession } from '@fz-original/app/shared/models/product-sessions-summary/product-sessions-summary-response.model';
import type { SeatingMapState } from '@fz-original/app/shared/models/seating-map/seating-map.model';
import type { DateAvailability } from '@fz-original/app/shared/models/session-availability/date-availability.model';
import type { RegularSessionAvailabilitySummaryByDate } from '@fz-original/app/shared/models/session-availability/regular-session-availability-summary-by-date.model';
import type { Seat } from '@fz-original/app/shared/models/session-availability/seat.model';
import type {
  SessionAvailabilitySummaryByDate,
  SessionAvailabilitySummaryByDateType,
} from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-date.model';
import type { SessionAvailabilitySummary } from '@fz-original/app/shared/models/session-availability/session-availability-summary.model';
import type { SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';
import type { MaxLimitTicketFieldEnum } from '@fz-original/app/shared/models/ticket-type/max-limit-ticket-field.enum';
import type { OngoingMultiDayTicketGroup } from '@fz-original/app/shared/models/ticket-type/ongoing-multi-day-ticket-group.model';
import type { TicketType } from '@fz-original/app/shared/models/ticket-type/ticket-type.model';
import type { SearchFilter } from '@fz-original/app/shared/search-bar/models/search-filter.model';
import type { FreeSeatResponse } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/free-seat-response.model';
import type { SeatInfo } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seat-info.model';
import type { SeatingProviderEnum } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-provider.enum';
import type { SeatingSelectorFinalizedResponse } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-selector-finalized-response.model';
import type { DiscardCartQuery } from '@fz-original/app/shared/services/cart/discard-cart-query';
import type { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import type { SessionSelectorType } from '@fz-original/app/shared/services/session-availability/session-selector-type.enum';
import type { BehaviorSubject, Observable, ReplaySubject, Subject } from 'rxjs';

import { type TimeslotActivationFromCartPayload } from '../../one-stop-shop/components/oss-cart-detail/oss-cart-detail.component';
import { type OssOnsiteSetupModalData } from '../../one-stop-shop/containers/oss-onsite-setup-modal/oss-onsite-setup-modal.model';
import { type OssPlanSelectionModalData } from '../../one-stop-shop/containers/oss-plan-selection-modal/oss-plan-selection-modal.model';
import {
  type HierarchyNavigationLevel,
  type OssCustomTabData,
  type OssCustomTilesData,
  type OSSOnsiteSetupConfig,
  type OSSPlanConfig,
  type OssTab,
  type UpdateTicketTypeCounter,
} from '../../one-stop-shop/models';
import { type ModifiedOrderMode } from '../../one-stop-shop/models/oss-modified-order-mode.model';
import { type PosCartSource } from '../../one-stop-shop/tracking/events/pos-cart-item-quantity-change.event';
import { type PosAvailabilityUiHandlers } from '../services/availability/pos-availability.service';
import { type PosSplitPaymentCancellationError } from '../services/purchase/pos-purchase.service';
import { type PosLinkedDeviceRequest, type PosSquareConnectionRequest, type PosTabUiHandlers } from '../services/setup/pos-setup.service';
import { type TicketTypeCounterSelection } from '../services/ticket-selection/pos-ticket-selection.service';

/**
 * The ticketing contract behind {@link TICKETING_STRATEGY}: the **union of every `core.*` binding in
 * `point-of-sale.component.html` and every `this.core.*` access in `PointOfSaleComponent`**. It is
 * deliberately wide — the token is the component's only injection path, so a member the template or
 * the component reaches for and that is missing here breaks the moment a second flow (invitation,
 * reschedule, kiosk, reservation) provides its own implementation.
 *
 * **Rule when adding a member to the facade:** if the component or its template consumes it, declare
 * it here too. ⚠️ Only the component-class half is compiler-enforced — `ng build` uses
 * `src/tsconfig.app.json`, which has no `angularCompilerOptions`, so templates are never type-checked.
 * Verify the template half with the binding-coverage `comm` check in this module's `AGENTS.md`.
 *
 * Members mirror the facade's shape exactly: get-only accessors are `readonly`, get/set pairs are
 * mutable, `Map`s stay `Map`s, `Subject`s stay `Subject`s. No signal conversions in this iteration.
 */
export interface TicketingStrategy {
  readonly activeCustomTab: Signal<OssCustomTabData | null>;
  readonly activeCustomTabIndex: WritableSignal<number>;
  readonly activeOnsiteSetup: WritableSignal<OnsiteSetup | null>;
  readonly activeOssPlanConfig: WritableSignal<OSSPlanConfig | null>;
  readonly activePlan: WritableSignal<Plan | null>;
  readonly activeShift: WritableSignal<ActiveShift | null>;
  activeTabType: OssTab;
  readonly addCounterSessionId: Subject<number>;
  readonly additionalCouponModalRequested$: Observable<void>;
  allowMultiSessionPurchase: boolean;
  allowMultiTimeSlotSelection: boolean;
  readonly availablePlans: WritableSignal<Plan[]>;
  readonly availablePlansById: Signal<Map<number, Plan>>;
  readonly availableTabs: WritableSignal<OssTab[]>;
  readonly canOverrideCapacities: boolean;
  cart: Cart | null;
  readonly cartHasEffectiveDiscount: boolean;
  readonly cartTotalMoney: Money;
  readonly cartTotalMoneyWithoutCoupon: Money;
  channel: Channel;
  channelId: string;
  readonly closeCartDetailWhenEmpty$: Observable<void>;
  readonly closeSearchRequested$: Observable<void>;
  readonly combinedCoupons: Coupon[];
  readonly coupon: Coupon | null;
  readonly couponCodeApplied$: Observable<boolean>;
  readonly couponError: BehaviorSubject<Error | null>;
  readonly couponRemainingBalance: Money | null;
  currency: string | null;
  readonly currentNumberOfTickets: number;
  readonly currentSelectedDatetime: string | null;
  readonly customTabHasTilesData: Signal<boolean[]>;
  readonly customTabHierarchyLevels: Signal<(HierarchyNavigationLevel | null)[]>;
  readonly customTabIcons: Signal<IconProp[]>;
  readonly customTabNames: Signal<string[]>;
  readonly customTileSessionAvailabilityMaps: Signal<(Map<number, { isUnavailable: boolean }> | null)[]>;
  datesAvailability: Array<DateAvailability>;
  disableAddSessionsToCartByCapacity: boolean;
  readonly displayedDeviceId: Signal<string | null>;
  readonly displayedOnsiteSetup: Signal<string | null>;
  readonly displayedOnsiteSetupPlace: Signal<string | null>;
  displayedSessionType: SessionAvailabilitySummaryByDateType;
  readonly effectiveCombinedCoupon: Coupon | null;
  error: boolean;
  errorObject: unknown | null;
  filters: SearchFilter;
  filtersSelected: boolean;
  forceDisableIncreaseCounter: boolean;
  readonly hasActivePlanSelected: Signal<boolean>;
  hasExplodePipe: boolean;
  readonly hasFiscalActions: Signal<boolean>;
  readonly hasProductCatalog: WritableSignal<boolean>;
  hasResult: boolean;
  hasSeatsSelected: boolean;
  hasShiftsEnabled: boolean;
  readonly includeTimeSlotCapacity: boolean;
  readonly isDualScreenStoragePresent: Signal<boolean>;
  readonly isInOverrideZone: boolean;
  readonly isLinkDeviceButtonVisible: Signal<boolean>;
  isLoadingCart: boolean;
  isLoadingDates: boolean;
  isLoadingDateSessions: boolean;
  readonly isLoadingNewSearch: WritableSignal<boolean>;
  readonly isLoadingProductCatalog: WritableSignal<boolean>;
  isLoadingSessions: boolean;
  readonly isNewPaymentFlowActive: Signal<boolean>;
  readonly isPaymentsMenuConfirmButtonEnabled: Signal<boolean>;
  readonly isProductCatalogLoaded: WritableSignal<boolean>;
  readonly isReleaseTicketsSheetOpen: WritableSignal<boolean>;
  readonly linkedDeviceSelectorRequests$: Observable<PosLinkedDeviceRequest>;
  locale: string;
  manageAsFreeSeatingMap: boolean;
  maxLimitTicketField: MaxLimitTicketFieldEnum;
  readonly modifiedOrder: WritableSignal<Order | undefined>;
  readonly modifiedOrderBannerTitleKey: Signal<string>;
  readonly modifiedOrderMode: Signal<ModifiedOrderMode | undefined>;
  readonly modifyOrderPaymentCart: WritableSignal<Cart | null>;
  nextAvailableDate: string;
  nonConfirmedCart: Cart | null;
  ongoingMultiDayTicketGroups: OngoingMultiDayTicketGroup[];
  onsiteSetupSelected: OnsiteSetup;
  readonly onsiteSetupSelectorRequests$: Observable<OssOnsiteSetupModalData>;
  partner: Partner | null;
  readonly paymentInProgress: boolean;
  readonly paymentType: WritableSignal<PaymentType | null>;
  readonly paymentTypes: PaymentType[];
  plan: Plan | null;
  readonly planSelectorRequests$: Observable<OssPlanSelectionModalData>;
  productSessions: SessionAvailability[];
  productTypes: TicketType[];
  regularSessionAvailabilitySummaryByDateList: RegularSessionAvailabilitySummaryByDate[];
  readonly releaseTicketsAddedCount: WritableSignal<number>;
  readonly releaseTicketSeats: WritableSignal<AccessTicket[]>;
  readonly releaseTicketSelections: WritableSignal<boolean[]>;
  readonly releaseTicketsRequiredCount: WritableSignal<number>;
  readonly releaseTicketsSelectedCount: Signal<number>;
  readonly scannedCouponCode: BehaviorSubject<string | null>;
  readonly scrollToCartItem$: Observable<number>;
  readonly seatingFullscreenButtonIcon: Signal<IconProp>;
  seatingHoldTokensBySessionId: Map<string, string>;
  seatingMapState: SeatingMapState | null;
  seatingMapUrl: string | null;
  seatingProvider: SeatingProviderEnum;
  seatingToken: string | null;
  selectedAvailabilityFromDate: string | null;
  selectedDateAvailability: DateAvailability;
  readonly selectedPlace: SelectOption;
  readonly selectedPlan: SelectOption;
  selectedSession: SessionAvailabilitySummaryByDate | null;
  selectedTicketsBySessionId: Map<string, number>;
  selectedTicketsBySessionType: Map<string, number>;
  selectedTicketsSeatsBySessionId: Map<string, SeatInfo[]>;
  sessionAvailabilitySummary: SessionAvailabilitySummary | null;
  /** Emits once per resolved availability fetch. Intentionally no `$` suffix — the template binds this name. */
  readonly sessionAvailableReady: ReplaySubject<void>;
  sessionSelectorType: SessionSelectorType;
  readonly setupBootstrap$: Observable<OnsiteSetup>;
  readonly shiftMismatch$: Observable<ActiveShift>;
  shouldRestoreToBeginning: boolean;
  showCartDetails: boolean;
  readonly showCommonPaymentButton: boolean;
  showDateSelectorFrom: boolean;
  readonly showOnlyTotalInPriceViewer: boolean;
  showPaymentsInLateral: boolean;
  readonly splitPaymentCancellationError$: Observable<PosSplitPaymentCancellationError>;
  readonly squareConnectionSelectorRequests$: Observable<PosSquareConnectionRequest>;
  readonly stateReset$: Observable<void>;
  ticketTypes: TicketType[];
  readonly ticketTypesForAddonsTab: TicketType[];
  timezone: string;
  readonly tourInitializationRequested$: Observable<void>;
  readonly updateTicketTypeCounter: Subject<UpdateTicketTypeCounter>;
  readonly useCacheEnabled: boolean;

  addCustomTileSessionsToTicketTypes(customTilesData: OssCustomTilesData): void;
  addProductSessionsByCustomTabsProductSessions(customTilesData: OssCustomTilesData): void;
  addProductSessionToCart(productSession: ProductSession, skipPosCartTracking?: boolean): void;
  addSessionsToCart(): void;
  addSessionsToCartIsDisabled(): boolean;
  addUnitBySessionId(sessionId: number): void;
  applyCouponDiscountOneStep(code: string, lazyCouponType?: string | null): void;
  applyCouponOneStep$(code: string, lazyCouponType?: string | null): Observable<void>;
  canAddMoreCoupons(): boolean;
  cancelModifyOrderPayment(): void;
  cartHasItems(): boolean;
  clearCart(): void;
  clickOnPayOneStep(paymentType?: PaymentType, trackSelectPayment?: boolean): void;
  confirmModifyOrder(): void;
  confirmModifyOrderIsDisabled(): boolean;
  confirmSeating(data?: SeatingSelectorFinalizedResponse): void;
  continueRestore(): void;
  createOrUpdateCart(): Observable<BaseResponse<Cart>>;
  /** Guard/unsaved-changes accept path: clears local references and discards the server cart. */
  discardCartBeforeNavigation(): Observable<void>;
  finishSeating(): void;
  generateFreeSeatingMap(): void;
  getButtonImageUrl(paymentType: PaymentType): string | null;
  getButtonLabel(paymentType: PaymentType): string;
  getCardDisabledTooltip(paymentType: PaymentType): string | null;
  getCart(): Cart | null;
  getCurrentCart(): Cart | null;
  getDisabledPlanIdsForPlanSelectionModal(): number[];
  getModifyOrderPriceDifference(): Money | null;
  getOngoingMultiDaySelectedTicketTypeNames(): string[];
  /** `pagehide` keepalive path: the query to fire, or `null` when there is nothing to discard. */
  getUnloadDiscardCartQuery(): DiscardCartQuery | null;
  handleCouponModalClosed(): void;
  handleDisplayedSessionTypeChange(selectedSessionType: SessionAvailabilitySummaryByDateType): void;
  handleLinkedDeviceSelectorClosed(paymentConfiguration: PaymentConfiguration, deviceId: string | undefined): void;
  handlePlanSelectorClosed(config?: OSSPlanConfig): void;
  handlePlanSelectorClosedFromSlider(config?: OSSPlanConfig): void;
  handleProductScannedCode(code: string): void;
  handleSetupSelectorClosed(result?: OSSOnsiteSetupConfig): void;
  handleSetupSelectorClosedFromSlider(result?: OSSOnsiteSetupConfig): void;
  handleShowAvailabilityFromDateChange(selectedDateString: string): void;
  handleSquareConnectionSelectorClosed(paymentConfiguration: PaymentConfiguration, result: { deviceId: string | undefined } | null): void;
  initialise(): void;
  initialiseResolvedSetupEffects(): void;
  isButtonImageTintable(paymentType: PaymentType): boolean;
  isCouponCombinationUiActive(): boolean;
  isFullPaymentIntegratedAvailable(): boolean;
  isModifyOrderMode(): boolean;
  isTabDateDependant(tabIndex: number): boolean;
  loadMoreDays(daysWithActiveSession?: number): void;
  loadNewSearch(filters: SearchFilter, date?: Date): void;
  loadOneStepFreeSeatingMap(): void;
  loadQuickTilesByDateTime(datetime: string): void;
  modalCouponCodeOpened(): void;
  modalPreferredSessionSummary(): RegularSessionAvailabilitySummaryByDate | null;
  newSelectTicketCounter(
    ticketTypeCounter: TicketTypeCounterSelection,
    modifiedSessionIsShopProduct?: boolean,
    skipPosCartTracking?: boolean,
  ): void;
  onClearAllConfirmed(): void;
  onClearSelectionRequested(): void;
  onLinkDeviceButtonClick(): void;
  onReleaseTickets(): void;
  onTimeslotActivatedFromCart(payload: TimeslotActivationFromCartPayload): void;
  openAddAdditionalCouponModal(): void;
  openFullPaymentIntegrated(): void;
  openLateralPayments(): void;
  openPlanSelector(): void;
  openSetupSelector(): void;
  openSplitPaymentOptionsModal(): void;
  payModifyOrderDifference(paymentType?: PaymentType): void;
  payWithCardIsDisabled(paymentType: PaymentType): boolean;
  registerAvailabilityUiHandlers(handlers: PosAvailabilityUiHandlers): void;
  registerCartDetailViewHandlers(handlers: { clearAllCartItemsWithoutConfirmation: () => void }): void;
  registerResettableEffect(effectRef: EffectRef): void;
  registerSeatingViewHandlers(handlers: {
    finishSeating: () => void;
    releaseSeats: () => void;
    clearSeatingSelection?: () => void;
    hasSeatingView?: () => boolean;
    releaseSeatsByReference?: (seatReferences: string[]) => void;
  }): void;
  registerTabUiHandlers(handlers: PosTabUiHandlers): void;
  removeAppliedDiscount(): void;
  resetSecondScreenSeatingMapVisibility(): void;
  resolveDeepLinkSetup(): Observable<boolean>;
  resolveOnsiteSetup(onsiteSetupId?: string, venueId?: string): Observable<OnsiteSetup | null>;
  restoreToBeginning(): void;
  selectDate(dateAvailability: DateAvailability): void;
  selectedSessionHasSeating(): boolean;
  selectPaymentType(paymentType: PaymentType): void;
  selectSeats(seating: Seat): void;
  selectSession(selectedSession: SessionAvailabilitySummaryByDate): void;
  sessionHasSeating(sessionId: number): boolean;
  setTicketCounterHasErrors(hasErrors: boolean): void;
  toggleReleaseTicketSelection(index: number): void;
  toggleSecondScreenSeatingMapVisibility(): void;
  trackPosCartItemQuantityChange(opts: {
    newCount: number;
    previousCount: number;
    sessionId: number | string;
    source: PosCartSource;
  }): void;
  updateFreeMapMode(): void;
  updateSeatsInCart(data: FreeSeatResponse): void;
  updateSelectedTicket(sessionId: number, adding: boolean, seatInfo: SeatInfo): void;
  updateSessionIdCounter(event: UpdateTicketTypeCounter): void;
  updateTicketTypeFields(): void;
}
