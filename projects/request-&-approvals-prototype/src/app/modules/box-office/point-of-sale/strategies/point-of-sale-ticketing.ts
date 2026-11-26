import { computed, EffectRef, inject, Injectable, Signal, WritableSignal } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { ActiveShift } from '@fz-original/app/modules/box-office/ticketing/components/start-end-shift/start-end-shift.component';
import { SelectDropdownCityOption } from '@fz-original/app/shared/dropdown/select-dropdown-city-option';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { AccessTicket } from '@fz-original/app/shared/models/order/access-ticket.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { ProductSession } from '@fz-original/app/shared/models/product-sessions-summary/product-sessions-summary-response.model';
import { SeatingMapState } from '@fz-original/app/shared/models/seating-map/seating-map.model';
import { DateAvailability } from '@fz-original/app/shared/models/session-availability/date-availability.model';
import { RegularSessionAvailabilitySummaryByDate } from '@fz-original/app/shared/models/session-availability/regular-session-availability-summary-by-date.model';
import { Seat } from '@fz-original/app/shared/models/session-availability/seat.model';
import {
  SessionAvailabilitySummaryByDate,
  SessionAvailabilitySummaryByDateType,
} from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-date.model';
import { SessionAvailabilitySummary } from '@fz-original/app/shared/models/session-availability/session-availability-summary.model';
import { SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';
import { MaxLimitTicketFieldEnum } from '@fz-original/app/shared/models/ticket-type/max-limit-ticket-field.enum';
import { OngoingMultiDayTicketGroup } from '@fz-original/app/shared/models/ticket-type/ongoing-multi-day-ticket-group.model';
import { TicketType } from '@fz-original/app/shared/models/ticket-type/ticket-type.model';
import { SearchFilter } from '@fz-original/app/shared/search-bar/models/search-filter.model';
import { FreeSeatResponse } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/free-seat-response.model';
import { SeatInfo } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seat-info.model';
import { SeatingProviderEnum } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { SeatingSelectorFinalizedResponse } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-selector-finalized-response.model';
import { DiscardCartQuery } from '@fz-original/app/shared/services/cart/discard-cart-query';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { SessionSelectorType } from '@fz-original/app/shared/services/session-availability/session-selector-type.enum';
import { BehaviorSubject, Observable, ReplaySubject, Subject } from 'rxjs';

import { type TimeslotActivationFromCartPayload } from '../../one-stop-shop/components/oss-cart-detail/oss-cart-detail.component';
import { type OssOnsiteSetupModalData } from '../../one-stop-shop/containers/oss-onsite-setup-modal/oss-onsite-setup-modal.model';
import { type OssPlanSelectionModalData } from '../../one-stop-shop/containers/oss-plan-selection-modal/oss-plan-selection-modal.model';
import {
  HierarchyNavigationLevel,
  OssCustomTabData,
  OssCustomTilesData,
  OSSOnsiteSetupConfig,
  OSSPlanConfig,
  OssTab,
  UpdateTicketTypeCounter,
} from '../../one-stop-shop/models';
import { ModifiedOrderMode } from '../../one-stop-shop/models/oss-modified-order-mode.model';
import { type PosCartClearedSource } from '../../one-stop-shop/tracking/events/pos-cart-cleared.event';
import { type PosCartSource } from '../../one-stop-shop/tracking/events/pos-cart-item-quantity-change.event';
import { type PosCheckoutSelectPaymentMethodSource } from '../../one-stop-shop/tracking/events/pos-checkout-select-payment-method.event';
import { type TicketingStrategy } from '../models/ticketing-strategy.model';
import { PosAvailabilityService, type PosAvailabilityUiHandlers } from '../services/availability/pos-availability.service';
import { PosCartService } from '../services/cart/pos-cart.service';
import { PosCouponsService } from '../services/coupons/pos-coupons.service';
import { PosPurchaseService, type PosSplitPaymentCancellationError } from '../services/purchase/pos-purchase.service';
import { PosScannerService } from '../services/scanner/pos-scanner.service';
import { PosSeatingService } from '../services/seating/pos-seating.service';
import { PosSecondScreenService } from '../services/second-screen/pos-second-screen.service';
import {
  PosSetupService,
  type PosLinkedDeviceRequest,
  type PosSquareConnectionRequest,
  type PosTabUiHandlers,
} from '../services/setup/pos-setup.service';
import { PosShiftService } from '../services/shift/pos-shift.service';
import { PosTicketSelectionService, type TicketTypeCounterSelection } from '../services/ticket-selection/pos-ticket-selection.service';
import { PosTicketingState } from '../state/pos-ticketing.state';

/**
 * Business-layer facade for `PointOfSaleComponent`. Two jobs, nothing else: forward state from
 * {@link PosTicketingState} through legacy-typed accessors, so the template copied from
 * `one-stop-shop.component.html` only needs the mechanical `x` → `core.x` rewrite; and delegate
 * commands to the domain sub-strategies, sequencing them where a user action spans several domains
 * (clear cart → release seats → reset selection).
 */
@Injectable()
export class PointOfSaleTicketing implements TicketingStrategy {
  readonly #availability = inject(PosAvailabilityService);
  readonly #cart = inject(PosCartService);
  readonly #coupons = inject(PosCouponsService);
  readonly #purchase = inject(PosPurchaseService);
  readonly #scanner = inject(PosScannerService);
  readonly #seating = inject(PosSeatingService);
  readonly #secondScreen = inject(PosSecondScreenService);
  readonly #setup = inject(PosSetupService);
  readonly #shift = inject(PosShiftService);
  readonly #state = inject(PosTicketingState);
  readonly #ticketSelection = inject(PosTicketSelectionService);

  // ══════════════════════════════ TicketingStrategy — availability state ══════════════════════════

  /**
   * The availability strategy owns the whole step: find the summary, restore the counters *then*
   * select the session, in that order.
   */
  activateTimeslotFromCart(datetime: string): void {
    this.#availability.activatePendingTimeslot(datetime);
  }
  get activeCustomTab(): Signal<OssCustomTabData | null> {
    return this.#ticketSelection.activeCustomTab;
  }

  get activeCustomTabIndex(): WritableSignal<number> {
    return this.#state.activeCustomTabIndex;
  }
  get activeOnsiteSetup(): WritableSignal<OnsiteSetup | null> {
    return this.#state.activeOnsiteSetup;
  }

  get activeOssPlanConfig(): WritableSignal<OSSPlanConfig | null> {
    return this.#state.activeOssPlanConfig;
  }
  get activePlan(): WritableSignal<Plan | null> {
    return this.#state.activePlan;
  }

  get activeShift(): WritableSignal<ActiveShift | null> {
    return this.#state.activeShift;
  }
  get activeShiftReady(): boolean {
    return this.#state.activeShiftReady;
  }

  get activeShiftReady$(): Observable<ActiveShift> {
    return this.#state.activeShiftReady$.asObservable();
  }
  /**
   * The component owns the visual tab selection and mirrors its type here, because
   * `updateTicketTypeFields` and the date-dependency check branch on it.
   */
  set activeTabType(value: OssTab) {
    this.#state.activeTabType = value;
  }

  get activeTabType(): OssTab {
    return this.#state.activeTabType;
  }
  get addCounterSessionId(): Subject<number> {
    return this.#state.addCounterSessionId;
  }

  addCustomTileSessionsToTicketTypes(customTilesData: OssCustomTilesData): void {
    this.#ticketSelection.addCustomTileSessionsToTicketTypes(customTilesData);
  }
  /**
   * Fire-and-forget stream: the component opens the additional-gift-card modal and feeds each entered
   * code back through {@link applyCouponOneStep$}, closing it when `couponError` stays `null`.
   */
  get additionalCouponModalRequested$(): Observable<void> {
    return this.#state.additionalCouponModalRequested$.asObservable();
  }

  /** Second half of the custom-tiles effect. */
  addProductSessionsByCustomTabsProductSessions(customTilesData: OssCustomTilesData): void {
    this.#ticketSelection.addProductSessionsByCustomTabsProductSessions(customTilesData);
  }
  addProductSessionToCart(productSession: ProductSession, skipPosCartTracking = false): void {
    this.#ticketSelection.addProductSessionToCartUsingTicketTypeCounter(productSession, skipPosCartTracking);
  }

  /** Shift validation gates add-to-cart in the POS flow. */
  addSessionsToCart(): void {
    // The cart-expiry check runs before the shift gate, which calls back into
    // `PosCartService.addSessionsToCart` once validated.
    this.#cart.checkCartSessionsIsAboutToExpire();
    this.#shift.showShiftModal();
  }
  addSessionsToCartIsDisabled(): boolean {
    return this.#ticketSelection.addSessionsToCartIsDisabled();
  }

  /** Tile "+" button. */
  addUnitBySessionId(sessionId: number): void {
    this.#ticketSelection.addUnitBySessionId(sessionId);
  }
  get allowMultiSessionPurchase(): boolean {
    return this.#state.allowMultiSessionPurchase;
  }

  set allowMultiSessionPurchase(value: boolean) {
    this.#state.allowMultiSessionPurchase = value;
  }
  get allowMultiTimeSlotSelection(): boolean {
    return this.#state.allowMultiTimeSlotSelection;
  }

  set allowMultiTimeSlotSelection(value: boolean) {
    this.#state.allowMultiTimeSlotSelection = value;
  }
  applyCouponDiscountOneStep(code: string, lazyCouponType: string | null = null): void {
    this.#coupons.applyCouponDiscountOneStep(code, lazyCouponType);
  }

  /** Used by the additional-coupon modal, which applies codes one by one. */
  applyCouponOneStep$(code: string, lazyCouponType: string | null = null): Observable<void> {
    return this.#coupons.applyCouponOneStep$(code, lazyCouponType);
  }
  applyOnsiteSetup(): void {
    this.#setup.applyOnsiteSetup();
  }

  get availablePlans(): WritableSignal<Plan[]> {
    return this.#state.availablePlans;
  }
  get availablePlansById(): Signal<Map<number, Plan>> {
    return this.#setup.availablePlansById;
  }

  /** Tabs the setup + catalog expose; the component owns which one is visually active. */
  get availableTabs(): WritableSignal<OssTab[]> {
    return this.#state.availableTabs;
  }
  canAddMoreCoupons(): boolean {
    return this.#coupons.canAddMoreCoupons();
  }

  get canOverrideCapacities(): boolean {
    return this.#state.canOverrideCapacities;
  }
  get cart(): Cart | null {
    return this.#state.cart;
  }

  set cart(value: Cart | null) {
    this.#state.cart = value;
  }
  get cartHasEffectiveDiscount(): boolean {
    return this.#state.cartHasEffectiveDiscount;
  }

  cartHasItems(): boolean {
    return this.#cart.cartHasItems();
  }
  get cartTotalMoney(): Money {
    return this.#state.cartTotalMoney;
  }

  get cartTotalMoneyWithoutCoupon(): Money {
    return this.#state.cartTotalMoneyWithoutCoupon;
  }
  get cashModalMandatory(): boolean {
    return this.#state.cashModalMandatory;
  }

  get channel(): Channel {
    return this.#state.channel;
  }
  set channel(value: Channel) {
    this.#state.channel = value;
  }

  get channelId(): string {
    return this.#state.channelId;
  }
  set channelId(value: string) {
    this.#state.channelId = value;
  }

  /**
   * Clear-all body, with the seating-map leg interleaved at the same point as before.
   *
   * Parity-locked twice over. It must not route through {@link releaseSeats}, which expires the hold
   * token backend-side and is reserved for navigation discard and plan change; a plain
   * `clearSelection()` keeps the token alive. And it must stop there — no `clearSelectedTickets()`
   * (that would null `selectedSession` and lose the operator's timeslot), no coupon clear (that is
   * {@link removeAppliedDiscount}) and no second-screen stand-by reset.
   */
  clearAllCart(source: PosCartClearedSource): void {
    this.#cart.clearAllCart(source, () => this.#clearSeatingSelectionHandler?.());
  }
  clearCart(): void {
    this.#cart.clearCart();
  }

  /**
   * This is the fallback branch when the cart-detail panel is not mounted. The preferred branch,
   * `OssCartDetailComponent.clearAllCartItemsWithoutConfirmation()` (zeroes each line's counter and
   * emits `discountRemoved` + `clearAllConfirmed`), is component-owned via `ViewChild` and takes
   * precedence when available.
   */
  clearCartFromCartDetail(): void {
    this.onClearAllConfirmed();
  }

  cancelModifyOrderPayment(): void {
    this.#purchase.cancelModifyOrderPayment();
  }

  clickOnPayOneStep(paymentType?: PaymentType, trackSelectPayment = false): void {
    this.#purchase.clickOnPayOneStep(paymentType, trackSelectPayment);
  }

  /** Fire-and-forget stream: the component closes the cart panel when the cart ran empty. */
  get closeCartDetailWhenEmpty$(): Observable<void> {
    return this.#state.closeCartDetailWhenEmpty$.asObservable();
  }
  /**
   * Fire-and-forget stream: the pay entry point closes the retail-search overlay (`onCloseSearch()`),
   * which is component-local UI.
   */
  get closeSearchRequested$(): Observable<void> {
    return this.#purchase.closeSearchRequested$.asObservable();
  }

  get combinedCoupons(): Coupon[] {
    return this.#state.combinedCoupons;
  }
  confirmModifyOrder(): void {
    this.#purchase.confirmModifyOrder();
  }

  confirmModifyOrderIsDisabled(): boolean {
    return this.#purchase.confirmModifyOrderIsDisabled();
  }

  confirmSeating(data?: SeatingSelectorFinalizedResponse): void {
    this.#seating.confirmSeating(data);
  }

  get confirmSeatingMap$(): ReplaySubject<void> {
    return this.#state.confirmSeatingMap$;
  }
  /** Seating-selector `continueRestore` output. */
  continueRestore(): void {
    this.#cart.continueRestore();
  }

  convertCustomTabsToHierarchy(customTabData: OssCustomTilesData | null): HierarchyNavigationLevel | null {
    return this.#ticketSelection.convertCustomTabsToHierarchy(customTabData);
  }
  get coupon(): Coupon | null {
    return this.#state.coupon;
  }

  get couponCodeApplied$(): Observable<boolean> {
    return this.#state.couponCodeApplied$;
  }
  get couponCombinationSubtotal(): number {
    return this.#state.couponCombinationSubtotal;
  }
  /**
   * Parity-locked: exposed as a **subject**, not an `Observable` — `app-coupon-code-selector` and the
   * modals it opens call `error.next(null)` on it directly.
   */
  get couponError(): BehaviorSubject<Error | null> {
    return this.#state.couponError;
  }

  get couponRemainingBalance(): Money | null {
    return this.#state.couponRemainingBalance;
  }
  createOrUpdateCart(): Observable<BaseResponse<Cart>> {
    return this.#cart.createOrUpdateCart();
  }

  get currency(): string | null {
    return this.#state.currency;
  }
  set currency(value: string | null) {
    this.#state.currency = value;
  }

  /** Cart header counter. */
  get currentNumberOfTickets(): number {
    return this.#cart.currentNumberOfTickets;
  }
  /** The selected timeslot, normalised to the cart's datetime-key format. */
  get currentSelectedDatetime(): string | null {
    return this.#purchase.currentSelectedDatetime;
  }

  get customer(): Customer | null {
    return this.#state.customer;
  }
  get customTabHasTilesData(): Signal<boolean[]> {
    return this.#ticketSelection.customTabHasTilesData;
  }

  get customTabHierarchyLevels(): Signal<(HierarchyNavigationLevel | null)[]> {
    return this.#ticketSelection.customTabHierarchyLevels;
  }
  get customTabIcons(): Signal<IconProp[]> {
    return this.#ticketSelection.customTabIcons;
  }

  get customTabNames(): Signal<string[]> {
    return this.#ticketSelection.customTabNames;
  }

  get customTabSignals(): WritableSignal<WritableSignal<OssCustomTabData | null>[]> {
    return this.#state.customTabSignals;
  }

  get customTabTilesData(): Signal<(OssCustomTilesData | null)[]> {
    return this.#ticketSelection.customTabTilesData;
  }

  get customTileSessionAvailabilityMaps(): Signal<(Map<number, { isUnavailable: boolean }> | null)[]> {
    return this.#ticketSelection.customTileSessionAvailabilityMaps;
  }

  get datesAvailability(): Array<DateAvailability> {
    return this.#state.datesAvailability;
  }

  set datesAvailability(value: Array<DateAvailability>) {
    this.#state.datesAvailability = value;
  }

  /** Deep-link probe: publishes on {@link shiftMismatch$} when the shift disagrees. */
  detectShiftMismatch(): void {
    this.#shift.detectShiftMismatch();
  }

  // ════════════════════════════ TicketingStrategy — availability commands ═════════════════════════

  get disableAddSessionsToCartByCapacity(): boolean {
    return this.#state.disableAddSessionsToCartByCapacity;
  }

  set disableAddSessionsToCartByCapacity(value: boolean) {
    this.#state.disableAddSessionsToCartByCapacity = value;
  }

  discardCartBeforeNavigation(): Observable<void> {
    // Releases the map selection through the seating `ViewChild`; that call lives here because
    // the handle is registered on the facade.
    this.releaseSeats();
    return this.#cart.discardCartBeforeNavigation();
  }

  /** Currently paired terminal, for the header menu's device tag. */
  get displayedDeviceId(): Signal<string | null> {
    return this.#setup.displayedDeviceId;
  }

  get displayedOnsiteSetup(): Signal<string | null> {
    return this.#setup.displayedOnsiteSetup;
  }

  get displayedOnsiteSetupPlace(): Signal<string | null> {
    return this.#setup.displayedOnsiteSetupPlace;
  }

  get displayedSessionType(): SessionAvailabilitySummaryByDateType {
    return this.#state.displayedSessionType;
  }

  set displayedSessionType(value: SessionAvailabilitySummaryByDateType) {
    this.#state.displayedSessionType = value;
  }

  get effectiveCombinedCoupon(): Coupon | null {
    return this.#state.effectiveCombinedCoupon;
  }

  get error(): boolean {
    return this.#state.error;
  }

  // ═════════════════════════════ TicketingStrategy — ticket selection ═════════════════════════════

  set error(value: boolean) {
    this.#state.error = value;
  }
  get errorObject(): unknown | null {
    return this.#state.errorObject;
  }

  set errorObject(value: unknown | null) {
    this.#state.errorObject = value;
  }
  get filters(): SearchFilter {
    return this.#state.filters;
  }

  set filters(value: SearchFilter) {
    this.#state.filters = value;
  }
  get filtersSelected(): boolean {
    return this.#state.filtersSelected;
  }

  set filtersSelected(value: boolean) {
    this.#state.filtersSelected = value;
  }
  /**
   * Imperative "finish selection" on the seating map. The `SeatingSelectorComponent` is a view
   * handle, so `PointOfSaleComponent` registers the callback here rather than the strategy holding a
   * `ViewChild`; the closure itself is stored on `PosSeatingService`.
   */
  finishSeating(): void {
    this.#seating.finishSeating();
  }

  get forceDisableIncreaseCounter(): boolean {
    return this.#state.forceDisableIncreaseCounter;
  }
  set forceDisableIncreaseCounter(value: boolean) {
    this.#state.forceDisableIncreaseCounter = value;
  }

  generateFreeSeatingMap(): void {
    this.#seating.generateFreeSeatingMap();
  }

  getButtonImageUrl(paymentType: PaymentType): string | null {
    return this.#purchase.getButtonImageUrl(paymentType);
  }

  getButtonLabel(paymentType: PaymentType): string {
    return this.#purchase.getButtonLabel(paymentType);
  }

  getCardDisabledTooltip(paymentType: PaymentType): string | null {
    return this.#purchase.getCardDisabledTooltip(paymentType);
  }

  getCart(): Cart | null {
    return this.#cart.getCart();
  }

  getCurrentCart(): Cart | null {
    return this.#cart.getCurrentCart();
  }

  getCustomTabData(tabIndex: number): OssCustomTabData | null {
    return this.#ticketSelection.getCustomTabData(tabIndex);
  }

  getDisabledPlanIdsForPlanSelectionModal(): number[] {
    return this.#setup.getDisabledPlanIdsForPlanSelection();
  }

  getMaxPurchasableDays(onsiteSetup?: OnsiteSetup): number {
    return onsiteSetup === undefined ? this.#setup.getMaxPurchasableDays() : this.#setup.getMaxPurchasableDays(onsiteSetup);
  }

  // ════════════════════════════════════ TicketingStrategy — cart ══════════════════════════════════

  getModifyOrderPriceDifference(): Money | null {
    return this.#purchase.getModifyOrderPriceDifference();
  }

  getOngoingMultiDaySelectedTicketTypeNames(): string[] {
    return this.#ticketSelection.getOngoingMultiDaySelectedTicketTypeNames();
  }
  getUnloadDiscardCartQuery(): DiscardCartQuery | null {
    return this.#cart.getUnloadDiscardCartQuery();
  }
  /** Tracks the close, resets the session and clears the scanned code. */
  handleCouponModalClosed(): void {
    this.#coupons.handleCouponModalClosed();
  }

  handleDisplayedSessionTypeChange(selectedSessionType: SessionAvailabilitySummaryByDateType): void {
    this.#availability.handleDisplayedSessionTypeChange(selectedSessionType);
  }
  /**
   * Linked-device modal closed; `undefined` = no terminal picked. The component hands back the
   * `paymentConfiguration` the request carried.
   */
  handleLinkedDeviceSelectorClosed(paymentConfiguration: PaymentConfiguration, deviceId: string | undefined): void {
    this.#setup.handleLinkedDeviceSelectorClosed(paymentConfiguration, deviceId);
  }

  handleOnsiteSetupStorageChange(onsiteSetupId: string | null): void {
    this.#setup.handleOnsiteSetupStorageChange(onsiteSetupId);
  }
  handlePlanSelected(config: OSSPlanConfig): void {
    this.#setup.handlePlanSelected(config);
  }

  /** Plan-selection modal closed (`undefined` = dismissed) — emits the plan-change tracking event. */
  handlePlanSelectorClosed(config?: OSSPlanConfig): void {
    this.#setup.handlePlanSelectorClosed(config);
  }
  /** Plan-selection slider closed. */
  handlePlanSelectorClosedFromSlider(config?: OSSPlanConfig): void {
    this.#setup.handlePlanSelectorClosedFromSlider(config);
  }

  /** Entry point for the component's `ScannerService` subscription. */
  handleProductScannedCode(code: string): void {
    this.#scanner.handleScannedCode(code);
  }

  handleSetupSelected(onsiteSetup: OSSOnsiteSetupConfig): void {
    this.#setup.handleSetupSelected(onsiteSetup);
  }

  /** Setup-selector modal closed (`undefined` = dismissed). */
  handleSetupSelectorClosed(result?: OSSOnsiteSetupConfig): void {
    this.#setup.handleSetupSelectorClosed(result);
  }

  /** Setup-selector slider closed. */
  handleSetupSelectorClosedFromSlider(result?: OSSOnsiteSetupConfig): void {
    this.#setup.handleSetupSelectorClosedFromSlider(result);
  }

  handleShowAvailabilityFromDateChange(selectedDateString: string): void {
    this.#availability.handleShowAvailabilityFromDateChange(selectedDateString);
  }

  /** Square connection modal resolved; `null` = nothing connected. */
  handleSquareConnectionSelectorClosed(paymentConfiguration: PaymentConfiguration, result: { deviceId: string | undefined } | null): void {
    this.#setup.handleSquareConnectionSelectorClosed(paymentConfiguration, result);
  }

  get hasExplodePipe(): boolean {
    return this.#state.hasExplodePipe;
  }

  set hasExplodePipe(value: boolean) {
    this.#state.hasExplodePipe = value;
  }

  /** Template: `@if (core.activeOnsiteSetup() && core.hasFiscalActions())`. */
  get hasFiscalActions(): Signal<boolean> {
    return this.#setup.hasFiscalActions;
  }

  // ═══════════════════════════════════ TicketingStrategy — seating ════════════════════════════════

  /**
   * Mirrors the component-local `#hasModalCouponCodeOpened` flag: while the promo-code modal is open
   * the scanner routes codes to it instead of the catalog.
   */
  set hasModalCouponCodeOpened(value: boolean) {
    this.#state.hasModalCouponCodeOpened = value;
  }
  get hasModalCouponCodeOpened(): boolean {
    return this.#state.hasModalCouponCodeOpened;
  }

  hasPaymentConfig(onsiteSetup: OnsiteSetup | null): boolean {
    return this.#setup.hasPaymentConfig(onsiteSetup);
  }
  get hasProductCatalog(): WritableSignal<boolean> {
    return this.#state.hasProductCatalog;
  }

  get hasResult(): boolean {
    return this.#state.hasResult;
  }
  set hasResult(value: boolean) {
    this.#state.hasResult = value;
  }

  /**
   * Whether a seating map is currently mounted.
   *
   * Parity-locked: `PosCartService.handleCartContent` needs it to abort the payment pipeline with
   * `EMPTY` when the free-seating branch has no map to confirm — without the check the pipeline
   * would wait on `confirmSeatingMap$` forever.
   */
  hasSeatingView(): boolean {
    return this.#seating.hasSeatingView();
  }
  get hasSeatsSelected(): boolean {
    return this.#state.hasSeatsSelected;
  }

  set hasSeatsSelected(value: boolean) {
    this.#state.hasSeatsSelected = value;
  }
  get hasShiftsEnabled(): boolean {
    return this.#state.hasShiftsEnabled;
  }

  set hasShiftsEnabled(value: boolean) {
    this.#state.hasShiftsEnabled = value;
  }
  get includeTimeSlotCapacity(): boolean {
    return this.#state.includeTimeSlotCapacity;
  }

  /**
   * Per-mount wiring, invoked once by the component right before {@link resolveOnsiteSetup}. Listener
   * registration only, in a fixed order — the per-*setup* initialisers hang off
   * {@link setupBootstrap$} instead. `applyOnsiteSetup()` is deliberately not called here: before a
   * setup resolves it would read `onsiteSetupSelected` while it is still undefined.
   */
  initialise(): void {
    // The availability-ready hook (free map + tab bookkeeping).
    this.#availability.initializeSessionAvailableEvents();
    // The store → legacy-mirror bridge: must be installed before the first fetch is dispatched.
    this.#availability.installStoreFlowHandler();
    // The cart-line timeslot activation listener.
    this.#availability.initializeTimeslotActivationListener();
    // Registers the header-widget event bridge *and* requests the current shift.
    this.#shift.initialiseActiveShiftEvents();
    // The debounced cart-total recomputation.
    this.#cart.setupDebouncedCartTotal();
    // Price-viewer reset, the router-state modify-order handover, the cross-tab device-pairing
    // watcher and the per-setup order-modification banner.
    this.#purchase.initialise();
    // Cross-tab setup changes.
    this.#setup.initialiseOnsiteSetupStorageWatcher();
    // The mount-scoped retail-catalog stream, which reacts to every setup change on its own.
    this.#setup.initializeProductsCatalogStream();
    // The mount-scoped second screen configuration refresh, which also follows every setup change on its own.
    this.#setup.initializeSecondScreenConfigurationRefresh();
  }

  /** Registers the header shift-widget event bridge and asks it for the current shift. */
  initialiseActiveShiftEvents(): void {
    this.#shift.initialiseActiveShiftEvents();
  }

  /**
   * The per-setup initialisers not already run by `PosSetupService`, called in this exact order and
   * registered as resettable effects so a setup change disposes them. The custom-tiles ticket-types
   * effect stays on the component — it is the one effect whose dependencies include the visually
   * active tab.
   */
  initialiseResolvedSetupEffects(): void {
    this.#setup.initializeSearchByNewPlanEffect();
    this.#setup.initializeQueryParamsEffect();
  }

  /**
   * Starts the outbound query-param synchronisation. Hook it into the per-setup bootstrap sequence
   * after the search-by-plan effect, before the availability init (see {@link setupBootstrap$}).
   */
  initializeQueryParamsEffect(): void {
    this.#setup.initializeQueryParamsEffect();
  }

  isButtonImageTintable(paymentType: PaymentType): boolean {
    return this.#purchase.isButtonImageTintable(paymentType);
  }

  isCouponCombinationUiActive(): boolean {
    return this.#coupons.isCouponCombinationUiActive();
  }

  /** Gates the "mirror the seating map" button. */
  get isDualScreenStoragePresent(): Signal<boolean> {
    return this.#secondScreen.isDualScreenStoragePresent;
  }

  get isInOverrideZone(): boolean {
    return this.#state.isInOverrideZone;
  }

  /** Template: `@if (core.activeOnsiteSetup() && core.isLinkDeviceButtonVisible())`. */
  get isLinkDeviceButtonVisible(): Signal<boolean> {
    return this.#setup.isLinkDeviceButtonVisible;
  }

  get isLoadingCart(): boolean {
    return this.#state.isLoadingCart;
  }

  // ═════════════════════════════════ TicketingStrategy — lifecycle ════════════════════════════════

  set isLoadingCart(value: boolean) {
    this.#state.isLoadingCart = value;
  }

  get isLoadingDates(): boolean {
    return this.#state.isLoadingDates;
  }

  // ═════════════════════════════════════ POS-only — component wiring ══════════════════════════════

  #clearSeatingSelectionHandler: (() => void) | null = null;
  #releaseSeatsHandler: (() => void) | null = null;

  set isLoadingDates(value: boolean) {
    this.#state.isLoadingDates = value;
  }

  get isLoadingDateSessions(): boolean {
    return this.#state.isLoadingDateSessions;
  }

  set isLoadingDateSessions(value: boolean) {
    this.#state.isLoadingDateSessions = value;
  }

  get isLoadingNewSearch(): WritableSignal<boolean> {
    return this.#state.isLoadingNewSearch;
  }

  get isLoadingProductCatalog(): WritableSignal<boolean> {
    return this.#state.isLoadingProductCatalog;
  }

  get isLoadingSessions(): boolean {
    return this.#state.isLoadingSessions;
  }

  set isLoadingSessions(value: boolean) {
    this.#state.isLoadingSessions = value;
  }

  // ═════════════════════════════════════════ POS-only — setup ═════════════════════════════════════

  /** Also feeds {@link isLinkDeviceButtonVisible}. */
  get isMobilePos(): Signal<boolean> {
    return this.#setup.isMobilePos;
  }
  get isNewPaymentFlowActive(): Signal<boolean> {
    return this.#purchase.isNewPaymentFlowActive;
  }

  isFullPaymentIntegratedAvailable(): boolean {
    return this.#purchase.isFullPaymentIntegratedAvailable();
  }

  /** The payments-lateral confirm button needs a selected method. */
  get isPaymentsMenuConfirmButtonEnabled(): Signal<boolean> {
    return this.#purchase.isPaymentsMenuConfirmButtonEnabled;
  }

  get isProductCatalogLoaded(): WritableSignal<boolean> {
    return this.#state.isProductCatalogLoaded;
  }

  /** Gates the whole plan-scoped header/tab chrome. */
  readonly hasActivePlanSelected: Signal<boolean> = computed(() => this.#state.activePlan() !== null);

  get isReleaseTicketsSheetOpen(): WritableSignal<boolean> {
    return this.#state.isReleaseTicketsSheetOpen;
  }

  isSecondScreenActive(): boolean {
    return this.#secondScreen.isSecondScreenActive();
  }

  isSquareGateway(onsiteSetup: OnsiteSetup | null): boolean {
    return this.#setup.isSquareGateway(onsiteSetup);
  }

  isModifyOrderMode(): boolean {
    return this.#purchase.isModifyOrderMode();
  }

  isTabDateDependant(tabIndex: number): boolean {
    return this.#setup.isTabDateDependant(tabIndex);
  }

  /** Fire-and-forget stream: the component opens `OssLinkedDeviceModalComponent`. */
  get linkedDeviceSelectorRequests$(): Observable<PosLinkedDeviceRequest> {
    return this.#setup.openLinkedDeviceSelector$.asObservable();
  }

  loadAllCustomTabsData(): void {
    this.#ticketSelection.loadAllCustomTabsData();
  }

  loadCustomTabDataByIndex(tabIndex: number): void {
    this.#ticketSelection.loadCustomTabDataByIndex(tabIndex);
  }

  loadMoreDays(daysWithActiveSession?: number): void {
    this.#availability.loadMoreDays(daysWithActiveSession);
  }

  loadNewSearch(filters: SearchFilter, date?: Date): void {
    this.#availability.loadNewSearch(filters, date);
  }

  /** Free-map (re)load requested by the date selector. */
  loadOneStepFreeSeatingMap(): void {
    this.#seating.loadOneStepFreeSeatingMap();
  }

  loadQuickTilesByDateTime(datetime: string): void {
    this.#ticketSelection.loadQuickTilesByDateTime(datetime);
  }

  get locale(): string {
    return this.#state.locale;
  }

  set locale(value: string) {
    this.#state.locale = value;
  }

  get manageAsFreeSeatingMap(): boolean {
    return this.#state.manageAsFreeSeatingMap;
  }

  set manageAsFreeSeatingMap(value: boolean) {
    this.#state.manageAsFreeSeatingMap = value;
  }

  get maxLimitTicketField(): MaxLimitTicketFieldEnum {
    return this.#state.maxLimitTicketField;
  }

  set maxLimitTicketField(value: MaxLimitTicketFieldEnum) {
    this.#state.maxLimitTicketField = value;
  }

  get maxPaymentMethodInOneStep(): number {
    return this.#state.maxPaymentMethodInOneStep;
  }

  /** Also arms the scanner's coupon-autofill route. */
  modalCouponCodeOpened(): void {
    this.#coupons.modalCouponCodeOpened();
  }
  /** The summary the custom-tab date-selector modal opens on. */
  modalPreferredSessionSummary(): RegularSessionAvailabilitySummaryByDate | null {
    return this.#availability.modalPreferredSessionSummary();
  }

  get modifiedOrder(): WritableSignal<Order | undefined> {
    return this.#state.modifiedOrder;
  }

  get modifyOrderPaymentCart(): WritableSignal<Cart | null> {
    return this.#state.modifyOrderPaymentCart;
  }

  /** The order-modification banner reads a different key for seat upgrades. */
  get modifiedOrderBannerTitleKey(): Signal<string> {
    return this.#purchase.modifiedOrderBannerTitleKey;
  }

  get modifiedOrderMode(): Signal<ModifiedOrderMode | undefined> {
    return this.#state.modifiedOrderMode;
  }

  get multiPlanCartEnabled(): boolean {
    return this.#state.multiPlanCartEnabled;
  }

  /**
   * `modifiedSessionIsShopProduct` switches off the custom-tab preservation pass and
   * `skipPosCartTracking` suppresses the quantity-change events when the caller already emitted its
   * own. The template binds `core.newSelectTicketCounter($event, false)`.
   */
  newSelectTicketCounter(
    ticketTypeCounter: TicketTypeCounterSelection,
    modifiedSessionIsShopProduct = false,
    skipPosCartTracking = false,
  ): void {
    this.#ticketSelection.newSelectTicketCounter(ticketTypeCounter, modifiedSessionIsShopProduct, skipPosCartTracking);
  }

  get nextAvailableDate(): string {
    return this.#state.nextAvailableDate;
  }

  set nextAvailableDate(value: string) {
    this.#state.nextAvailableDate = value;
  }

  get nonConfirmedCart(): Cart | null {
    return this.#state.nonConfirmedCart;
  }

  set nonConfirmedCart(value: Cart | null) {
    this.#state.nonConfirmedCart = value;
  }

  /**
   * `onClearAllConfirmed` — the cart-detail confirmation dialog's `clearAllConfirmed` output, bound
   * straight from the template.
   *
   * Its sibling output `discountRemoved` maps to {@link removeAppliedDiscount}; the template wires
   * both, so this path must not clear the coupon itself.
   */
  onClearAllConfirmed(): void {
    this.clearAllCart('button');
  }

  onClearSelectionRequested(): void {
    this.#cart.onClearSelectionRequested();
  }

  get ongoingMultiDayTicketGroups(): OngoingMultiDayTicketGroup[] {
    return this.#state.ongoingMultiDayTicketGroups;
  }

  set ongoingMultiDayTicketGroups(value: OngoingMultiDayTicketGroup[]) {
    this.#state.ongoingMultiDayTicketGroups = value;
  }

  /** Link-device button + header menu action. */
  onLinkDeviceButtonClick(): void {
    this.#setup.onLinkDeviceButtonClick();
  }

  /** Release-seats confirmation from the bottom sheet's footer. */
  onReleaseTickets(): void {
    this.#purchase.onReleaseTickets();
  }

  get onsiteSetupSelected(): OnsiteSetup {
    return this.#state.onsiteSetupSelected;
  }

  // ═══════════════════════════════ POS-only — device pairing / fiscal ══════════════════════════════

  set onsiteSetupSelected(value: OnsiteSetup) {
    this.#state.onsiteSetupSelected = value;
  }

  get onsiteSetupSelectorRequests$(): Observable<OssOnsiteSetupModalData> {
    return this.#setup.openSetupSelector$.asObservable();
  }

  /** A cart line asks for its timeslot to become the active one. */
  onTimeslotActivatedFromCart(payload: TimeslotActivationFromCartPayload): void {
    this.#availability.onTimeslotActivatedFromCart(payload);
  }

  openAddAdditionalCouponModal(): void {
    this.#coupons.openAddAdditionalCouponModal();
  }

  openLateralPayments(): void {
    this.#purchase.openLateralPayments();
  }

  openPlanSelector(): void {
    this.#setup.openPlanSelector();
  }

  openSetupSelector(): void {
    this.#setup.openSetupSelector();
  }

  /** Pays through the checkout modal instead of the inline lateral menu. */
  openSplitPaymentOptionsModal(): void {
    this.#purchase.openSplitPaymentOptionsModal();
  }

  openFullPaymentIntegrated(): void {
    this.#purchase.openFullPaymentIntegrated();
  }

  get partner(): Partner | null {
    return this.#state.partner;
  }

  // ═══════════════════════════════════════ POS-only — URL sync ═════════════════════════════════════

  set partner(value: Partner | null) {
    this.#state.partner = value;
  }

  get paymentConfiguration(): PaymentConfiguration | null {
    return this.#state.paymentConfiguration;
  }

  get paymentInProgress(): boolean {
    return this.#state.paymentInProgress || this.#state.payPipelineInFlight;
  }

  get paymentType(): WritableSignal<PaymentType | null> {
    return this.#state.paymentType;
  }

  get paymentTypes(): PaymentType[] {
    return this.#state.paymentTypes;
  }

  payModifyOrderDifference(paymentType?: PaymentType): void {
    this.#purchase.payModifyOrderDifference(paymentType);
  }

  payWithCardIsDisabled(paymentType: PaymentType): boolean {
    return this.#purchase.payWithCardIsDisabled(paymentType);
  }

  get plan(): Plan | null {
    return this.#state.plan;
  }

  set plan(value: Plan | null) {
    this.#state.plan = value;
  }

  get planSelectorRequests$(): Observable<OssPlanSelectionModalData> {
    return this.#setup.openPlanSelector$.asObservable();
  }

  get productSessions(): SessionAvailability[] {
    return this.#state.productSessions;
  }

  set productSessions(value: SessionAvailability[]) {
    this.#state.productSessions = value;
  }

  get productTypes(): TicketType[] {
    return this.#state.productTypes;
  }

  set productTypes(value: TicketType[]) {
    this.#state.productTypes = value;
  }

  /**
   * Availability's pure-UI hooks, owned by `PointOfSaleComponent`: the visually active tab index, the
   * mobile date-selector dismissal and the seating-tab auto-navigation reset. Registered once, like
   * {@link registerSeatingViewHandlers}.
   */
  registerAvailabilityUiHandlers(handlers: PosAvailabilityUiHandlers): void {
    this.#availability.registerUiHandlers(handlers);
  }

  /**
   * The component's `OssCartDetailComponent` `ViewChild`, for the one call made through it outside
   * the template: `clearAllCartItemsWithoutConfirmation()`.
   */
  registerCartDetailViewHandlers(handlers: { clearAllCartItemsWithoutConfirmation: () => void }): void {
    this.#cart.registerClearAllCartItemsWithoutConfirmationHandler(handlers.clearAllCartItemsWithoutConfirmation);
  }

  /** Effects other domains create per setup, torn down on the next setup change. */
  registerResettableEffect(effectRef: EffectRef): void {
    this.#setup.registerResettableEffect(effectRef);
  }

  // ══════════════════════════════════ POS-only — ticket selection ═════════════════════════════════

  /**
   * `PointOfSaleComponent` hands over the imperative seating-map calls it owns via `ViewChild`,
   * keeping the strategy free of view references. Parity-locked: `releaseSeats` expires the hold
   * token backend-side (navigation discard, plan change) while `clearSeatingSelection` does not, so
   * the two are never interchangeable.
   *
   * `clearSeatingSelection` and `releaseSeatsByReference` are optional so the component can adopt
   * them independently; while absent, the matching call sites skip only the view leg.
   */
  registerSeatingViewHandlers(handlers: {
    finishSeating: () => void;
    releaseSeats: () => void;
    clearSeatingSelection?: () => void;
    hasSeatingView?: () => boolean;
    releaseSeatsByReference?: (seatReferences: string[]) => void;
  }): void {
    this.#releaseSeatsHandler = handlers.releaseSeats;
    this.#clearSeatingSelectionHandler = handlers.clearSeatingSelection ?? null;
    this.#seating.registerFinishSeatingHandler(handlers.finishSeating);
    // Plan change with seating selections releases the map too, unless the cart is preserved.
    this.#setup.registerReleaseSeatsHandler(handlers.releaseSeats);
    // A date/timeslot change releases the seats it drops.
    this.#seating.registerReleaseSeatsHandler(handlers.releaseSeats);
    if (handlers.hasSeatingView) {
      this.#seating.registerHasSeatingViewPredicate(handlers.hasSeatingView);
    }
    if (handlers.releaseSeatsByReference) {
      this.#seating.registerReleaseSeatsByReferenceHandler(handlers.releaseSeatsByReference);
    }
  }

  /** Tab bookkeeping's pure-UI leg. */
  registerTabUiHandlers(handlers: PosTabUiHandlers): void {
    this.#ticketSelection.registerTabUiHandlers(handlers);
  }

  get regularSessionAvailabilitySummaryByDateList(): RegularSessionAvailabilitySummaryByDate[] {
    return this.#state.regularSessionAvailabilitySummaryByDateList;
  }

  set regularSessionAvailabilitySummaryByDateList(value: RegularSessionAvailabilitySummaryByDate[]) {
    this.#state.regularSessionAvailabilitySummaryByDateList = value;
  }

  /** Guard `releaseSeats()` contract. */
  releaseSeats(): void {
    this.#releaseSeatsHandler?.();
    this.#seating.releaseHoldTokens();
  }

  get releaseTicketsAddedCount(): WritableSignal<number> {
    return this.#state.releaseTicketsAddedCount;
  }
  get releaseTicketSeats(): WritableSignal<AccessTicket[]> {
    return this.#state.releaseTicketSeats;
  }

  get releaseTicketSelections(): WritableSignal<boolean[]> {
    return this.#state.releaseTicketSelections;
  }

  get releaseTicketsRequiredCount(): WritableSignal<number> {
    return this.#state.releaseTicketsRequiredCount;
  }

  removeAppliedDiscount(): void {
    this.#coupons.removeAppliedDiscount();
  }

  /** Clears the selected method and the tendered cash. */
  resetPaymentState(): void {
    this.#purchase.resetPaymentState();
  }

  resetPromoCodeModalSession(): void {
    this.#coupons.resetPromoCodeModalSession();
  }

  /** Hides the mirrored map (payment start, free-map load, init/teardown). */
  resetSecondScreenSeatingMapVisibility(): void {
    this.#secondScreen.resetSeatingMapVisibility();
  }

  // ══════════════════════════════════════════ POS-only — cart ═════════════════════════════════════

  /** Setup or plan change wipes the ticketing state. */
  resetState(): void {
    this.#setup.resetState();
  }

  /**
   * `?onsiteSetupId=` deep-link resolution. `false` means an open shift on another setup blocks the
   * page — the ticketing view must never mount in that case.
   */
  resolveDeepLinkSetup(): Observable<boolean> {
    return this.#setup.resolveDeepLinkSetup();
  }

  resolveOnsiteSetup(onsiteSetupId?: string, venueId?: string): Observable<OnsiteSetup | null> {
    return this.#setup.resolveOnsiteSetup(onsiteSetupId, venueId);
  }

  restoreToBeginning(): void {
    this.#cart.restoreToBeginning();
  }

  /** Subject for the same reason as {@link couponError} — the coupon modals push into it. */
  get scannedCouponCode(): BehaviorSubject<string | null> {
    return this.#state.scannedCouponCode;
  }

  /** Fire-and-forget stream: the component scrolls the cart to a freshly scanned product. */
  get scrollToCartItem$(): Observable<number> {
    return this.#state.scrollToCartItem$.asObservable();
  }

  get seatingFullscreenButtonIcon(): Signal<IconProp> {
    return this.#secondScreen.seatingFullscreenButtonIcon;
  }

  get seatingHoldTokensBySessionId(): Map<string, string> {
    return this.#state.seatingHoldTokensBySessionId;
  }

  // ═══════════════════════════════════════ POS-only — coupons ═════════════════════════════════════

  set seatingHoldTokensBySessionId(value: Map<string, string>) {
    this.#state.seatingHoldTokensBySessionId = value;
  }

  get seatingMapState(): SeatingMapState | null {
    return this.#state.seatingMapState;
  }

  set seatingMapState(value: SeatingMapState | null) {
    this.#state.seatingMapState = value;
  }

  get seatingMapUrl(): string | null {
    return this.#state.seatingMapUrl;
  }

  set seatingMapUrl(value: string | null) {
    this.#state.seatingMapUrl = value;
  }

  get seatingProvider(): SeatingProviderEnum {
    return this.#state.seatingProvider;
  }

  set seatingProvider(value: SeatingProviderEnum) {
    this.#state.seatingProvider = value;
  }

  get seatingToken(): string | null {
    return this.#state.seatingToken;
  }

  set seatingToken(value: string | null) {
    this.#state.seatingToken = value;
  }

  selectDate(dateAvailability: DateAvailability): void {
    this.#availability.selectDate(dateAvailability);
  }

  get selectedAvailabilityFromDate(): string | null {
    return this.#state.selectedAvailabilityFromDate;
  }

  set selectedAvailabilityFromDate(value: string | null) {
    // The store owns this field after a settle: a state-only write would be reverted by the mirror.
    this.#availability.setSelectedAvailabilityFromDate(value);
  }

  get selectedCity(): SelectDropdownCityOption {
    return this.#state.selectedCity;
  }

  get selectedDateAvailability(): DateAvailability {
    return this.#state.selectedDateAvailability;
  }

  set selectedDateAvailability(value: DateAvailability) {
    this.#state.selectedDateAvailability = value;
  }

  get selectedPlace(): SelectOption {
    return this.#state.selectedPlace;
  }

  get selectedPlan(): SelectOption {
    return this.#state.selectedPlan;
  }

  get selectedSession(): SessionAvailabilitySummaryByDate | null {
    return this.#state.selectedSession;
  }

  set selectedSession(value: SessionAvailabilitySummaryByDate | null) {
    this.#state.selectedSession = value;
  }

  selectedSessionHasSeating(): boolean {
    return this.#availability.selectedSessionHasSeating();
  }

  get selectedTicketsBySessionId(): Map<string, number> {
    return this.#state.selectedTicketsBySessionId;
  }

  // ═══════════════════════════════════════ POS-only — purchase ════════════════════════════════════

  set selectedTicketsBySessionId(value: Map<string, number>) {
    this.#state.selectedTicketsBySessionId = value;
  }

  get selectedTicketsBySessionType(): Map<string, number> {
    return this.#state.selectedTicketsBySessionType;
  }

  set selectedTicketsBySessionType(value: Map<string, number>) {
    this.#state.selectedTicketsBySessionType = value;
  }

  get selectedTicketsSeatsBySessionId(): Map<string, SeatInfo[]> {
    return this.#state.selectedTicketsSeatsBySessionId;
  }

  set selectedTicketsSeatsBySessionId(value: Map<string, SeatInfo[]>) {
    this.#state.selectedTicketsSeatsBySessionId = value;
  }

  selectPaymentType(paymentType: PaymentType): void {
    this.#purchase.selectPaymentType(paymentType);
  }

  selectSeats(seating: Seat): void {
    this.#seating.selectSeats(seating);
  }

  selectSession(selectedSession: SessionAvailabilitySummaryByDate): void {
    this.#availability.selectSession(selectedSession);
  }

  get sessionAvailabilitySummary(): SessionAvailabilitySummary | null {
    return this.#state.sessionAvailabilitySummary;
  }
  set sessionAvailabilitySummary(value: SessionAvailabilitySummary | null) {
    this.#state.sessionAvailabilitySummary = value;
  }

  get sessionAvailableReady(): ReplaySubject<void> {
    return this.#state.sessionAvailableReady;
  }

  sessionHasSeating(sessionId: number): boolean {
    return this.#seating.sessionHasSeating(sessionId);
  }

  get sessionSelectorType(): SessionSelectorType {
    return this.#state.sessionSelectorType;
  }

  set sessionSelectorType(value: SessionSelectorType) {
    this.#state.sessionSelectorType = value;
  }

  setActiveShift(shift: ActiveShift): void {
    this.#shift.setActiveShift(shift);
  }

  setTicketCounterHasErrors(hasErrors: boolean): void {
    this.#ticketSelection.setTicketCounterHasErrors(hasErrors);
  }

  /** Emitted once per resolved setup; other domains hook their per-setup initialisers here. */
  get setupBootstrap$(): Observable<OnsiteSetup> {
    return this.#setup.setupBootstrap$.asObservable();
  }

  /** Fire-and-forget stream: the component turns this into the end-shift modal. */
  get shiftMismatch$(): Observable<ActiveShift> {
    return this.#state.shiftMismatch$.asObservable();
  }

  get shouldRestoreToBeginning(): boolean {
    return this.#state.shouldRestoreToBeginning;
  }

  set shouldRestoreToBeginning(value: boolean) {
    this.#state.shouldRestoreToBeginning = value;
  }

  readonly releaseTicketsSelectedCount: Signal<number> = computed(() => this.#state.releaseTicketSelections().filter(Boolean).length);

  get showCartDetails(): boolean {
    return this.#state.showCartDetails;
  }

  set showCartDetails(value: boolean) {
    this.#state.showCartDetails = value;
  }

  get showCommonPaymentButton(): boolean {
    return this.#state.showCommonPaymentButton;
  }

  get showCouponOneStep(): boolean {
    return this.#state.showCouponOneStep;
  }

  get showDateSelectorFrom(): boolean {
    return this.#state.showDateSelectorFrom;
  }

  set showDateSelectorFrom(value: boolean) {
    this.#state.showDateSelectorFrom = value;
  }

  get showOnlyTotalInPriceViewer(): boolean {
    return this.#state.showOnlyTotalInPriceViewer;
  }

  get showPaymentsInLateral(): boolean {
    return this.#state.showPaymentsInLateral;
  }

  /** Writable: the payments lateral slider closes itself from the template (`= false`). */
  set showPaymentsInLateral(value: boolean) {
    this.#state.showPaymentsInLateral = value;
  }

  showShiftModal(): void {
    this.#shift.showShiftModal();
  }

  /**
   * Fire-and-forget stream: a cancelled Adyen split had completed legs, so the component calls
   * `SplitPaymentRetryUiService.showCancellationErrorModal(partnerId, cartId, transactionId)`.
   */
  get splitPaymentCancellationError$(): Observable<PosSplitPaymentCancellationError> {
    return this.#purchase.splitPaymentCancellationError$.asObservable();
  }

  /** Fire-and-forget stream: the component opens `SquareConnectionModalComponent`. */
  get squareConnectionSelectorRequests$(): Observable<PosSquareConnectionRequest> {
    return this.#setup.openSquareConnectionSelector$.asObservable();
  }

  /** Component-owned piece of the state reset: `activeTab` reset + tour-reset click state. */
  get stateReset$(): Observable<void> {
    return this.#setup.stateReset$.asObservable();
  }

  get ticketTypes(): TicketType[] {
    return this.#state.ticketTypes;
  }

  set ticketTypes(value: TicketType[]) {
    this.#state.ticketTypes = value;
  }

  get ticketTypesForAddonsTab(): TicketType[] {
    return this.#ticketSelection.getTicketTypesForAddonsTab();
  }

  // ════════════════════════════════════════ POS-only — shift ══════════════════════════════════════

  get timezone(): string {
    return this.#state.timezone;
  }

  set timezone(value: string) {
    this.#state.timezone = value;
  }

  /** Capped at the number of seats the new order added. */
  toggleReleaseTicketSelection(index: number): void {
    this.#purchase.toggleReleaseTicketSelection(index);
  }

  /** The toggle owns its own state, so the template calls it with no argument. */
  toggleSecondScreenSeatingMapVisibility(): void {
    this.#secondScreen.toggleSeatingMapVisibility();
  }

  /** Fire-and-forget stream: the component decides whether to show the guided tour. */
  get tourInitializationRequested$(): Observable<void> {
    return this.#setup.tourInitializationRequested$.asObservable();
  }

  /** The retail-search add-to-cart path emits its own quantity-change event. */
  trackPosCartItemQuantityChange(opts: {
    newCount: number;
    previousCount: number;
    sessionId: number | string;
    source: PosCartSource;
  }): void {
    this.#ticketSelection.trackPosCartItemQuantityChange(opts);
  }

  trackPromoCodeModalClosed(): void {
    this.#coupons.trackPromoCodeModalClosed();
  }

  trackSelectPaymentMethod(paymentType: PaymentType, source: PosCheckoutSelectPaymentMethodSource): void {
    this.#purchase.trackSelectPaymentMethod(paymentType, source);
  }

  // ═════════════════════════════════════ POS-only — second screen ═════════════════════════════════

  updateCustomer(customer: Customer): void {
    this.#purchase.updateCustomer(customer);
  }

  updateFreeMapMode(): void {
    this.#seating.updateFreeMapMode();
  }

  /** One-shot `?onsiteSetupId&cityId&venueId&planId` rewrite. */
  updateQueryParams(): void {
    this.#setup.updateQueryParams();
  }

  /** Parity-locked: the second-screen seat sync must stay at this exact call site. */
  updateSeatsInCart(data: FreeSeatResponse): void {
    this.#seating.updateSeatsInCart(data);
  }

  updateSelectedTicket(sessionId: number, adding: boolean, seatInfo: SeatInfo): void {
    this.#seating.updateSelectedTicket(sessionId, adding, seatInfo);
  }

  // ═══════════════════════════════════════ POS-only — scanner ═════════════════════════════════════

  updateSessionIdCounter(event: UpdateTicketTypeCounter): void {
    this.#ticketSelection.updateSessionIdCounter(event);
  }

  get updateTicketTypeCounter(): Subject<UpdateTicketTypeCounter> {
    return this.#state.updateTicketTypeCounter;
  }
  updateTicketTypeFields(): void {
    this.#ticketSelection.updateTicketTypeFields();
  }

  get useCacheEnabled(): boolean {
    return this.#state.useCacheEnabled;
  }
}
