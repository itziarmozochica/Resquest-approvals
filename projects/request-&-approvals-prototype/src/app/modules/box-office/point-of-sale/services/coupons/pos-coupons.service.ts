import { DestroyRef, inject, Injectable, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MembershipsIdentificationService } from '@fz-original/app/modules/box-office/memberships/services/memberships-identification.service';
import { selectChargeableMemberCouponCode } from '@fz-original/app/modules/box-office/memberships/utils/effective-plan-discounts.util';
import { ReservationSettlementSessionService } from '@fz-original/app/modules/reservation-settlement/services/reservation-settlement-session.service';
import { BaseResponse, type BaseErrorResponse } from '@fz-original/app/shared/models/base-response';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { catchError, EMPTY, finalize, map, mergeMap, Observable, of, take, tap } from 'rxjs';

import { TrackPosCheckoutPromoCodesService } from '../../../one-stop-shop/tracking/services/track-pos-checkout-promo-codes.service';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosCartService } from '../cart/pos-cart.service';
import { PosUiPortService } from '../pos-ui-port/pos-ui-port.service';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';
import { PosSecondScreenService } from '../second-screen/pos-second-screen.service';
import { TicketingCoreService } from '../ticketing-core/ticketing-core.service';

/** Milliseconds to wait before scrolling the cart aside to its bottom after applying a coupon. */
const scrollToCartDetailsDelayMs = 100;

/**
 * How a resolved code lands: `apply` stacks it when the flag targets the plan being sold, `reapply`
 * refreshes the plain coupon already applied, `restack` stacks it whatever the flag says.
 */
type CouponApplyMode = 'apply' | 'reapply' | 'restack';

/**
 * Promo codes, coupon combination and gift cards.
 *
 * `handleCouponModalClosed` and `modalCouponCodeOpened` live here rather than on the component
 * because `#hasModalCouponCodeOpened` also gates the scanner, which is business logic.
 *
 * `coupons_in_one_step` is read at construction — parity-locked timing — and re-read on `#clearCoupon`.
 * `OSS_GIFT_CARD_COMBINATION` is targeted by plan, so it is evaluated against the plan being sold and
 * re-evaluated whenever the selector moves (see `isCouponCombinationEnabled`).
 *
 * A reservation settlement makes no coupon request (B2BO-9530): the coupon booked online was redeemed
 * at booking and fever2 already prices the settlement with it, so the till neither applies nor offers
 * to add one, and removing a discount only clears local state.
 */
@Injectable()
export class PosCouponsService {
  readonly #core = inject(TicketingCoreService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  readonly #memberships = inject(MembershipsIdentificationService);
  readonly #optimizely = inject(OptimizelyService);
  readonly #secondScreen = inject(PosSecondScreenService);
  readonly #settlementSession = inject(ReservationSettlementSessionService);
  readonly #state = inject(PosTicketingState);
  readonly #trackPromoCodes = inject(TrackPosCheckoutPromoCodesService);
  readonly #ui = inject(PosUiPortService);
  readonly #viewUpdate = inject(PosViewUpdateService);

  /** Last `OSS_GIFT_CARD_COMBINATION` decision, keyed by the plan it was taken for. */
  #couponCombinationFlag: { enabled: boolean; planId: number | undefined } | null = null;

  constructor() {
    // Read once at construction; re-read only happens in #clearCoupon.
    this.#state.showCouponOneStep = this.#optimizely.isFeatureEnabled('coupons_in_one_step') ?? false;
  }

