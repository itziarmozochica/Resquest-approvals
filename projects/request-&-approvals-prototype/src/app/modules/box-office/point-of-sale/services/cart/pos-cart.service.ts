import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { ClickAddToCartEvent } from '@fz-original/app/core/tracking/core/events/click-add-to-cart';
import { ClickClearAllCartData, ClickClearAllCartEvent } from '@fz-original/app/core/tracking/core/events/click-clear-all-cart';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { MemberAccountIdentificationService } from '@fz-original/app/modules/box-office/memberships/services/member-account-identification.service';
import { MembershipsIdentificationService } from '@fz-original/app/modules/box-office/memberships/services/memberships-identification.service';
import { selectEffectivePlanDiscounts } from '@fz-original/app/modules/box-office/memberships/utils/effective-plan-discounts.util';
import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { ReservationSettlementSessionService } from '@fz-original/app/modules/reservation-settlement/services/reservation-settlement-session.service';
import { applyReservationSettlementDiscount } from '@fz-original/app/modules/reservation-settlement/utils/reservation-settlement-discount.util';
import {
  buildSessionCartContextMap,
  generateCart,
  mergeCartSessionsFromOtherPlans,
} from '@fz-original/app/shared/components/ticketing/ticketing.utils';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart, PRODUCTS_GROUP_KEY } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { SeatingMapState } from '@fz-original/app/shared/models/seating-map/seating-map.model';
import { SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';
import { SessionType } from '@fz-original/app/shared/models/session-type/session-type.model';
import { isAddOnPricedFromTheRestOfTheCart } from '@fz-original/app/shared/models/session-type/session-type.util';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { CartTimingService } from '@fz-original/app/shared/services/cart-timing/cart-timing.service';
import { DiscardCartQuery } from '@fz-original/app/shared/services/cart/discard-cart-query';
import { ContactInformationDraftService } from '@fz-original/app/shared/services/contact-information-draft/contact-information-draft.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { PriceViewerPrinterServiceManager } from '@fz-original/app/shared/services/price-viewer/price-viewer.service';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { TicketingContextService } from '@fz-original/app/shared/services/ticketing/ticketing-context.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { carryManualPrices } from '@fz-original/app/shared/utils/cart-manual-price.util';
import { canUseCartSessionItemLines } from '@fz-original/app/shared/utils/cart-session-item-line.util';
import { flatArray } from '@fz-original/app/shared/utils/object.utils';
import { ScrollUtils } from '@fz-original/app/shared/utils/scroll.utils';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateService } from '@ngx-translate/core';
import {
  defer,
  EMPTY,
  MonoTypeOperatorFunction,
  Observable,
  ObservableInput,
  of,
  ReplaySubject,
  Subscription,
  throwError,
  timer,
} from 'rxjs';
import { catchError, defaultIfEmpty, filter, finalize, map, mergeMap, shareReplay, switchMap, take, takeUntil, tap } from 'rxjs/operators';

import { OboSecondScreenDataService } from '../../../obo-second-screen/services/obo-second-screen-data.service';
import { posCartCleared, type PosCartClearedSource } from '../../../one-stop-shop/tracking/events/pos-cart-cleared.event';
import { type PosCartSource } from '../../../one-stop-shop/tracking/events/pos-cart-item-quantity-change.event';
import { TrackPosCartItemQuantityChangeService } from '../../../one-stop-shop/tracking/services/track-pos-cart-item-quantity-change.service';
import { isDiscardedWithFiscalAbortPending } from '../../../shared/utils/discard-cart-fiscal.util';
import { restoreLocalCartPresentation } from '../../../utils/restore-local-cart-presentation.util';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosAvailabilityService } from '../availability/pos-availability.service';
import { PosCouponsService } from '../coupons/pos-coupons.service';
import { PosFlexibleBundleService } from '../flexible-bundle/pos-flexible-bundle.service';
import { PosUiPortService } from '../pos-ui-port/pos-ui-port.service';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';
import { PosPurchaseService } from '../purchase/pos-purchase.service';
import { PosSeatingService } from '../seating/pos-seating.service';
import { PosSecondScreenService } from '../second-screen/pos-second-screen.service';
import { PosTicketSelectionService } from '../ticket-selection/pos-ticket-selection.service';
import { TicketingCoreService } from '../ticketing-core/ticketing-core.service';

const cartTotalDebounceMs = 500;
const invalidCartStatusCodesForUpdate: readonly number[] = [937];

/**
 * Cart CRUD and everything derived from cart content.
 *
 * Cart writes send one hold token per session in the multiplan seating flow, and the single global
 * `seatingToken` otherwise — see `#seatingHoldTokensBySessionIdToSend()`.
 */
@Injectable()
export class PosCartService {
  readonly #cartTiming = inject(CartTimingService);
  readonly #contactInformationDraft = inject(ContactInformationDraftService);
  readonly #core = inject(TicketingCoreService);
  readonly #datadog = inject(DatadogLogService);
  /** Settles when the real-time create-cart request in flight does; `null` when none is. */
  #realTimeCreateSettled$: Observable<void> | null = null;
  /** Bumped by every reset, so a real-time create sent before it never lands afterwards. */
  #realTimeGeneration = 0;
  #flexibleBundleSync: Subscription | null = null;
  #cartUpdatesInFlight = 0;
  readonly #cartIdsWithUnorderedUpdates = new Set<string>();
  readonly #destroyRef = inject(DestroyRef);
  readonly #flexibleBundle = inject(PosFlexibleBundleService);
  readonly #dualScreenStorage = inject(DualScreenStorageService);
  readonly #memberAccount = inject(MemberAccountIdentificationService);
  readonly #memberships = inject(MembershipsIdentificationService);
  readonly #injector = inject(Injector);
  readonly #optimizely = inject(OptimizelyService);
  readonly #priceViewer = inject(PriceViewerPrinterServiceManager);
  readonly #reservationSettlementSession = inject(ReservationSettlementSessionService);
  /** Only for `resetCart()`, which has no `PosSecondScreenService` counterpart. */
  readonly #secondScreenData = inject(OboSecondScreenDataService);
  /** Root service; only used to hide the spinner in `handleInvalidCartStatus` before the modal opens. */
  readonly #spinner = inject(SpinnerService);
  readonly #state = inject(PosTicketingState);
  readonly #ticketingContext = inject(TicketingContextService);
  readonly #toast = inject(ToastService);
  readonly #tracking = inject(FzTrackingService);
  readonly #trackingLegacy = inject(TrackingService);
  readonly #trackQuantityChange = inject(TrackPosCartItemQuantityChangeService);
  readonly #translate = inject(TranslateService);
  readonly #ui = inject(PosUiPortService);
  readonly #viewUpdate = inject(PosViewUpdateService);

  /** `#skipClearCartTracking` — only read by the two lifecycle paths below. */
  #skipClearCartTracking = false;

  /** Registered by `PointOfSaleTicketing.registerCartDetailViewHandlers` — see {@link clearCartFromCartDetail}. */
  #clearAllCartItemsWithoutConfirmationHandler: (() => void) | null = null;