  /** Promo-code entry point from the coupon selector. */
  applyCouponDiscountOneStep(code: string, lazyCouponType: string | null = null): void {
    this.#state.lastPromoCodeInModal = code;
    this.applyCouponOneStep$(code, lazyCouponType).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  // ───────────────────────────────────────────── apply / remove ───────────────────────────────────

  /**
   * Resolves a code against the current cart and applies it.
   *
   * Public because the additional-coupon modal drives it directly, subscribing per entered code
   * and closing itself only once `couponError` stays `null`.
   */
  applyCouponOneStep$(code: string, lazyCouponType: string | null): Observable<void> {
    return this.#applyCouponOneStep$(code, lazyCouponType, 'apply');
  }

  /** Applies a resolved coupon to the server cart. */
  applyCouponToCart(coupon: Coupon, code: string, lazyCouponType: string | null, shouldScrollToCartDetails: boolean): void {
    this.#trackPromoCodes.trackApplyResult(code, lazyCouponType, true);
    this.#state.coupon = coupon;
    this.#state.couponCodeApplied.next(true);
    this.#state.showCouponOneStep = false;
    this.#addCoupon(this.#state.cart, coupon);
    this.#cart.addSessionsTypesToNonConfirmedCart();
    this.#secondScreen.updateCart();
    this.#cart.printTotal(this.#state.onsiteSetupSelected, this.#state.cartTotalMoney);

    if (shouldScrollToCartDetails) {
      // Intentional: scrolls the cart aside directly (read-only DOM access) — parity-locked.
      setTimeout(() => {
        const container = document.querySelector('.aside__detail-content') as HTMLElement | null;
        if (container !== null) {
          container.scrollTo({ behavior: 'smooth', top: container.scrollHeight });
        }
      }, scrollToCartDetailsDelayMs);
    }
  }

  /**
   * Gift-card prestep of the purchase pipeline: when the stacked gift cards do not cover the cart,
   * contact details are captured up front and `contactInformationCollectedForCoupon` tells the later
   * contact step to skip itself. The contact modal belongs to `PosPurchaseService`, so it arrives as
   * a factory — which also keeps the two strategies free of a DI cycle.
   */
  applyGiftCardPresteps(captureContactInformation: () => Observable<Customer | null>): Observable<void> {
    if (!this.hasStackedCoupons()) {
      return of(void 0);
    }
    const needsContact = this.#state.couponRemainingBalance !== null && this.#state.couponRemainingBalance.amount > 0;
    if (!needsContact) {
      return of(void 0);
    }
    return captureContactInformation().pipe(
      mergeMap((customer: Customer | null) => {
        if (!customer) {
          return EMPTY;
        }
        this.#state.contactInformationCollectedForCoupon = true;
        return of(void 0);
      }),
    );
  }

  /** Scanner handed us a code while the coupon modal was open. */
  autoFillCouponFromScanner(code: string): void {
    this.#state.scannedCouponCode.next(code);
  }

  canAddMoreCoupons(): boolean {
    if (this.#isReservationSettlementMode()) {
      return false;
    }
    if (!this.isCouponCombinationEnabled() || (this.#state.combinedCoupons.length === 0 && this.#state.coupon == null)) {
      return false;
    }
    const subtotal = this.#state.cartTotalMoneyWithoutCoupon?.amount ?? 0;
    const appliedDiscount =
      this.#state.combinedCoupons.length > 0 ? this.#state.couponCombinationSubtotal : (this.#state.coupon?.discount.amount ?? 0);
    return subtotal - appliedDiscount > 0;
  }

  // ──────────────────────────────────────── coupon combination ────────────────────────────────────

  /**
   * Full coupon reset — also re-reads `coupons_in_one_step`.
   *
   * Parity-locked: `?? false` is the only deviation in this file, and it is type-only — the raw
   * `boolean | null` is coerced to a `boolean` field, and every reader treats `null` and `false`
   * alike.
   */
  clearCoupon(): void {
    this.#clearCouponCombinationState();
    this.#state.coupon = null;
    this.#state.couponError.next(null);
    this.#state.couponCodeApplied.next(false);
    this.#state.showCouponOneStep = this.#optimizely.isFeatureEnabled('coupons_in_one_step') ?? false;
  }

  /** True when the stacked gift cards leave a balance that requires contact details. */
  couponRemainingBalanceRequiresContact(): boolean {
    return this.hasStackedCoupons() && this.#state.couponRemainingBalance !== null && this.#state.couponRemainingBalance.amount > 0;
  }

  /**
   * Coupon slice of `PayOneStepQuery`: in combination mode the first stacked card is
   * the coupon and the rest travel as `additionalGiftCardCodes`. Parity-locked: the key is omitted
   * — not `undefined` — when there are no extra cards.
   */
  getPayOneStepCouponCodes(): { couponCode: string | null; additionalGiftCardCodes?: string[] } {
    const memberCouponCode = this.#getEffectiveMemberCouponCode();
    const inCombinationMode = memberCouponCode === null && this.hasStackedCoupons();
    const couponCode = memberCouponCode ?? (inCombinationMode ? this.#state.combinedCoupons[0].code : (this.#state.coupon?.code ?? null));
    const additionalGiftCardCodes =
      inCombinationMode && this.#state.combinedCoupons.length > 1
        ? this.#state.combinedCoupons.slice(1).map((coupon: Coupon) => coupon.code)
        : undefined;

    return { ...(additionalGiftCardCodes && { additionalGiftCardCodes }), couponCode };
  }

  handleCouponModalClosed(): void {
    if (!this.#state.hasModalCouponCodeOpened) {
      return;
    }

    this.trackPromoCodeModalClosed();
    this.#state.hasModalCouponCodeOpened = false;
    this.resetPromoCodeModalSession();
    this.#state.scannedCouponCode.next(null);
  }

  // ─────────────────────────────────── purchase-pipeline seams (WS7) ──────────────────────────────

  /**
   * At least one stacked gift card. The flag is deliberately not re-checked: picking a plan outside
   * its audience keeps the cart, and the stacked codes must still reach cart totals and checkout.
   */
  hasStackedCoupons(): boolean {
    return this.#state.combinedCoupons.length > 0;
  }

  /**
   * The `plan_id` Optimizely holds comes from the URL, which carries no plan when Box Office opens
   * from the menu, so the plan being sold is passed explicitly. Memoised per plan because the cart
   * footer binds this on every change-detection pass; a `null` answer means the SDK is not ready
   * yet and is never cached.
   */
  isCouponCombinationEnabled(): boolean {
    const planId = this.#state.plan?.id;
    if (this.#couponCombinationFlag !== null && this.#couponCombinationFlag.planId === planId) {
      return this.#couponCombinationFlag.enabled;
    }
    const attributes = planId === undefined ? undefined : { plan_id: String(planId) };
    const enabled = this.#optimizely.isFeatureEnabled(FeatureFlags.OSS_GIFT_CARD_COMBINATION, attributes);
    if (enabled === null) {
      return false;
    }
    this.#couponCombinationFlag = { enabled, planId };
    return enabled;
  }

  /** An existing stack keeps its UI after the selector moves to a plan the flag does not target. */
  isCouponCombinationUiActive(): boolean {
    return this.hasStackedCoupons() || (this.isCouponCombinationEnabled() && this.#state.coupon != null);
  }

  /** The scanner routes codes to the coupon modal while it is open. */
  isPromoCodeModalOpen(): boolean {
    return this.#state.hasModalCouponCodeOpened;
  }

  /**
   * Adds the email field to the mandatory contact fields when a gift-card balance remains.
   * `PosPurchaseService.getMandatoryFields()` must pass every branch through this.
   */
  mergeMandatoryContactForCouponRemaining(fields: string[]): string[] {
    if (!this.couponRemainingBalanceRequiresContact()) {
      return fields;
    }
    const merged = new Set(fields);
    merged.add(this.#state.emailField);
    return [...merged];
  }

  modalCouponCodeOpened(): void {
    this.#state.hasModalCouponCodeOpened = true;
    this.resetPromoCodeModalSession();
  }

  // ─────────────────────────────────────────── preset coupons ─────────────────────────────────────

  /**
   * Asks the component for the additional-coupon modal. A stream rather than a UI-port
   * request/response step because the modal stays open across several attempts, feeding codes back
   * through {@link applyCouponOneStep$}; the component closes it once `couponError` is `null`.
   */
  openAddAdditionalCouponModal(): void {
    this.#state.couponError.next(null);
    this.#state.additionalCouponModalRequested$.next();
  }

  // ───────────────────────────────────────────── modal session ────────────────────────────────────

  /**
   * Re-applies the plain coupon already on the cart so the server recomputes its total. It never
   * stacks: once the selector moves to a plan the flag targets, stacking the code onto itself would
   * be refused as a duplicate and the total would go stale.
   */
  reapplyCouponOneStep$(code: string): Observable<void> {
    return this.#applyCouponOneStep$(code, null, 'reapply');
  }

  /** Recomputes `combinedCoupons` / `couponCombinationSubtotal` / `couponRemainingBalance`. */
  refreshCouponCombinationAggregates(cart: Cart | null = this.#state.nonConfirmedCart ?? this.#state.cart): void {
    if (this.#state.combinedCoupons.length === 0) {
      this.#state.couponCombinationSubtotal = 0;
      this.#state.couponRemainingBalance = null;
      this.#state.effectiveCombinedCoupon = null;
      return;
    }
    const sum = this.#state.combinedCoupons.reduce((acc: number, coupon: Coupon) => acc + (coupon.discount?.amount ?? 0), 0);
    const currency = this.#state.combinedCoupons[0].discount?.currency ?? this.#state.cartTotalMoney?.currency ?? '';
    cart?.calculateTotal();
    const subtotal = cart?.getTotalBeforeCoupon() ?? 0;
    const effectiveAmount = Math.min(sum, subtotal);
    const remaining = Math.max(0, sum - subtotal);

    this.#state.couponCombinationSubtotal = sum;
    this.#state.couponRemainingBalance = remaining > 0 ? new Money(remaining, currency) : null;

    const code = this.#state.combinedCoupons.length > 1 ? 'oneStopShop.cart.combinedCoupons' : this.#state.combinedCoupons[0].code;
    this.#state.effectiveCombinedCoupon = {
      code,
      creationPurpose: this.#state.combinedCoupons[0].creationPurpose ?? 'gift_card',
      discount: new Money(effectiveAmount, currency),
    };
  }

  rejectCouponEntryForMemberPerks(): boolean {
    if (!this.#memberships.hasActivePerks()) {
      return false;
    }

    this.setPromoCodeApplyError(new Error('oneStopShop.couponCodeSelector.memberPerksActive'));
    this.#state.couponCodeApplied.next(false);
    return true;
  }

  /**
   * Cart-detail "remove discount", also the coupon reset of every cart clear. Never calls the server.
   * A reservation settlement keeps its booked coupon: fever2 charges it, so the till must show it.
   */
  removeAppliedDiscount(): void {
    if (this.#isReservationSettlementMode()) {
      return;
    }
    this.clearCoupon();
    if (this.#state.cart !== null) {
      this.#state.cart.appliedCoupon = null;
      this.#cart.clearCartSessionsWithoutUnits();
    }

    if (this.#state.nonConfirmedCart !== null) {
      this.#state.nonConfirmedCart.appliedCoupon = null;
    }

    this.#cart.syncCartChanges(this.#state.cart);
    this.#secondScreen.updateCart();
    this.#viewUpdate.markForCheck();
  }

  resetPromoCodeModalSession(): void {
    this.#state.lastPromoCodeInModal = '';
    this.#state.hadCouponApplyErrorInModal = false;
  }

  /**
   * Re-applies a gift card the purchase pipeline had to drop when it rebuilt a discarded cart: the
   * card stacks again even when the plan picked since then is outside the flag audience.
   */
  restackCouponOneStep$(code: string): Observable<void> {
    return this.#applyCouponOneStep$(code, null, 'restack');
  }

  /**
   * The modal reads `couponError`; the flag suppresses the close-modal tracking.
   *
   * Public for the purchase pipeline, which reports the coupons a recreated cart could not take back
   * (see `#recreateCartWithAppliedCoupons$`).
   */
  setPromoCodeApplyError(error: Error): void {
    this.#state.couponError.next(error);
    this.#state.hadCouponApplyErrorInModal = true;
  }

  /** An apply error already reported itself, so the close event is not tracked twice. */
  trackPromoCodeModalClosed(): void {
    if (this.#state.hadCouponApplyErrorInModal) {
      return;
    }

    if (this.#state.couponCodeApplied.getValue()) {
      this.#trackPromoCodes.trackCloseModal(this.#state.lastPromoCodeInModal, 'apply_promo_code');
      return;
    }

    this.#trackPromoCodes.trackCloseModal(this.#state.lastPromoCodeInModal, 'close');
  }

  #addCoupon(cart: Cart | null, coupon: Coupon): void {
    if (cart !== null) {
      cart.appliedCoupon = coupon;
    }
    if (this.#state.nonConfirmedCart !== null) {
      this.#state.nonConfirmedCart.appliedCoupon = coupon;
    }
    this.#cart.syncCartChanges(cart, coupon);
  }

  /** Shared body of {@link applyCouponOneStep$}, {@link reapplyCouponOneStep$} and {@link restackCouponOneStep$}. */
  #applyCouponOneStep$(code: string, lazyCouponType: string | null, mode: CouponApplyMode): Observable<void> {
    if (this.#isReservationSettlementMode() || this.rejectCouponEntryForMemberPerks()) {
      return EMPTY;
    }

    this.#state.couponError.next(null);
    this.#state.hadCouponApplyErrorInModal = false;

    return this.#cart.createOrUpdateCart().pipe(
      mergeMap((response: BaseResponse<Cart>) => this.#cart.checkResponseData(response)),
      takeUntilDestroyed(this.#destroyRef),
      mergeMap((response: BaseResponse<Cart>) => {
        const cartData = response.data;
        if (cartData == null) {
          return EMPTY;
        }
        this.#state.cart = cartData;
        this.#state.cart.hasSeating = cartData.hasSeating;
        if (cartData.id == null) {
          return EMPTY;
        }

        return this.#core
          .getGiftCardBalance({
            cartId: cartData.id,
            couponCode: code,
            lazyCouponType,
            partnerId: this.#state.partner?.id as number,
          })
          .pipe(
            tap((couponResponse: BaseResponse<Coupon | null>) => this.#handleCouponResponse(couponResponse, code, lazyCouponType, mode)),
            // markForCheck once the coupon lookup settles.
            finalize(() => this.#viewUpdate.markForCheck()),
            map((): undefined => void 0),
          );
      }),
      catchError((error: unknown) => {
        // `errorModalService.open(error)`: the caught envelope carries the message.
        this.#openErrorModal(error);
        return EMPTY;
      }),
      // Release the cart spinner and markForCheck whatever the outcome.
      finalize(() => {
        this.#state.isLoadingCart = false;
        this.#viewUpdate.markForCheck();
      }),
      map((): undefined => void 0),
    );
  }

  #asBaseErrorResponse(error: unknown): BaseErrorResponse | undefined {
    if (error !== null && typeof error === 'object' && 'error' in error) {
      const { error: baseError } = error as { error: BaseErrorResponse | null };
      return baseError ?? undefined;
    }
    return undefined;
  }

  /**
   * Resolved lazily on purpose: the cart strategy reads coupon aggregates back
   * (`#getEffectiveCouponForCartTotal`), so injecting it eagerly in both directions would
   * be a DI cycle. Same component injector, same instance.
   */
  get #cart(): PosCartService {
    return this.#injector.get(PosCartService);
  }

  #clearCouponCombinationState(): void {
    this.#state.contactInformationCollectedForCoupon = false;
    this.#state.combinedCoupons = [];
    this.#state.couponCombinationSubtotal = 0;
    this.#state.couponRemainingBalance = null;
    this.#state.effectiveCombinedCoupon = null;
  }

  // ────────────────────────────────────────────── internals ───────────────────────────────────────

  #getEffectiveMemberCouponCode(): string | null {
    const planDiscounts = this.#state.cart?.appliedPlanDiscounts ?? this.#memberships.data().planDiscounts;

    return selectChargeableMemberCouponCode(planDiscounts, this.#state.cart);
  }

  /** Body of the response `tap`: duplicate / incompatible / stack / plain-coupon branches. */
  #handleCouponResponse(
    couponResponse: BaseResponse<Coupon | null>,
    code: string,
    lazyCouponType: string | null,
    mode: CouponApplyMode,
  ): void {
    if (couponResponse.data) {
      if (this.rejectCouponEntryForMemberPerks()) {
        this.#trackPromoCodes.trackApplyResult(code, lazyCouponType, false, this.#state.couponError.getValue());
        return;
      }

      const newCoupon = couponResponse.data;
      const combinationStack =
        this.#state.combinedCoupons.length > 0 ? this.#state.combinedCoupons : this.#state.coupon != null ? [this.#state.coupon] : [];

      if (mode === 'restack' || (mode === 'apply' && this.isCouponCombinationEnabled())) {
        const isDuplicate = combinationStack.some((stackedCoupon: Coupon) => stackedCoupon.code === newCoupon.code);
        if (isDuplicate) {
          this.setPromoCodeApplyError(new Error('oneStopShop.couponCodeSelector.duplicateCouponError'));
          this.#state.couponCodeApplied.next(false);
          this.#trackPromoCodes.trackApplyResult(code, lazyCouponType, false, this.#state.couponError.getValue());
          return;
        }
        if (combinationStack.length > 0 && newCoupon.creationPurpose !== combinationStack[0].creationPurpose) {
          this.setPromoCodeApplyError(new Error('oneStopShop.couponCodeSelector.couponsNotCompatible'));
          this.#state.couponCodeApplied.next(false);
          this.#trackPromoCodes.trackApplyResult(code, lazyCouponType, false, this.#state.couponError.getValue());
          return;
        }
        this.#state.combinedCoupons = [...combinationStack, newCoupon];
        this.refreshCouponCombinationAggregates(this.#state.cart);
        if (this.#state.effectiveCombinedCoupon === null) {
          this.#state.couponCodeApplied.next(false);
          this.#trackPromoCodes.trackApplyResult(code, lazyCouponType, false);
          return;
        }
        this.applyCouponToCart(this.#state.effectiveCombinedCoupon, code, lazyCouponType, false);
        return;
      }

      this.applyCouponToCart(newCoupon, code, lazyCouponType, true);
      return;
    }

    if (couponResponse.error) {
      this.setPromoCodeApplyError(couponResponse.error);
      this.#state.couponCodeApplied.next(false);
      this.#trackPromoCodes.trackApplyResult(code, lazyCouponType, false, couponResponse.error);
    }
  }

  #isReservationSettlementMode(): boolean {
    return this.#settlementSession.session() !== null;
  }

  /**
   * The caught envelope is passed straight to `ErrorModalService.open(error)`, which
   * derives the message from `error.code` / `error.message` and falls back to the generic copy. The
   * component performs the same call from the UI port.
   */
  #openErrorModal(error: unknown): void {
    this.#ui
      .request('error', {
        error: this.#asBaseErrorResponse(error),
        message: 'errors.generic',
        title: 'common.errorTitle',
      })
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe();
  }
}