  constructor() {
    // The flag value is static for the session, so a single read here is equivalent, and keeps the
    // read inside the domain that owns the field.
    this.#state.multiPlanCartEnabled =
      this.#optimizely.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.BOX_OFFICE_MULTIPLAN_CART,
        team: 'b2b-shops',
      }) ?? false;
    // Same static-for-the-session reasoning.
    this.#state.showOnlyTotalInPriceViewer = this.#optimizely.isFeatureEnabled('obo_only_total_price_viewer') ?? false;
  }

  // ─────────────────────────────── lazily resolved sibling strategies ──────────────────────────────

  /**
   * Confirms the current selection into the server cart, loading a seating map first when needed.
   *
   * The expiry check and shift-modal pre-steps live in `PointOfSaleTicketing.addSessionsToCart` and
   * `PosShiftService.showShiftModal` respectively; this method is the body they call into.
   */
  addSessionsToCart(cancelRequest: ObservableInput<unknown> | null = null): void {
    if (this.#ticketSelection.addSessionsToCartIsDisabled()) {
      return;
    }
    this.#seating.setPreviousAndNextSteps(this.hasSeatingInNonConfirmedCart()); // Owner is PosSeatingService
    if (
      this.#state.cart !== null &&
      this.#state.cart.hasSameContent(this.#state.nonConfirmedCart) &&
      !this.hasSeatingInNonConfirmedCart() &&
      this.#state.currentStep.nextStep
    ) {
      this.#state.currentStep = this.#state.currentStep.nextStep;
      return;
    }
    this.#addSessionsToCartSetProps();
    // Component-scoped providers make `DestroyRef` equivalent to defaulting `cancelRequest` to a
    // component-lifetime `destroy$`.
    this.#addSessionsToCartLoadSeatingMap(cancelRequest).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  /** Observable form used by the purchase pipeline. */
  addSessionsToCartObservable(isEarlyReturnEnabled = true): Observable<BaseResponse<Cart> | never | void> {
    if (this.#ticketSelection.addSessionsToCartIsDisabled()) {
      return EMPTY;
    }

    if (
      isEarlyReturnEnabled &&
      this.#state.cart !== null &&
      this.#state.cart.hasSameContent(this.#state.nonConfirmedCart) &&
      !this.hasSeatingInNonConfirmedCart() &&
      this.#state.currentStep.nextStep
    ) {
      this.#state.currentStep = this.#state.currentStep.nextStep;
      return of(void 0);
    }
    this.#seating.setPreviousAndNextSteps(this.hasSeatingInNonConfirmedCart()); // Owner is PosSeatingService
    this.#addSessionsToCartSetProps();
    return this.#addSessionsToCartLoadSeatingMap(null);
  }

  /** Called by the coupon apply path. */
  addSessionsTypesToNonConfirmedCart(): void {
    if (this.#state.selectedSession) {
      const allSessions = this.#getAllSessions();
      this.#state.nonConfirmedCart!.sessionItemsByDatetime.forEach(cartSessions => {
        cartSessions.forEach(cartSession => {
          const session = allSessions.find(a => a.id === cartSession.sessionId);
          if (session) {
            cartSession.sessionType = this.#sessionTypeForCartLine(cartSession, session.sessionType);
          }
        });
      });
    }
  }

  /**
   * A line that kept the backend price carries no add-on configuration (the backend cart maps none), and that price
   * already covers every ticket for an add-on priced from the rest of the cart. Its pricing type would make the cart
   * price it per ticket again. Local and restored lines carry the configuration, so they keep the availability one.
   */
  #sessionTypeForCartLine(cartSession: CartSession, sessionType: SessionType | undefined): SessionType | undefined {
    if (
      cartSession.sessionType?.addOnConfiguration !== undefined ||
      sessionType === undefined ||
      !isAddOnPricedFromTheRestOfTheCart(sessionType)
    ) {
      return sessionType;
    }
    return Object.assign(new SessionType(sessionType.id), sessionType, { addOnConfiguration: undefined });
  }

  cartHasItems(): boolean {
    return !!(this.#state.nonConfirmedCart && this.#state.nonConfirmedCart.getNumberOfTicketAndProductCounts() > 0);
  }

  /**
   * Warns before the held sessions expire.
   * Fire-and-forget error modal, not a request whose result feeds a pipeline.
   */
  checkCartSessionsIsAboutToExpire(): void {
    if (this.#state.nonConfirmedCart === null) {
      return;
    }
    if (!this.#hasSessionAboutToExpire()) {
      return;
    }
    this.#ticketSelection.clearCounters();
    this.clearCart();
    this.#ticketSelection.updateTicketTypeFields();
    this.showModal('common.errorTitle', 'boxOffice.ticketExpireSoon', 'ticketExpireSoon');
  }

  /** The purchase-pipeline variant. */
  checkCartSessionsIsAboutToExpireObservable(): Observable<void> {
    if (this.#state.nonConfirmedCart === null) {
      return EMPTY;
    }
    if (!this.#hasSessionAboutToExpire()) {
      return of(void 0);
    }
    this.#ticketSelection.clearCounters();
    this.clearCart();
    this.#ticketSelection.updateTicketTypeFields();
    return throwError(() => new Error('boxOffice.ticketExpireSoon'));
  }

  // ────────────────────────────────────────────── writes ──────────────────────────────────────────

  checkResponseData<T>(response: BaseResponse<T>): Observable<BaseResponse<T>> {
    return response?.data ? of(response) : throwError(response);
  }

  /**
   * "Clear all" from the cart detail, with the confirmation already accepted. The dialog's two
   * outputs are wired separately by the template (`discountRemoved` → `removeAppliedDiscount()`,
   * `clearAllConfirmed` → this body), so this must *not* re-run the coupon removal.
   *
   * `clearSeatingSelection` is a parameter rather than a step of its own because the seating-map
   * handle lives on `PointOfSaleTicketing` and the call ordering must be preserved. Parity-locked: it
   * must be a plain `clearSelection()`, never `{ expireHoldToken: true }`.
   */
  clearAllCart(source: PosCartClearedSource, clearSeatingSelection?: () => void): void {
    this.#trackCartCleared(source);
    clearSeatingSelection?.(); // `seatingSelectorRef?.clearSelection()`, no expiry

    this.#state.selectedTicketsBySessionId = new Map<string, number>();
    this.#state.selectedTicketsBySessionType = new Map<string, number>();
    this.#state.selectedTicketsSeatsBySessionId = new Map();
    this.#state.seatingHoldTokensBySessionId = new Map();
    this.#dropPendingRealTimeCreate();
    this.#discardRealTimeCartOnClear();

    // `modifiedSessionIsShopProduct = true`, tracking left on (the per-session
    // removals are what emit the quantity-change events).
    this.#ticketSelection.newSelectTicketCounter(
      { bySessionId: new Map<string, number>(), bySessionType: new Map<string, number>() },
      true,
    );

    // `isCartDetailOpened` is component-local UI, so the decision travels on the
    // fire-and-forget stream (two-mechanism rule).
    this.#state.closeCartDetailWhenEmpty$.next();
  }

  /**
   * "Clear all" on a real-time map also discards the confirmed cart on the server, fire-and-forget
   * (GIT-1271). A real-time cart is never discarded on a payment failure (the retry pays it again), so
   * a cart the cashier abandons here may be prepared and holding Fever capacity until its block
   * expires; the discard releases it. The widget's `delete-order` (the `clearSeatingSelection` leg)
   * may reach OneBox first: fever2's `OneboxCartDiscarder` then logs "order not found" and completes
   * the discard, so the order of the two does not fail it. A failed discard is logged and swallowed. It
   * is not tied to the service's lifetime: the cart reference is already dropped, so a discard cancelled
   * by leaving the POS would never be retried; the HTTP request completes on its own.
   * Classic maps keep the legacy behaviour: the cart is left to the next update or to expire.
   */
  #discardRealTimeCartOnClear(): void {
    const cartId = this.#state.cart?.id;
    const partnerId = this.#state.partner?.id;
    if (!this.#state.isRealTimeSeating || !cartId || !partnerId) {
      return;
    }
    this.#state.cart = null;
    this.#core.clearCart();
    this.#core
      .discardCart({ cartId, partnerId })
      .pipe(
        catchError(() => {
          this.#datadog.logWarn('[OSS-CART] Real-time cart discard on clear failed', { cartId, partnerId });
          return of(null);
        }),
      )
      .subscribe();
  }

  /**
   * Drops the local cart references; does *not* hit the server.
   *
   * Removes the discount first, clears the cart, then resets the second screen, the highlighted-seat
   * mirror and the capacity limit.
   */
  clearCart(): void {
    this.#coupons.removeAppliedDiscount();
    this.#memberships.clear();
    this.#memberAccount.clear();
    this.#dropPendingRealTimeCreate();

    if (this.#state.cart) {
      this.#sendClickClearAllCartEvent();
      this.#state.cart = null;
      this.#core.clearCart();
    }
    if (!this.#state.isPreservingCart) {
      this.#state.nonConfirmedCart = null;
      // An emptied selection starts a new sale, so the next contact modal opens empty.
      this.#contactInformationDraft.clear();
    }

    this.resetCartPresentation();
  }

  /**
   * `handleInvalidCartStatus` takes this path. Prefers the cart-detail view handle
   * (`clearAllCartItemsWithoutConfirmation`, which zeroes every line counter and emits
   * `discountRemoved` + `clearAllConfirmed`), falling back to `clearAllCart('button')` only when the
   * panel is not mounted.
   */
  clearCartFromCartDetail(): void {
    if (this.#clearAllCartItemsWithoutConfirmationHandler) {
      this.#clearAllCartItemsWithoutConfirmationHandler();
      return;
    }
    this.clearAllCart('button');
  }

  /** Called from the coupon-removal path. */
  clearCartSessionsWithoutUnits(): void {
    if (!this.#state.cart?.sessionItemsByDatetime) {
      return;
    }

    const hasItemsWithUnits = Array.from(this.#state.cart.sessionItemsByDatetime.values()).some(sessions =>
      sessions.some(session => session.units > 0),
    );

    if (!hasItemsWithUnits) {
      this.#state.cart.sessionItemsByDatetime = null!;
    }
  }

  /**
   * Seating-selector "continue restore" output.
   *
   * `shouldGoBack` has no setter in this flow (there is no back button), so only the two remaining
   * branches are reachable.
   */
  continueRestore(): void {
    if (this.#isReservationSettlementMode()) {
      this.releaseReservationSettlementCartLocally();
      this.restoreToBeginning();
      return;
    }
    if (this.#state.cart) {
      this.#discardCartAndRestore();
      return;
    }
    this.restoreToBeginning();
  }

  /**
   * Adds the `overrideCapacity` flag when sending the create-cart request. On a real-time map the
   * request is flagged `isRealTimeSeating` (fever2 #52725 rebuilds the lines from the OneBox basket) and
   * goes through {@link #sendRealTimeCreate}; real-time callers reach it through {@link createOrUpdateCart},
   * which never lets two of them run at once.
   */
  createCart(cart: Cart): Observable<BaseResponse<Cart>> {
    if (!this.#state.partner) {
      return EMPTY;
    }
    if (this.#state.isRealTimeSeating) {
      return this.#sendRealTimeCreate(cart);
    }
    return this.#core
      .createCart({
        channel: this.#state.channel,
        channelId: this.#state.channelId,
        hasSeating: cart.hasSeating,
        isRealTimeSeating: false,
        locale: cart.locale,
        partnerId: this.#state.partner.id,
        seatingHoldTokensBySessionId: this.#seatingHoldTokensBySessionIdToSend(),
        seatingToken: this.#state.seatingToken,
        sessionItemsByDatetime: this.#flexibleBundle.sessionItemsForCartRequest(cart),
        useSessionItemLines: true,
        ...this.#flexibleBundle.bundleIdsForCartRequest(),
        ...(this.#ticketSelection.shouldSendOverrideCapacity() && { overrideCapacity: true }),
      })
      .pipe(
        tap(response => {
          if (response.data?.id != null) {
            this.#cartTiming.startSale(response.data.id);
          }
        }),
      );
  }

  /**
   * Chooses create vs update: short-circuits during seat-release payment, refreshes
   * `nonConfirmedCart` from the live selection first, and routes updates through
   * {@link #updateCartWithOverrideCapacity}.
   */
  createOrUpdateCart(): Observable<BaseResponse<Cart>> {
    if (this.#state.isReadyForSeatReleasePayment || this.#isReservationSettlementMode()) {
      const cart = this.#state.cart ?? this.#state.nonConfirmedCart;
      return cart ? of({ data: cart, error: null } as BaseResponse<Cart>) : EMPTY;
    }
    const freshCart = this.getCart();
    if (freshCart !== null) {
      this.#state.nonConfirmedCart = freshCart;
    }
    if (!this.#flexibleBundle.canSaveCart()) {
      return EMPTY;
    }
    if (this.#state.isRealTimeSeating) {
      return this.#createOrReuseRealTimeCart();
    }
    if (this.#state.cart === null && this.#state.nonConfirmedCart !== null) {
      const createdSelectionKey = this.#cartWriteSelectionKey(this.#state.nonConfirmedCart, this.#state.seatingToken);
      this.#state.lastCartWrite = null;
      return this.createCart(this.#state.nonConfirmedCart).pipe(tap(response => this.#recordCartWrite(response, createdSelectionKey)));
    }
    const updatedCart = this.#state.currentStep == this.#state.seatingSelectorStep ? this.#state.cart : this.#state.nonConfirmedCart;
    if (!updatedCart) {
      return of();
    }
    const newCart: Cart = new Cart(new Map([...updatedCart.sessionItemsByDatetime]));
    newCart.hasSeating = this.#state.nonConfirmedCart?.hasSeating ?? false;
    const selectionKey = this.#cartWriteSelectionKey(newCart, this.#seatingMapStateToSend()?.hold_token);
    const lastWrite = this.#state.lastCartWrite;
    if (
      lastWrite !== null &&
      lastWrite.cart === this.#state.cart &&
      lastWrite.selectionKey === selectionKey &&
      !this.#cartIdsWithUnorderedUpdates.has(lastWrite.cart.id!)
    ) {
      this.#datadog.logInfo('[OSS-CART] Cart reused, selection unchanged since the last cart write', {
        cartId: lastWrite.cart.id,
        partnerId: this.#state.partner?.id,
      });
      return of(new BaseResponse<Cart>(lastWrite.cart, null));
    }
    newCart.id = this.#state.cart!.id;
    newCart.sessionItemLines = this.#state.cart?.sessionItemLines ?? [];
    this.#state.lastCartWrite = null;
    return this.#updateCartWithOverrideCapacity(newCart, selectionKey);
  }

  /** Post-write bookkeeping: publishes the cart, sets `hasSeating`, advances the step. */
  createOrUpdateCartResponse(response: BaseResponse<Cart>, hasSeating: boolean): void {
    // Every caller passes a response `checkResponseData` let through, so `data` is set; the guard only
    // turns a broken caller into a no-op instead of a TypeError in the log below.
    if (response.data === null) {
      return;
    }
    this.#sendLogConfirmedCart(this.#state.nonConfirmedCart, response.data);

    const previousCart = this.#state.cart;
    const previousPlanCount = this.#countUniquePlans(previousCart);

    this.#state.cart = this.#adoptServerCart(response.data);
    if (this.#state.cart) {
      this.#core.publishCart(this.#state.cart);
      this.#state.cart.hasSeating = hasSeating;
    }

    const currentPlanCount = this.#countUniquePlans(this.#state.cart);

    if (currentPlanCount >= 2 && currentPlanCount > previousPlanCount) {
      this.#toast.add({
        message: this.#translate.instant('boxOffice.cart.newPlanAdded.message'),
        sentiment: AlertSentiment.positive,
        title: this.#translate.instant('boxOffice.cart.newPlanAdded.title'),
      });
    }

    this.#sendClickAddToCartEvent();
    this.goToNextStep();
    this.#secondScreen.updateCart();
  }

  /** `currentNumberOfTickets` — bound by the cart header. */
  get currentNumberOfTickets(): number {
    return this.#state.nonConfirmedCart?.getNumberOfTicketAndProductCounts() ?? 0;
  }

  /**
   * Discards the cart after an unrecoverable payment error, reached from the free-seating branch once
   * the server confirms the cart was already prepared. The local references are cleared **only** when
   * the cart is gone on the server: the discard succeeded, or partners discarded it but could not
   * register the France ABORT. Any other failed discard leaves the cart in place so the next attempt
   * can retry it.
   */
  discardCartAfterPaymentError(): void {
    if (this.#isReservationSettlementMode()) {
      this.releaseReservationSettlementCartLocally();
      this.showModal('boxOffice.cart.reservationSettlementAfterError.title', 'boxOffice.cart.reservationSettlementAfterError.message');
      return;
    }

    if (!this.#state.partner || !this.#state.cart?.id) {
      return;
    }
    const query: DiscardCartQuery = {
      cartId: this.#state.cart.id,
      partnerId: this.#state.partner.id,
    };

    this.#core
      .discardCart(query)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((response: BaseResponse<boolean | null>) => {
        const fiscalAbortPending = isDiscardedWithFiscalAbortPending(response);
        if ((response.data && !response.error) || fiscalAbortPending) {
          this.#state.cart = null;
          this.#state.nonConfirmedCart = null;
          this.#dropPendingRealTimeCreate();
        }
        this.showModal(
          'boxOffice.cart.discardedAfterError.title',
          fiscalAbortPending
            ? 'boxOffice.cart.discardedAfterError.fiscalAbortPendingMessage'
            : 'boxOffice.cart.discardedAfterError.message',
        );
      });
  }

  // ─────────────────────────────────────────── clearing ───────────────────────────────────────────

  /**
   * Unsaved-changes accept path: clears local state, releases seats and discards the server cart,
   * with the `leave_pos` tracking honouring the `#skipClearCartTracking` handshake with
   * {@link getUnloadDiscardCartQuery}.
   *
   * Parity-locked: `PointOfSaleTicketing.releaseSeats()` runs the seat-expiry half before delegating
   * here, so this method must never re-release the seats itself.
   */
  discardCartBeforeNavigation(): Observable<void> {
    if (this.cartHasItems()) {
      if (this.#skipClearCartTracking) {
        this.#skipClearCartTracking = false;
      } else {
        this.#trackCartCleared('leave_pos');
      }
    }

    if (this.#isReservationSettlementMode()) {
      this.releaseReservationSettlementCartLocally();
      return of(void 0);
    }

    const cartId = this.#state.cart?.id ?? this.#state.nonConfirmedCart?.id;
    this.#ticketSelection.clearSelectedTicketsReferences();
    this.#state.seatingHoldTokensBySessionId = new Map();
    this.#state.nonConfirmedCart = null;
    this.#state.seatingToken = null;
    this.#state.cart = null;
    this.#dropPendingRealTimeCreate();
    this.#core.clearCart();
    if (!this.#state.partner || !cartId) {
      return of(void 0);
    }
    const query: DiscardCartQuery = {
      cartId,
      partnerId: this.#state.partner.id,
    };
    return this.#core.discardCart(query).pipe(
      takeUntilDestroyed(this.#destroyRef),
      map((): undefined => void 0),
      catchError(() => of(void 0)),
    );
  }

  /**
   * Builds the client-side cart from the selection maps.
   *
   * Seeds `generateCart` with the current `nonConfirmedCart`, passes `allowMultiTimeSlotSelection` +
   * the current plan ids and drops the seating-hold-token map (`shouldUseSeatingHoldTokensBySession`
   * is always `false`).
   *
   * `generateCart` re-adds only the sessions of the plan on screen, so in the multiplan seating flow
   * the other plans' lines are merged back on top: `createOrUpdateCart()` calls this right before the
   * create/update request and would otherwise drop them from the payload — B2BO-8391.
   *
   * On a seeded modification cart the rebuild prices F&B lines from the product availability, so each line
   * the order held goes back to the order's unit price, surcharge and line data with only its units
   * updated: the units an operator adds on top of the order are charged at the order's price too.
   *
   * A `null` rebuild is passed straight through, because callers read it as "nothing to refresh":
   * `createOrUpdateCart()` keeps the cart it already has. `PosSeatingService.updateSeatsInCart()`,
   * which does assign the `null`, handles it there instead.
   */
  getCart(): Cart | null {
    const productSessions = this.#state.sessionAvailabilitySummary?.productSessions ?? [];
    const sessionContextBySessionId = buildSessionCartContextMap(
      this.#state.selectedSession,
      this.#availability.getOngoingMultiDayBuckets(),
    );
    const previousNonConfirmedCart = this.#state.nonConfirmedCart;
    const rebuiltCart = generateCart({
      allowMultiTimeSlotSelection: this.#state.allowMultiTimeSlotSelection,
      cart: this.#state.nonConfirmedCart ?? new Cart(),
      currentPlanIds: this.#getCurrentPlanIds(),
      sessionTypeDiscounts: this.#purchase.isModifyOrderMode() ? this.#state.modifyOrderSessionTypeDiscounts() : null,
      productSessions,
      realTimeLineName: this.#translate.instant('boxOffice.realTimeSeatsLine'),
      selectedTickets: {
        bySeating: this.#state.selectedTicketsSeatsBySessionId,
        bySessionId: this.#state.selectedTicketsBySessionId,
        bySessionType: this.#state.selectedTicketsBySessionType,
      },
      session: this.#state.selectedSession,
      sessionContextBySessionId: sessionContextBySessionId.size > 0 ? sessionContextBySessionId : undefined,
      timezone: this.#state.timezone,
    });
    this.#keepSeededModifyOrderProductPrices(rebuiltCart);
    const currentPlanId = this.#state.selectedPlan?.id ?? null;
    const shouldPreserveMultiPlanSessions = this.shouldPreserveOtherPlanSessions() && !this.#state.allowMultiTimeSlotSelection;
    if (!shouldPreserveMultiPlanSessions || rebuiltCart === null || previousNonConfirmedCart === null || currentPlanId === null) {
      this.#flexibleBundle.applyUnitPrices(rebuiltCart);
      return this.#keepModifyOrderManualPrices(previousNonConfirmedCart, rebuiltCart);
    }
    const mergedCart = mergeCartSessionsFromOtherPlans(rebuiltCart, previousNonConfirmedCart, currentPlanId);
    this.#flexibleBundle.applyUnitPrices(mergedCart);
    return this.#keepModifyOrderManualPrices(previousNonConfirmedCart, mergedCart);
  }

  /** `getCartMixpanelData` — adds `obo_flow_type`. */
  getCartMixpanelData(): ClickClearAllCartData {
    return {
      cart_id: this.#state.cart?.id ?? '',
      channel: this.#state.channelId ?? this.#state.channel,
      city_id: this.#state.selectedCity.id,
      city_name: this.#state.selectedCity.title,
      obo_flow_type: this.#state.onsiteSetupSelected?.obo_flow_type,
      partner_id: this.#state.partner?.id ?? -1,
      place_id: this.#state.selectedPlace.id,
      place_name: this.#state.selectedPlace.title,
      plan_id: this.#state.selectedPlan.id,
      plan_name: this.#state.selectedPlan.title,
      time: new Date().toISOString(),
    };
  }

  /** Returns the non-confirmed cart, or `null` if none is set. */
  getCurrentCart(): Cart | null {
    return this.#state.nonConfirmedCart;
  }

  /**
   * `pagehide` keepalive path.
   *
   * Tracks `leave_fz`, arming `#skipClearCartTracking` when there is nothing to discard so the
   * follow-up navigation path does not double-count.
   */
  getUnloadDiscardCartQuery(): DiscardCartQuery | null {
    const cartId = this.#state.cart?.id ?? this.#state.nonConfirmedCart?.id;
    const query: DiscardCartQuery | null =
      this.#isReservationSettlementMode() || !cartId || !this.#state.partner
        ? null
        : { cartId, partnerId: this.#state.partner.id, viaCashRegister: true };

    if (this.cartHasItems()) {
      this.#trackCartCleared('leave_fz');
      if (!query) {
        this.#skipClearCartTracking = true;
      }
    }
    return query;
  }

  /**
   * `canGoToCheckout()` is always `false` for this flow, so the checkout-navigation branch never runs
   * and has no equivalent here.
   */
  goToNextStep(): void {
    if (this.#state.manageAsFreeSeatingMap) {
      if (this.#state.currentStep.nextStep) {
        this.#state.currentStep = this.#state.currentStep.nextStep;
        this.#viewUpdate.detectChanges();
      }
    } else {
      this.#priceViewer.showTotal(this.#state.onsiteSetupSelected, this.#state.cart!.total!.currency, this.#state.cart!.total!.amount);
      if (this.#state.currentStep.nextStep) {
        this.#state.currentStep = this.#state.currentStep.nextStep;
      }
    }
    this.#viewUpdate.markForCheck();
  }

  /**
   * `true` when `handleCartContent` completes without a cart as soon as it is called, so the purchase
   * pipeline does not ask for contact details on a sale that cannot go on.
   */
  abortsCartContentAtOnce(): boolean {
    return (
      this.#hasEmptySelection() ||
      this.#ticketSelection.addSessionsToCartIsDisabled() ||
      (this.#managesFreeSeatingMap() && !this.#seating.hasSeatingView())
    );
  }

  /**
   * Free-seating vs regular add-to-cart dispatch used by the purchase pipeline.
   *
   * Recreates `confirmSeatingMap$` so a previous sale's replayed value cannot resolve this one, and
   * disables the early return.
   */
  handleCartContent(): Observable<BaseResponse<Cart> | never | void> {
    if (this.#hasEmptySelection()) {
      this.showModalError();
      return EMPTY;
    }
    if (this.#managesFreeSeatingMap()) {
      // With no seating map mounted there is nothing to confirm, so the payment pipeline aborts
      // instead of waiting forever on `confirmSeatingMap$`.
      if (!this.#seating.hasSeatingView()) {
        return EMPTY;
      }
      this.#state.confirmSeatingMap$.complete();
      this.#state.confirmSeatingMap$ = new ReplaySubject<void>(1);
      this.#seating.finishSeating();
      return this.#state.confirmSeatingMap$;
    }
    return this.addSessionsToCartObservable(false);
  }

  #hasEmptySelection(): boolean {
    return !this.#state.nonConfirmedCart || this.#state.nonConfirmedCart.getNumberOfTicketAndProductCounts() === 0;
  }

  #managesFreeSeatingMap(): boolean {
    return this.#state.manageAsFreeSeatingMap && !this.#isReservationSettlementMode();
  }

  // ────────────────────────────────────── totals / expiry / sync ──────────────────────────────────

  /**
   * Shared with the purchase pipeline's prepare-cart codes. On a real-time map the clear path already
   * discards the confirmed cart (`#discardRealTimeCartOnClear`), so it is not discarded a second time
   * here.
   */
  handleInvalidCartStatus(): Observable<void> {
    if (this.#state.cartRecoveryInProgress) {
      return EMPTY;
    }
    this.#state.cartRecoveryInProgress = true;

    const cartId = this.#state.cart?.id ?? this.#state.nonConfirmedCart?.id ?? null;
    const partnerId = this.#state.partner?.id ?? null;

    this.#datadog.logWarn('[OSS-CART] Invalid cart status detected, discarding cart and resetting state', {
      cartId,
      partnerId,
    });

    // Every caller reaches this from a spinner-covered request (pay, prepare-cart,
    // update-cart), so the spinner must come down before the modal, or the modal is unreachable.
    // `SpinnerService` is a root service, injected directly here for that single call site.
    this.#spinner.hide();
    this.showModal('oneStopShop.errors.cartNoLongerValid.title', 'oneStopShop.errors.cartNoLongerValid.message');
    const clearDiscardsCart = this.#state.isRealTimeSeating && cartId !== null && this.#state.cart?.id === cartId;
    // Through the cart detail, so every line counter is visually reset too.
    this.clearCartFromCartDetail();
    const cartDiscardedByClear = clearDiscardsCart && this.#state.cart === null;
    this.#memberships.clear();
    this.#memberAccount.clear();
    this.#state.cart = null;
    this.#state.nonConfirmedCart = null;
    this.#dropPendingRealTimeCreate();

    const discard$: Observable<unknown> =
      cartId && partnerId && !cartDiscardedByClear
        ? this.#core.discardCart({ cartId, partnerId }).pipe(catchError(() => of(null)))
        : of(null);

    return discard$.pipe(
      take(1),
      map((): undefined => void 0),
      finalize(() => {
        this.#state.cartRecoveryInProgress = false;
      }),
    );
  }

  hasMultiplanSeatingFlowContext(): boolean {
    return this.#ticketingContext.hasMultiplanSeatingFlowContext({
      cart: this.#state.cart,
      nonConfirmedCart: this.#state.nonConfirmedCart,
      sessionSummaries: this.#state.regularSessionAvailabilitySummaryByDateList,
      userAttributes: this.#state.selectedPlan ? { plan_id: this.#state.selectedPlan.id.toString() } : undefined,
    });
  }

  hasSeatingInNonConfirmedCart(): boolean {
    return this.#state.nonConfirmedCart?.hasSeating ?? false;
  }

  /**
   * `generateCart` only re-adds the plan on screen, so the rest need merging back: the seating flow
   * needs it, and so does a moved modification, which reaches partners without `box_office_multiplan_flow`.
   */
  shouldPreserveOtherPlanSessions(): boolean {
    return this.#state.multiPlanCartEnabled && (this.hasMultiplanSeatingFlowContext() || this.#purchase.isCrossPlanModificationActive());
  }

  /**
   * Merges the plans already in the cart being edited with the plan currently selected.
   *
   * The same merge logic is reused by `PosSeatingService.updateSeatsInCart`, gated on
   * {@link shouldPreserveOtherPlanSessions} — the seat path gates the whole merge on it, this path
   * only gates the clone.
   *
   * Returns `true` when lines were merged back, so the caller can refresh whatever it computed from
   * the pre-merge cart.
   */
  mergeMultiplanCart(previousNonConfirmedCart: Cart | null, previousCartReference: Cart | null, currentPlanId: number | null): boolean {
    if (previousNonConfirmedCart == null || currentPlanId == null || this.#state.nonConfirmedCart == null) {
      return false;
    }
    if (this.#state.nonConfirmedCart === previousCartReference) {
      return false;
    }
    if (this.#state.allowMultiTimeSlotSelection) {
      return false;
    }

    const mergedCart = mergeCartSessionsFromOtherPlans(this.#state.nonConfirmedCart, previousNonConfirmedCart, currentPlanId);
    if (mergedCart === this.#state.nonConfirmedCart) {
      return false;
    }
    this.#state.nonConfirmedCart = mergedCart;
    return true;
  }

  /** Seating-selector "clear selection" callback. */
  onClearSelectionRequested(): void {
    if (this.#isReservationSettlementMode()) {
      this.releaseReservationSettlementCartLocally();
      return;
    }

    const cartId = this.#state.cart?.id ?? this.#state.nonConfirmedCart?.id;
    this.#ticketSelection.clearSelectedTicketsReferences();
    this.#state.seatingHoldTokensBySessionId = new Map();
    this.#state.nonConfirmedCart = null;
    this.#state.seatingToken = null;
    this.#state.cart = null;
    this.#dropPendingRealTimeCreate();
    this.#core.clearCart();
    if (!cartId || !this.#state.partner) {
      return;
    }
    const query: DiscardCartQuery = {
      cartId,
      partnerId: this.#state.partner.id,
    };
    this.#core.discardCart(query).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  /** Also used by the coupon apply path. */
  printTotal(onsiteSetup: OnsiteSetup, total: Money): void {
    if (this.#state.totalPrintViewerTimeout) {
      clearTimeout(this.#state.totalPrintViewerTimeout);
    }
    if (total.amount <= 0) {
      this.#priceViewer.clear(this.#state.onsiteSetupSelected);
      return;
    }

    this.#state.totalPrintViewerTimeout = setTimeout(
      () => {
        this.#priceViewer.showTotal(onsiteSetup, total.currency, total.amount);
        this.#state.totalPrintViewerTimeout = undefined;
      },
      this.#state.showOnlyTotalInPriceViewer ? 0 : 1500,
    );
  }

  /** `PointOfSaleComponent` hands over its `OssCartDetailComponent` `ViewChild` calls. */
  registerClearAllCartItemsWithoutConfirmationHandler(handler: () => void): void {
    this.#clearAllCartItemsWithoutConfirmationHandler = handler;
  }

  releaseReservationSettlementCartLocally(): void {
    this.#ticketSelection.clearSelectedTicketsReferences();
    this.#state.seatingHoldTokensBySessionId = new Map();
    this.#state.nonConfirmedCart = null;
    this.#state.seatingToken = null;
    this.#state.cart = null;
    this.#dropPendingRealTimeCreate();
    this.#core.clearCart();
    this.#purchase.clearReservationSettlementSession();
    this.#purchase.clearReservationSettlementParams();
    this.#coupons.removeAppliedDiscount();
  }

  resetCartPresentation(): void {
    this.#secondScreenData.resetCart();
    this.#secondScreen.clearHighlightedSeats();
    this.#viewUpdate.markForCheck();
    this.#ticketSelection.updateCapacityLimit();
  }

  /**
   * `resetScroll` (composed with `#scrollToBoxOfficeContent`) — DOM-only, no component reference
   * needed.
   *
   * Public because `PosSeatingService.setPreviousAndNextSteps` needs this method's trailing leg,
   * which is only reachable from this domain's call paths.
   */
  resetScroll(): void {
    if (this.#state.channel === Channel.Kiosk) {
      return;
    }
    if (this.#dualScreenStorage.containsData()) {
      ScrollUtils.scrollToTop();
    } else if (window.innerWidth < 1200) {
      this.#scrollToBoxOfficeContent();
    }
  }

  /**
   * Back to the empty ticket-selector state.
   *
   * Drops the seating-map load context, clears the cart, then re-pushes the (now empty) cart to the
   * second screen.
   */
  restoreToBeginning(): void {
    this.#state.lastSeatingMapLoadContext = null;

    this.#state.shouldRestoreToBeginning = false;
    this.clearCart();
    this.#ticketSelection.clearSelectedTickets();
    this.#state.seatingMapUrl = null;
    this.#state.seatingMapState = null;
    this.#state.seatingToken = null;
    this.#state.seatingHoldTokensBySessionId = new Map();
    this.#state.currentStep = this.#state.ticketSelectorStep;
    this.#state.showCartDetails = false;
    this.#resetSelectedTickets();
    this.#seating.updateFreeMapMode();
    this.#viewUpdate.detectChanges();
    this.resetScroll();

    this.#secondScreen.updateCart();
  }

  /** Debounced total recomputation. */
  setupDebouncedCartTotal(): void {
    this.#state.updateCartTotalTrigger$
      .pipe(
        switchMap(() =>
          timer(cartTotalDebounceMs).pipe(
            switchMap(() => {
              if (this.#state.isReadyForSeatReleasePayment) {
                return EMPTY;
              }
              if (this.#state.coupon && !this.#coupons.hasStackedCoupons()) {
                if (this.#state.isRealTimeSeating || this.#isReservationSettlementMode()) {
                  // Re-applying would create a new server cart per seat click on a real-time map (no
                  // update-cart there); the coupon is validated already and applied at pay, so the
                  // total is recomputed locally. A reservation settlement makes no coupon request at all.
                  this.updateCartTotalMoney(this.getCurrentCart(), this.#state.coupon);
                  this.#secondScreen.updateCart();
                  this.#viewUpdate.markForCheck();
                  this.printTotal(this.#state.onsiteSetupSelected, this.#state.cartTotalMoney);
                  return EMPTY;
                }
                // Returns the Observable *into* the `switchMap`, so a new trigger cancels an
                // in-flight coupon re-apply. Returning it (instead of firing the `void` form, which
                // self-subscribes) is what preserves that cancellation.
                return this.#coupons.reapplyCouponOneStep$(this.#state.coupon.code);
              }
              this.updateCartTotalImmediate();
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  /** `showModal` — the Kiosk `windowClass` branch is dead for the POS channel. */
  showModal(title: string, message: string, errorCode?: string | number): void {
    this.#ui
      .request('error', { errorCode, logError: this.#state.logErrorModal, message, title })
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe();
  }

  showModalError(errorMessage?: string, titleError?: string): void {
    this.showModal(titleError ?? 'common.errorTitle', errorMessage ?? 'errors.generic');
  }

  // ─────────────────────────────────────────── lifecycle ─────────────────────────────────────────

  /** Used by every coupon add/remove path. */
  syncCartChanges(cart: Cart | null, coupon?: Coupon): void {
    const incomingMatchesLocal =
      cart !== null &&
      (this.#state.nonConfirmedCart === null ? this.#countCartUnits(cart) === 0 : this.#state.nonConfirmedCart.hasSameContent(cart));

    if (incomingMatchesLocal) {
      const localCart = this.#state.nonConfirmedCart;
      this.updateCartTotalMoney(cart, coupon);
      this.#state.nonConfirmedCart = cart?.clone() ?? null;
      if (this.#state.nonConfirmedCart) {
        restoreLocalCartPresentation(this.#state.nonConfirmedCart, localCart);
      }
    } else {
      this.updateCartTotalMoney(this.#state.nonConfirmedCart, coupon);
    }
  }

  trackCartItemQuantityChange(opts: { newCount: number; previousCount: number; sessionId: number | string; source: PosCartSource }): void {
    this.#trackQuantityChange.track({
      newCount: opts.newCount,
      planId: this.#state.selectedPlan?.id ?? 0,
      previousCount: opts.previousCount,
      productTypes: this.#state.productTypes,
      sessionId: opts.sessionId,
      source: opts.source,
      ticketTypes: this.#state.ticketTypes,
    });
  }

  syncFlexibleBundlePricing(): void {
    this.#repriceScreenCart();

    if (!this.#flexibleBundle.shouldResendCart()) {
      return;
    }

    this.#flexibleBundleSync?.unsubscribe();
    this.#flexibleBundleSync = this.createOrUpdateCart()
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: unknown) => this.#datadog.logError('[OBO-CART] Flexible bundle cart sync failed', { error }),
        next: (response: BaseResponse<Cart>) => {
          if (response.data === null || response.data.id !== this.#state.cart?.id) {
            return;
          }

          this.#state.cart = this.#adoptServerCart(response.data);
          this.#core.publishCart(this.#state.cart);
          this.#repriceScreenCart();
          if (this.#state.coupon) {
            this.#state.updateCartTotalTrigger$.next();
          }
        },
      });
  }

  updateCartTotalImmediate(): void {
    this.updateCartTotalMoney(this.getCurrentCart());
    this.#secondScreen.updateCart();
    this.#viewUpdate.markForCheck();
    this.printTotal(this.#state.onsiteSetupSelected, this.#state.cartTotalMoney);
  }

  // ──────────────────────────────────── shared cart-domain helpers ────────────────────────────────

  updateCartTotalMoney(cart: Cart | null, coupon?: Coupon): void {
    const isSettlement = this.#isReservationSettlementMode();
    const requestedCoupon = isSettlement ? (coupon ?? this.#state.coupon ?? undefined) : coupon;
    const effectiveCoupon = this.#getEffectiveCouponForCartTotal(cart, requestedCoupon);
    if (cart !== null) {
      cart.appliedCoupon = effectiveCoupon ?? null;
      cart.appliedPlanDiscounts = selectEffectivePlanDiscounts(this.#memberships.data().planDiscounts, cart);
      if (isSettlement) {
        applyReservationSettlementDiscount(cart, effectiveCoupon);
      } else {
        cart.calculateTotal(effectiveCoupon);
      }

      const totalMoney: Money = cart.total ?? new Money(0, '');
      const currency = totalMoney.currency || this.#state.currency || '';
      this.#state.cartTotalMoney = new Money(totalMoney.amount, currency);

      const totalMoneyWithoutCoupon: Money = cart.totalWithoutDiscount ?? new Money(0, '');
      const currencyWithoutCoupon = totalMoneyWithoutCoupon.currency || this.#state.currency || '';
      this.#state.cartTotalMoneyWithoutCoupon = new Money(totalMoneyWithoutCoupon.amount, currencyWithoutCoupon);
    } else {
      const emptyCurrency = this.#state.currency ?? '';
      this.#state.cartTotalMoney = new Money(0, emptyCurrency);
      this.#state.cartTotalMoneyWithoutCoupon = new Money(0, emptyCurrency);
    }

    this.#state.cartHasEffectiveDiscount = this.#state.cartTotalMoneyWithoutCoupon?.amount !== this.#state.cartTotalMoney?.amount;

    this.#viewUpdate.markForCheck();
  }

  /**
   * Recomputes `nonConfirmedCart` from the current selection.
   *
   * Snapshots the pre-update cart (cloning it only in the multiplan seating context), rebuilds the
   * cart, pushes the update to the second screen, then finishes with the multiplan merge.
   */
  updateNonConfirmedCart(): void {
    if (this.#isReservationSettlementMode()) {
      this.#secondScreen.updateCart();
      this.#viewUpdate.markForCheck();
      return;
    }

    const previousCartReference = this.#state.nonConfirmedCart;
    const previousNonConfirmedCart =
      this.shouldPreserveOtherPlanSessions() && this.#state.nonConfirmedCart != null
        ? this.#state.nonConfirmedCart.clone()
        : this.#state.nonConfirmedCart;
    const currentPlanId = this.#state.selectedPlan?.id ?? null;

    this.#updateNonConfirmedCartBase();

    this.#secondScreen.updateCart();
    this.#viewUpdate.markForCheck();

    this.mergeMultiplanCart(previousNonConfirmedCart, previousCartReference, currentPlanId);
  }

  #addSessionsToCartLoadSeatingMap(notifier: ObservableInput<unknown> | null): Observable<BaseResponse<Cart>> {
    const loadSeatingMap$: Observable<BaseResponse<Cart>> = this.#seating.loadSeatingMap().pipe(
      mergeMap(() => this.createOrUpdateCart()),
      mergeMap(response => this.checkResponseData(response)),
      tap((response: BaseResponse<Cart>) => this.createOrUpdateCartResponse(response, this.hasSeatingInNonConfirmedCart())),
      finalize(() => {
        this.#state.isLoadingCart = false;
        this.#viewUpdate.detectChanges();
      }),
      catchError((response: BaseResponse<null> | HttpErrorResponse | null) => {
        this.showModalError(response?.error?.message);
        return EMPTY;
      }),
    );
    return notifier !== null ? loadSeatingMap$.pipe(takeUntil(notifier)) : loadSeatingMap$;
  }

  #addSessionsToCartSetProps(): void {
    this.#state.isLoadingCart = true;
    this.#state.seatingMapState = null;
    this.#state.seatingToken = null;
  }

  get #availability(): PosAvailabilityService {
    return this.#injector.get(PosAvailabilityService);
  }

  #cartWriteSelectionKey(cart: Cart, holdToken: string | null | undefined): string {
    const holdTokensBySessionId = this.#seatingHoldTokensBySessionIdToSend();
    const lines = [...cart.sessionItemsByDatetime.values()]
      .flat()
      .map((session: CartSession) => [
        session.sessionId,
        session.units,
        session.mainPlanId,
        session.seats,
        session.seatLabels ?? session.seats,
        session.seats != null ? (holdTokensBySessionId?.get(session.sessionId.toString()) ?? session.seatingHoldToken ?? holdToken) : null,
      ]);
    return JSON.stringify([lines, this.#ticketSelection.shouldSendOverrideCapacity(), this.#flexibleBundle.cartWriteSelection()]);
  }

  #countCartUnits(cart: Cart | null): number {
    if (!cart?.sessionItemsByDatetime) return 0;
    return Array.from(cart.sessionItemsByDatetime.values())
      .flat()
      .reduce((total, session) => total + (session.units ?? 0), 0);
  }

  #countUniquePlans(cart: Cart | null): number {
    if (!cart) {
      return 0;
    }

    const planIds = new Set<number>();
    for (const sessions of cart.sessionItemsByDatetime.values()) {
      for (const session of sessions) {
        if (session.mainPlanId !== undefined) {
          planIds.add(session.mainPlanId);
        }
      }
    }

    return planIds.size;
  }

  get #coupons(): PosCouponsService {
    return this.#injector.get(PosCouponsService);
  }

  // ─────────────────────────────────────────── internals ──────────────────────────────────────────

  /**
   * Update-cart has no real-time path on the backend (fever2 #52725 covers creation only) and discarding
   * a real-time cart releases the OneBox basket (`OneboxCartDiscarder` removes the seats of the hold
   * token), so the confirmed cart is reused while the selection it was created from is unchanged, and
   * otherwise superseded by a new create that takes the basket over (the backend nulls the previous
   * cart's `external_order_id`; the previous cart is never discarded and expires on its own).
   *
   * Real-time creates are serialised: while one is in flight the next caller waits for it to settle and
   * decides again on the state it left, so only one request ever touches the basket and responses land
   * in the order they were sent.
   */
  #createOrReuseRealTimeCart(): Observable<BaseResponse<Cart>> {
    const pending$ = this.#realTimeCreateSettled$;
    if (pending$ !== null) {
      this.#datadog.logInfo('[OSS-CART] Real-time cart creation in flight, waiting for it before deciding', {
        partnerId: this.#state.partner?.id,
      });
      const generation = this.#realTimeGeneration;
      // A reset while waiting (clear, date change, route leave) ends the wait: deciding again would create a
      // cart for a sale that no longer exists.
      return pending$.pipe(switchMap(() => (generation === this.#realTimeGeneration ? this.createOrUpdateCart() : EMPTY)));
    }
    const cart = this.#state.cart;
    const nonConfirmedCart = this.#state.nonConfirmedCart;
    if (cart === null) {
      return nonConfirmedCart === null ? of() : this.#sendRealTimeCreate(nonConfirmedCart);
    }
    const createdFrom = this.#state.realTimeCartSelectionKey;
    const isSelectionUnchanged =
      nonConfirmedCart === null ||
      (createdFrom !== null && createdFrom.cartId === cart.id && createdFrom.selectionKey === this.#realTimeSelectionKey(nonConfirmedCart));
    if (isSelectionUnchanged) {
      this.#datadog.logInfo('[OSS-CART] Real-time cart reused, selection unchanged since it was created', {
        cartId: cart.id,
        partnerId: this.#state.partner?.id,
      });
      return of(new BaseResponse<Cart>(cart, null));
    }
    this.#datadog.logInfo('[OSS-CART] Real-time selection changed, superseding the cart without discarding it', {
      partnerId: this.#state.partner?.id,
      previousCartId: cart.id,
    });
    // `state.cart` keeps the previous cart until the new one lands: it stays valid on the server until
    // the new one takes the basket over, so a rejected create leaves the POS with the cart it had.
    return this.#sendRealTimeCreate(nonConfirmedCart);
  }

  #discardCartAndRestore(): void {
    if (!this.#state.partner) {
      this.restoreToBeginning();
      return;
    }
    const query: DiscardCartQuery = {
      cartId: this.#state.cart!.id!,
      partnerId: this.#state.partner.id,
    };

    this.#core
      .discardCart(query)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.restoreToBeginning()),
      )
      .subscribe();
  }

  /** A reset that clears or unmounts the sale: a real-time create still in flight must not land afterwards. */
  #dropPendingRealTimeCreate(): void {
    this.#realTimeGeneration += 1;
    this.#realTimeCreateSettled$ = null;
    this.#state.realTimeCartSelectionKey = null;
  }

  #adoptServerCart(cart: Cart): Cart {
    const displayCart = this.#flexibleBundle.adoptServerCart(cart);
    this.updateCartTotalMoney(displayCart, this.#state.coupon ?? undefined);
    return displayCart;
  }

  #repriceScreenCart(): void {
    const rebuiltCart = this.getCart();

    if (rebuiltCart !== null) {
      this.#state.nonConfirmedCart = rebuiltCart;
    }

    this.updateCartTotalMoney(this.#state.nonConfirmedCart, this.#state.coupon ?? undefined);
    this.#viewUpdate.markForCheck();
    this.#secondScreen.updateCart();
  }

  #getAllSessions(): SessionAvailability[] {
    return [
      ...this.#state.productSessions,
      ...(this.#state.selectedSession?.sessionAvailabilityByDatetimeList?.flatMap(datetime => datetime.sessionAvailabilityList) ?? []),
    ];
  }

  #getAllSessionsAvailability(): SessionAvailability[] {
    const sessionAvailabilityByDateTime = flatArray(
      [...this.#state.regularSessionAvailabilitySummaryByDateList].map(availability => availability.sessionAvailabilityByDatetimeList),
    );
    return flatArray(sessionAvailabilityByDateTime.map(session => session.sessionAvailabilityList));
  }

  #getAllSessionsIds(cart: Cart): Array<number> {
    return flatArray(Array.from(cart?.sessionItemsByDatetime.values() || [])).map(session => session.sessionId);
  }

  /**
   * What a real-time cart was created from: per session, the units, the line's unit price and every seat
   * with its label, plus the basket token. Unnumbered sectors repeat the seat reference, so the price is
   * what tells a price-type change with the same count apart (the wrapper exposes no per-item id).
   */
  #realTimeSelectionKey(cart: Cart): string {
    const lines = [...cart.sessionItemsByDatetime.values()]
      .flat()
      .map((session: CartSession) => {
        const seats = (session.seats ?? [])
          .map((reference: string, index: number) => `${reference}/${session.seatLabels?.[index] ?? ''}`)
          .sort()
          .join(',');
        return `${session.sessionId}:${session.units}:${session.unitPrice?.amount ?? ''}:${seats}`;
      })
      .sort()
      .join('|');
    return `${lines}#${this.#state.seatingToken ?? ''}`;
  }

  /**
   * The seated lines of a real-time cart must name the real-time plan: fever2 #52733 validates that plan
   * and the cashier's resources against it. `generateCart` falls back to `currentPlanIds[0]`, which in a
   * multi-plan timeslot may be another plan, so the line takes the anchor session's own plan first and
   * the plan on screen second. A session whose plan differs from the plan on screen (a showcase plan)
   * is logged, since the map was loaded for the plan on screen. `nonConfirmedCart` is never mutated.
   */
  #realTimeSessionItems(sessionItemsByDatetime: Map<string, CartSession[]>): Map<string, CartSession[]> {
    const availabilities: SessionAvailability[] = this.#state.selectedSession?.selectedDatetime?.sessionAvailabilityList ?? [];
    const selectedPlanId = this.#state.selectedPlan?.id;
    return new Map(
      [...sessionItemsByDatetime.entries()].map(([datetime, sessions]: [string, CartSession[]]) => [
        datetime,
        sessions.map((session: CartSession) => this.#withRealTimePlan(session, availabilities, selectedPlanId)),
      ]),
    );
  }

  #trackCartUpdateOrdering(cartId: string): MonoTypeOperatorFunction<BaseResponse<Cart>> {
    const markUnordered = (reason: 'overlapping' | 'cancelled' | 'failed'): void => {
      if (this.#cartIdsWithUnorderedUpdates.has(cartId)) {
        return;
      }
      this.#cartIdsWithUnorderedUpdates.add(cartId);
      this.#datadog.logInfo('[OSS-CART] Cart reuse disabled, its updates may have landed out of order', {
        cartId,
        partnerId: this.#state.partner?.id,
        reason,
      });
    };
    return source =>
      defer(() => {
        if (this.#cartUpdatesInFlight > 0) {
          markUnordered('overlapping');
        }
        this.#cartUpdatesInFlight++;
        let answered = false;
        const settle = (): void => {
          if (!answered) {
            answered = true;
            this.#cartUpdatesInFlight--;
          }
        };
        const fail = (reason: 'cancelled' | 'failed'): void => {
          if (!answered) {
            markUnordered(reason);
            settle();
          }
        };
        return source.pipe(
          tap({
            complete: settle,
            error: () => fail('failed'),
            next: response => (response.error == null ? settle() : fail('failed')),
            unsubscribe: () => fail('cancelled'),
          }),
        );
      });
  }

  #recordCartWrite(response: BaseResponse<Cart>, selectionKey: string): void {
    if (response.data != null && response.error == null) {
      this.#state.lastCartWrite = { cart: response.data, selectionKey };
    }
  }

  /**
   * One hold token per session for the multiplan seating flow, `undefined` otherwise.
   *
   * Each plan's seating map issues its own hold token. With one plan in the cart the global
   * `seatingToken` was always the right one, but a multiplan seated cart carries seats from two maps:
   * stamping the last token on every line makes the backend reject the order with "Problem assigning
   * seats" (802), because the token does not own the other plan's seats. The One Stop Shop twin gates
   * this the same way, through `shouldUseSeatingHoldTokensBySession` — B2BO-8391.
   */
  #seatingHoldTokensBySessionIdToSend(): Map<string, string> | undefined {
    return this.#state.multiPlanCartEnabled ? this.#state.seatingHoldTokensBySessionId : undefined;
  }

  #seatingMapStateToSend(): SeatingMapState | undefined {
    return this.#state.seatingMapState && !this.#state.seatingMapState.hold_token && this.#state.seatingToken
      ? { ...this.#state.seatingMapState, hold_token: this.#state.seatingToken }
      : (this.#state.seatingMapState ?? undefined);
  }

  #getCurrentPlanIds(): number[] {
    const sessionAvailabilities = this.#state.selectedSession?.selectedDatetime?.sessionAvailabilityList ?? [];
    const planIds = new Set<number>();
    for (const session of sessionAvailabilities) {
      if (session.mainPlanId) {
        planIds.add(session.mainPlanId);
      }
    }
    return Array.from(planIds);
  }

  #getEffectiveCouponForCartTotal(cart: Cart | null, coupon?: Coupon): Coupon | undefined {
    if (this.#memberships.hasActivePerks()) {
      return undefined;
    }

    if (!this.#coupons.hasStackedCoupons() || cart === null) {
      return coupon;
    }

    this.#coupons.refreshCouponCombinationAggregates(cart);
    return this.#state.effectiveCombinedCoupon ?? undefined;
  }

  /** Shared predicate used by both expiry variants. A settlement cart already holds its tickets, so its sessions are never re-checked. */
  #hasSessionAboutToExpire(): boolean {
    if (this.#isReservationSettlementMode()) {
      return false;
    }
    const allSessionsAvailability: SessionAvailability[] = this.#getAllSessionsAvailability();
    const allSessionsIds: number[] = this.#getAllSessionsIds(this.#state.nonConfirmedCart!);
    return allSessionsIds.some(sessionId => {
      const sessionAvailability: SessionAvailability | undefined = allSessionsAvailability.find(
        (availability: SessionAvailability) => availability.id === sessionId,
      );
      return !!sessionAvailability?.purchasableUntilDate && this.#ticketSelection.isSessionDisabledConsideringOverride(sessionAvailability);
    });
  }

  #invalidCartStatusMatches(errorCode: string | number | undefined, codes: readonly number[]): boolean {
    if (errorCode == null) {
      return false;
    }
    const code = Number(errorCode);
    return codes.includes(code);
  }

  #isReservationSettlementMode(): boolean {
    return this.#reservationSettlementSession.session() !== null;
  }

  get #purchase(): PosPurchaseService {
    return this.#injector.get(PosPurchaseService);
  }

  /**
   * A rebuilt modification cart keeps the manual price of each line the operator priced (GAME-2287), over the order price the
   * seeded product lines take back. A cart that can no longer travel as lines (a seated, packed or add-on line joined it) drops
   * them, because fever2 would ignore them.
   */
  #keepModifyOrderManualPrices(previousCart: Cart | null, rebuiltCart: Cart | null): Cart | null {
    if (rebuiltCart === null || !this.#purchase.isModifyOrderMode() || !canUseCartSessionItemLines(rebuiltCart.sessionItemsByDatetime)) {
      return rebuiltCart;
    }
    return carryManualPrices(previousCart, rebuiltCart);
  }

  #keepSeededModifyOrderProductPrices(cart: Cart | null): void {
    const seededLines = this.#state.modifyOrderSeededProductLines;
    const productLines = cart?.sessionItemsByDatetime.get(PRODUCTS_GROUP_KEY);
    if (!cart || !productLines || !this.#state.isModifyOrderCartSeeded || seededLines.size === 0) {
      return;
    }
    let keptOrderLines = false;
    const lines = productLines.map(line => {
      const seeded = seededLines.get(line.sessionId);
      if (!seeded) {
        return line;
      }
      keptOrderLines = true;
      const orderLine = seeded.line.clone();
      orderLine.units = line.units;
      return orderLine;
    });
    if (!keptOrderLines) {
      return;
    }
    cart.sessionItemsByDatetime.set(PRODUCTS_GROUP_KEY, lines);
    cart.calculateTotal(cart.appliedCoupon ?? undefined);
  }

  #resetSelectedTickets(): void {
    this.#availability.selectDefaultSessionForAdvancedFlow();
    this.#ticketSelection.updateTicketTypeFields();
  }

  #scrollToBoxOfficeContent(): void {
    setTimeout(() => {
      const boxOfficeContent =
        document.getElementsByClassName('box-office-content__content-card')?.[0] ||
        document.getElementsByClassName('box-office-content')?.[0];
      const boxOfficeContentPosition = boxOfficeContent?.getBoundingClientRect().top || 0;
      window.scrollTo({
        behavior: 'smooth',
        top: boxOfficeContentPosition - document.body.getBoundingClientRect().top - 100,
      });
    });
  }

  get #seating(): PosSeatingService {
    return this.#injector.get(PosSeatingService);
  }

  get #secondScreen(): PosSecondScreenService {
    return this.#injector.get(PosSecondScreenService);
  }

  #sendClickAddToCartEvent(): void {
    this.#trackingLegacy.track(
      new ClickAddToCartEvent({
        ...this.getCartMixpanelData(),
        ticketing_flow: 'date_ticket',
      }),
    );
  }

  #sendClickClearAllCartEvent(): void {
    this.#trackingLegacy.track(new ClickClearAllCartEvent(this.getCartMixpanelData()));
  }

  #sendLogConfirmedCart(nonConfirmedCart: Cart | null, confirmedCart: Cart): void {
    this.#datadog.logInfo(`[OBO-CART] CONFIRMED - Total: ${confirmedCart.total?.amount} ${confirmedCart.total?.currency}`, {
      cartTotalMoney: confirmedCart.total,
      coupon: confirmedCart.appliedCoupon,
      numberOfTickets: confirmedCart.numberOfTickets,
    });
    if (nonConfirmedCart === null) {
      return;
    }
    const hasSameCounts = nonConfirmedCart.getNumberOfTicketAndProductCounts() === confirmedCart.getNumberOfTicketAndProductCounts();
    if (hasSameCounts && nonConfirmedCart.total?.amount === confirmedCart.total?.amount) {
      this.#datadog.logInfo('[OBO-CART] Confirmed and non confirmed cart are equals ', {
        confirmedCart,
        nonConfirmedCart,
      });
    } else if (hasSameCounts && this.#state.isRealTimeSeating) {
      // Expected on a real-time map with the same counts: the local line is priced from the map and keyed
      // by the summary session, the backend rebuilds it from the OneBox basket (spec R3 / R6). A count
      // mismatch (the basket materialised fewer seats than selected) stays an error.
      this.#datadog.logInfo('[OBO-CART] Confirmed and non confirmed cart are different (real-time seating) ', {
        confirmedCart,
        nonConfirmedCart,
      });
    } else {
      this.#datadog.logError('[OBO-CART] Confirmed and non confirmed cart are different ', {
        confirmedCart,
        nonConfirmedCart,
      });
    }
  }

  /**
   * Sends one real-time create and marks it in flight until it settles. The result is written to the
   * state here and not only by the callers, because the coupon flow runs under a `switchMap` that can
   * drop its subscriber while the POST completes: the server cart owns the basket from that moment on.
   * A response that lands after a reset (clear, date change, route leave: they bump the generation or
   * drop the token or the map) neither writes nor reaches the callers.
   */
  #sendRealTimeCreate(cart: Cart): Observable<BaseResponse<Cart>> {
    const partner = this.#state.partner;
    if (!partner) {
      return EMPTY;
    }
    const generation = this.#realTimeGeneration;
    const requestedToken = this.#state.seatingToken;
    const selectionKey = this.#realTimeSelectionKey(cart);
    const isStillCurrent = (): boolean =>
      generation === this.#realTimeGeneration && this.#state.isRealTimeSeating && this.#state.seatingToken === requestedToken;
    const markSettled = (): void => {
      if (generation === this.#realTimeGeneration) {
        this.#realTimeCreateSettled$ = null;
      }
    };
    const response$ = this.#core
      .createCart({
        channel: this.#state.channel,
        channelId: this.#state.channelId,
        hasSeating: cart.hasSeating,
        isRealTimeSeating: true,
        locale: cart.locale,
        partnerId: partner.id,
        seatingHoldTokensBySessionId: this.#seatingHoldTokensBySessionIdToSend(),
        seatingToken: requestedToken,
        sessionItemsByDatetime: this.#realTimeSessionItems(cart.sessionItemsByDatetime),
        useSessionItemLines: true,
        ...(this.#ticketSelection.shouldSendOverrideCapacity() && { overrideCapacity: true }),
      })
      .pipe(
        tap({
          complete: markSettled,
          error: markSettled,
          next: (response: BaseResponse<Cart>) => {
            markSettled();
            const created = response.data;
            if (!isStillCurrent() || created?.id == null) {
              return;
            }
            this.#state.realTimeCartSelectionKey = { cartId: created.id, selectionKey };
            created.hasSeating = this.#state.nonConfirmedCart?.hasSeating ?? false;
            this.#state.cart = created;
            this.#core.publishCart(created);
            this.#cartTiming.startSale(created.id);
          },
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.#realTimeCreateSettled$ = response$.pipe(
      map((): undefined => void 0),
      catchError(() => of(void 0)),
      defaultIfEmpty(void 0),
      take(1),
    );
    // Started here so the request settles (and frees the next caller) even if no caller subscribes;
    // callers get the replayed result, errors included.
    response$
      .pipe(
        catchError(() => EMPTY),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
    // Callers get the result only while it is still current (same generation, map and token), errors included:
    // a stale response must not reach `confirmSeating` or the coupon flow, nor open the error modal.
    return response$.pipe(
      catchError((error: unknown) => (isStillCurrent() ? throwError(() => error) : EMPTY)),
      filter(() => isStillCurrent()),
    );
  }

  get #ticketSelection(): PosTicketSelectionService {
    return this.#injector.get(PosTicketSelectionService);
  }

  #trackCartCleared(source: PosCartClearedSource): void {
    this.#tracking.track(
      posCartCleared({
        planId: this.#state.activePlan()?.id ?? null,
        source,
      }),
    );
  }

  /** Sends the update-cart request with the override-capacity flag, retrying via discard+recreate on invalid-cart-status codes. */
  #updateCartWithOverrideCapacity(cart: Cart, selectionKey: string): Observable<BaseResponse<Cart>> {
    if (!this.#state.partner) {
      return EMPTY;
    }
    const partnerId = this.#state.partner.id;
    const seatingMapState = this.#seatingMapStateToSend();
    const discardCartQuery: DiscardCartQuery = {
      cartId: cart.id!,
      partnerId,
    };
    if (cart.hasSeating !== true && this.#core.isCartPrepared(cart.id)) {
      return this.#recreateCart(cart, discardCartQuery, seatingMapState?.hold_token);
    }
    return this.#core
      .updateCart({
        cartId: cart.id!,
        channel: this.#state.channel,
        hasSeating: cart.hasSeating,
        partnerId,
        seatingHoldTokensBySessionId: this.#seatingHoldTokensBySessionIdToSend(),
        seatingMapState,
        sessionItemLines: cart.sessionItemLines,
        sessionItemsByDatetime: this.#flexibleBundle.sessionItemsForCartRequest(cart),
        useSessionItemLines: true,
        ...this.#flexibleBundle.bundleIdsForCartRequest(),
        ...(this.#ticketSelection.shouldSendOverrideCapacity() && { overrideCapacity: true }),
      })
      .pipe(
        this.#trackCartUpdateOrdering(cart.id!),
        switchMap(response => {
          const errorCode = response.error?.code;
          const isFixUpdateCartEnabled =
            this.#state.channel === Channel.BoxOffice && (this.#optimizely.isFeatureEnabled('fix_update_cart_box_office') ?? false);
          if (cart.hasSeating === true && this.#invalidCartStatusMatches(errorCode, invalidCartStatusCodesForUpdate)) {
            return this.handleInvalidCartStatus().pipe(switchMap(() => EMPTY));
          }
          if (this.#invalidCartStatusMatches(errorCode, invalidCartStatusCodesForUpdate)) {
            return this.#recreateCart(cart, discardCartQuery, seatingMapState?.hold_token);
          }
          if (isFixUpdateCartEnabled) {
            return this.#core.getCart(partnerId, cart.id!).pipe(
              tap(freshCart => {
                if (response.error == null) {
                  this.#recordCartWrite(freshCart, selectionKey);
                }
              }),
            );
          }
          this.#recordCartWrite(response, selectionKey);
          return of(response);
        }),
        catchError((error: unknown) => {
          const code = (error as BaseResponse<unknown> | undefined)?.error?.code;
          if (cart.hasSeating === true && this.#invalidCartStatusMatches(code, invalidCartStatusCodesForUpdate)) {
            return this.handleInvalidCartStatus().pipe(switchMap(() => EMPTY));
          }
          return throwError(() => error);
        }),
      );
  }

  #recreateCart(cart: Cart, discardCartQuery: DiscardCartQuery, holdToken: string | null | undefined): Observable<BaseResponse<Cart>> {
    return this.#core.discardCart(discardCartQuery).pipe(
      switchMap(() => this.createCart(cart)),
      switchMap(response => this.checkResponseData(response)),
      tap(response => {
        const recreatedCart = response.data;
        if (recreatedCart === null) {
          return;
        }
        this.#state.cart = recreatedCart;
        this.#core.publishCart(recreatedCart);
        recreatedCart.hasSeating = this.#state.nonConfirmedCart?.hasSeating ?? false;
        this.#recordCartWrite(response, this.#cartWriteSelectionKey(recreatedCart, holdToken));
      }),
    );
  }

  /** Core recompute logic for `updateNonConfirmedCart`. */
  #updateNonConfirmedCartBase(): void {
    if (!this.#state.selectedSession?.selectedDatetime?.datetime && !this.#state.isPreservingCart) {
      this.restoreToBeginning();
    }
    if (this.#state.ticketCounterHasErrors) {
      if (!this.#state.isPreservingCart) {
        this.#state.nonConfirmedCart = null;
      }
      return;
    }
    const updatedCart = this.getCart();
    if (updatedCart !== null || !this.#state.isPreservingCart) {
      this.#state.nonConfirmedCart = updatedCart;
    }
  }
  #withRealTimePlan(session: CartSession, availabilities: SessionAvailability[], selectedPlanId: number | undefined): CartSession {
    if (session.seats == null) {
      return session;
    }
    const sessionPlanId = availabilities.find((availability: SessionAvailability) => availability.id === session.sessionId)?.mainPlanId;
    if (sessionPlanId != null && selectedPlanId != null && sessionPlanId !== selectedPlanId) {
      this.#datadog.logWarn('[OSS-CART] Real-time anchor session belongs to another plan than the one on screen', {
        selectedPlanId,
        sessionId: session.sessionId,
        sessionPlanId,
      });
    }
    const planId = sessionPlanId ?? selectedPlanId;
    if (planId == null || session.mainPlanId === planId) {
      return session;
    }
    const line = session.clone();
    line.mainPlanId = planId;
    return line;
  }
}
