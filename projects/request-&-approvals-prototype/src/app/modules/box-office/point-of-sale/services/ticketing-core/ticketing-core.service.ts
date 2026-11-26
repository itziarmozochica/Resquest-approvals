import { DestroyRef, inject, Injectable } from '@angular/core';

import { PaymentCheckoutAdyenService } from '@fz-original/app/app/services/payment-checkout-adyen/payment-checkout-adyen.service';
import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { PresetCoupons } from '@fz-original/app/modules/box-office/shared/models/preset-coupon';
import { OnsiteSetupsPresetCouponsService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups-preset-coupons/onsite-setups-preset-coupons.service';
import { OnsiteSetupsService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups.service';
import { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { PaymentConfigStorageService } from '@fz-original/app/modules/box-office/shared/services/payment/payment-config-storage.service';
import {
  CheckoutModalResendService,
  type ModalResendHooks,
} from '@fz-original/app/modules/box-office/ticketing/services/checkout-modal-resend/checkout-modal-resend.service';
import {
  OneStepPurchaseService,
  PayOneStepQuery,
  PayOneStepResponse,
  PreparedCartForPayment,
} from '@fz-original/app/modules/box-office/ticketing/services/one-step-purchase/one-step-purchase.service';
import { UserShiftService } from '@fz-original/app/modules/box-office/ticketing/services/user-shift/user-shift.service';
import { BookingQuestionsService } from '@fz-original/app/shared/booking-questions/booking-questions.service';
import { CartBookingQuestionsCacheService } from '@fz-original/app/shared/booking-questions/cart-booking-questions-cache.service';
import { BookingQuestion } from '@fz-original/app/shared/booking-questions/models';
import { CART_DETAIL_SERVICE } from '@fz-original/app/shared/cart/services/cart-detail.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CartSessionItemLine } from '@fz-original/app/shared/models/cart/cart-session-item-line.model';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { FlexibleBundleSessions, FlexibleBundleSessionsQuery } from '@fz-original/app/shared/models/plan/flexible-bundle-sessions.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { ProductSessionsSummary } from '@fz-original/app/shared/models/product-sessions-summary/product-sessions-summary-response.model';
import { FreeSeatingMapQuery } from '@fz-original/app/shared/models/seating-map/free-seating-map-query';
import { FreeSeatingMap } from '@fz-original/app/shared/models/seating-map/free-seating-map.model';
import { SeatingMapQuery } from '@fz-original/app/shared/models/seating-map/seating-map-query';
import { SeatingMap, SeatingMapState } from '@fz-original/app/shared/models/seating-map/seating-map.model';
import { SeatingProviderEnum } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { ExpireHoldTokenService } from '@fz-original/app/shared/seating-selector/services/expire-hold-token/expire-hold-token.service';
import { CartService } from '@fz-original/app/shared/services/cart/cart.service';
import { CreateCartQuery } from '@fz-original/app/shared/services/cart/create-cart-query';
import { DiscardCartQuery } from '@fz-original/app/shared/services/cart/discard-cart-query';
import { RemovePlanFromCartQuery } from '@fz-original/app/shared/services/cart/remove-plan-from-cart-query';
import { UpdateCartQuery } from '@fz-original/app/shared/services/cart/update-cart-query';
import { CustomerService } from '@fz-original/app/shared/services/customer/customer.service';
import { SeatsManagementService } from '@fz-original/app/shared/services/move-customers-seats/seats-management.service';
import {
  type LinkOrdersRequest,
  type SeatCancellationItem,
} from '@fz-original/app/shared/services/move-customers-seats/ticket/ticket.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { ProductSessionsSummaryService } from '@fz-original/app/shared/services/product-sessions-summary/product-sessions-summary.service';
import { PurchaseService } from '@fz-original/app/shared/services/purchase/purchase.service';
import { SearchOrderQuery } from '@fz-original/app/shared/services/purchase/search-order-query';
import { FreeSeatingMapService } from '@fz-original/app/shared/services/seating-map/free-seating-map.service';
import { SeatingMapService } from '@fz-original/app/shared/services/seating-map/seating-map.service';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { Observable } from 'rxjs';

import { type Shift } from '../../../shared/models/shifts.model';
import { CashRegisterCartDiscardService } from '../../../shared/services/cash-register-cart-discard/cash-register-cart-discard.service';
import { EfrHealthCheckModalService } from '../../../shared/services/efsta-fiscal/efr-health-check-modal.service';
import { EfrUserMessageModalService } from '../../../shared/services/efsta-fiscal/efr-user-message-modal.service';
import { FiscalTaxGateService } from '../../../shared/services/efsta-fiscal/fiscal-tax-gate.service';
import { type EfrGuardPurchaseContext } from '../../../shared/services/efsta-fiscal/models/efr-health-check.model';
import { unwrapData, unwrapDataOrNull } from '../adapters/base-response.adapter';

/** Union of the create/update cart inputs: `cartId` present means "update", absent means "create". */
export interface CreateOrUpdateCartQuery {
  channel: Channel;
  partnerId: number;
  sessionItemsByDatetime: Map<string, CartSession[]>;
  bundleIds?: number[];
  cartId?: string;
  channelId?: string;
  hasSeating?: boolean;
  /** Create only: the update query has no real-time counterpart (fever2 #52725 covers creation). */
  isRealTimeSeating?: boolean;
  locale?: string;
  overrideCapacity?: boolean;
  rescheduleOrderId?: number;
  seatingHoldTokensBySessionId?: Map<string, string>;
  seatingMapState?: SeatingMapState;
  seatingToken?: string | null;
  sessionItemLines?: CartSessionItemLine[];
  useSessionItemLines?: boolean;
}

/** Everything the seating hold-token release endpoint needs. */
export interface ReleaseHoldTokenQuery {
  holdToken: string;
  partnerId: number;
  seatingProvider: SeatingProviderEnum;
  providerPublicKey?: string | null;
}

/** Coupon/gift-card lookup — the balance travels on the returned `Coupon.discount`. */
export interface GiftCardBalanceQuery {
  cartId: Cart['id'];
  couponCode: string;
  partnerId: number;
  lazyCouponType?: string | null;
}

/** Add/remove gift cards stacked on top of the primary coupon. */
export interface GiftCardCombinationQuery {
  cartId: string;
  couponCodes: string[];
  partnerId: number;
  userId: number;
}

/** Primary coupon application. */
export interface ApplyCouponQuery {
  cartId: string;
  partnerId: number;
  userId: number;
  couponCode?: string | null;
}

/**
 * Data layer for the POS flow: one place for everything API-shaped. The surface is domain-level and
 * returns domain models, never raw DTOs, and carries no business logic.
 *
 * Cart writes are the exception to the DTO rule: they keep the `BaseResponse<Cart>` envelope because
 * the flow branches on `error.code` (invalid-cart-status recovery, capacity overrides). The `Cart`
 * inside it is already the adapted domain model.
 */
@Injectable()
export class TicketingCoreService {
  readonly #adyenService = inject(PaymentCheckoutAdyenService);
  readonly #bookingQuestionsService = inject(BookingQuestionsService);
  readonly #cartBookingQuestionsCache = inject(CartBookingQuestionsCacheService);
  readonly #cartDetailService = inject(CART_DETAIL_SERVICE, { optional: true });
  readonly #cartService = inject(CartService);
  readonly #cashRegisterCartDiscardService = inject(CashRegisterCartDiscardService);
  readonly #checkoutModalResendService = inject(CheckoutModalResendService);
  readonly #customerService = inject(CustomerService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #efrHealthCheckModalService = inject(EfrHealthCheckModalService);
  readonly #efrUserMessageModalService = inject(EfrUserMessageModalService);
  readonly #expireHoldTokenService = inject(ExpireHoldTokenService);
  readonly #freeSeatingMapService = inject(FreeSeatingMapService);
  readonly #oneStepPurchaseService = inject(OneStepPurchaseService);
  readonly #onsiteSetupsPresetCouponsService = inject(OnsiteSetupsPresetCouponsService);
  readonly #onsiteSetupsService = inject(OnsiteSetupsService);
  readonly #paymentConfigStorageService = inject(PaymentConfigStorageService);
  readonly #paymentService = inject(PaymentService);
  readonly #fiscalTaxGateService = inject(FiscalTaxGateService);
  readonly #planService = inject(PlanService);
  readonly #productSessionsSummaryService = inject(ProductSessionsSummaryService);
  readonly #purchaseService = inject(PurchaseService);
  readonly #seatingMapService = inject(SeatingMapService);
  readonly #seatsManagementService = inject(SeatsManagementService);
  readonly #userShiftService = inject(UserShiftService);

  addGiftCardCombination(query: GiftCardCombinationQuery): Observable<BaseResponse<Cart | null>> {
    return this.#cartService.addGiftCardCombination(query);
  }

  /**
   * Whether the cancelled Adyen split had already-completed legs. Client-side channel fed
   * by the cancel request, so it is a plain observable rather than a call.
   */
  get adyenCancelHadCompletedPayments$(): Observable<boolean> {
    return this.#adyenService.cancelHadCompletedPayments$;
  }

  /** Emits once the FR async fiscal-failure modal has been acknowledged, so the flow can reset. */
  get franceAsyncFiscalFailure$(): Observable<void> {
    return this.#oneStepPurchaseService.franceAsyncFiscalFailure$;
  }

  // ─────────────────────────────────────────────── plan ────────────────────────────────────────────

  applyCouponToCart(query: ApplyCouponQuery, continueWithErrorAsObservable = true): Observable<BaseResponse<Cart | null>> {
    return this.#cartService.applyCouponToCart(query, continueWithErrorAsObservable);
  }

  /**
   * Cancels access codes and frees their seats, optionally linking the source/target orders in the
   * same call.
   */
  cancelCodesAndReleaseSeats(
    cancellations: SeatCancellationItem[],
    orderLinking?: { sourceOrderId: number; targetOrderId: number },
  ): Observable<BaseResponse<void>> {
    return this.#seatsManagementService.cancelCodesAndReleaseSeats(cancellations, orderLinking);
  }

  // ─────────────────────────────────────────────── cart ────────────────────────────────────────────

  /**
   * Clears the cart *mirror* that reused child components (`app-oss-cart-detail`) read from.
   * Purely client-side — pair it with {@link discardCart} to also drop the server cart.
   */
  clearCart(): void {
    this.#cartDetailService?.clearCart();
  }

  /** Whether the payment prepares the cart with the single 2.1 call (B2BO-9417): flag on, not a distributor session. */
  canPrepareInOneCall(): boolean {
    return this.#cartService.canPrepareInOneCall();
  }

  clearPrefetchedBookingQuestions(): void {
    this.#bookingQuestionsService.clearPrefetchedQuestions();
  }

  /** Forgets the questions held for the cart, so its questions steps request them. */
  dropHeldBookingQuestions(cartId: string): void {
    this.#cartBookingQuestionsCache.drop(cartId);
  }

  createCart(query: Omit<CreateOrUpdateCartQuery, 'cartId' | 'seatingMapState'>): Observable<BaseResponse<Cart>> {
    const createCartQuery: CreateCartQuery = {
      channel: query.channel,
      ...(query.bundleIds !== undefined && { bundleIds: query.bundleIds }),
      channelId: query.channelId,
      hasSeating: query.hasSeating,
      ...(query.isRealTimeSeating !== undefined && { isRealTimeSeating: query.isRealTimeSeating }),
      locale: query.locale,
      overrideCapacity: query.overrideCapacity,
      partnerId: query.partnerId,
      rescheduleOrderId: query.rescheduleOrderId,
      seatingHoldTokensBySessionId: query.seatingHoldTokensBySessionId,
      seatingToken: query.seatingToken,
      sessionItemsByDatetime: query.sessionItemsByDatetime,
      ...(query.useSessionItemLines !== undefined && { useSessionItemLines: query.useSessionItemLines }),
    };
    return this.#cartService.createCart(createCartQuery) as Observable<BaseResponse<Cart>>;
  }

  createCustomer(partnerId: number, customer: Customer, channel?: string): Observable<Customer> {
    return this.#customerService.create(partnerId, customer, channel).pipe(unwrapData<Customer>());
  }

  /**
   * Zero-total orders skip the payment provider entirely.
   *
   * Unused by the POS flow — `OneStepPurchaseService.payOneStep` already routes zero totals
   * internally, so `payOneStep` alone covers it. Kept for the future flows the token exists for.
   */
  createFreeOrder(query: PayOneStepQuery, cart: Cart): Observable<PayOneStepResponse> {
    return this.#oneStepPurchaseService.createFreeOrderRequest(query, cart);
  }

  /** Creates the cart when `cartId` is absent, updates it otherwise. */
  createOrUpdateCart(query: CreateOrUpdateCartQuery): Observable<BaseResponse<Cart>> {
    return query.cartId === undefined ? this.createCart(query) : this.updateCart({ ...query, cartId: query.cartId });
  }

  /** Server-side cart discard. */
  discardCart(query: DiscardCartQuery): Observable<BaseResponse<boolean | null>> {
    return this.#cashRegisterCartDiscardService.discard(query);
  }

  /** `pagehide` path: fire-and-forget `fetch(..., { keepalive: true })`, survives tab close. */
  discardCartKeepalive(query: DiscardCartQuery): void {
    this.#cartService.discardCartKeepalive({ ...query, viaCashRegister: true });
  }

  /** Every question of the cart, pre and post booking, any visibility: `GET …/booking-questions/questions/`. */
  getBookingQuestions(cartId: string): Observable<BookingQuestion[]> {
    return this.#bookingQuestionsService.getQuestions(cartId);
  }

  getCardDisabledTooltip(...args: Parameters<PaymentService['getCardDisabledTooltip']>): string | null {
    return this.#paymentService.getCardDisabledTooltip(...args);
  }

  getCart(partnerId: number, cartId: string): Observable<BaseResponse<Cart>> {
    return this.#cartService.getCart(partnerId, cartId) as Observable<BaseResponse<Cart>>;
  }

  getFlexibleBundleSessions(partnerId: number, planId: number, query: FlexibleBundleSessionsQuery): Observable<FlexibleBundleSessions> {
    return this.#planService.getFlexibleBundleSessions(partnerId, planId, query).pipe(unwrapData<FlexibleBundleSessions>());
  }

  // ────────────────────────────────────────────── seating ──────────────────────────────────────────

  /**
   * Resolves a coupon/gift-card code against the cart. There is no dedicated balance endpoint: the
   * remaining balance is carried by `Coupon.discount` and aggregated client-side.
   */
  getGiftCardBalance(query: GiftCardBalanceQuery, continueWithErrorAsObservable = true): Observable<BaseResponse<Coupon | null>> {
    return this.#cartService.getCouponForCart(
      {
        cartId: query.cartId,
        couponCode: query.couponCode,
        lazyCouponType: query.lazyCouponType ?? null,
        partnerId: query.partnerId,
      },
      continueWithErrorAsObservable,
    );
  }

  // ──────────────────────────────────────── coupons / gift cards ───────────────────────────────────

  /** Transaction id of the last payment attempt, used by the split-cancellation branch. */
  getLastPaymentTransactionId(cartId: string | undefined): string | null {
    return this.#oneStepPurchaseService.getLastPaymentTransactionId(cartId);
  }

  getOnsiteSetup(onsiteSetupId: string): Observable<OnsiteSetup> {
    return this.#onsiteSetupsService.getOnsiteSetup(onsiteSetupId);
  }

  /** The operator's currently open shift, or `null` when none is open (404). */
  getOpenedShift(): Observable<Shift | null> {
    return this.#userShiftService.getOpenedShift();
  }

  /** Single-order fetch behind the modify-order deep link. */
  getOrder(partnerId: number, orderId: number): Observable<BaseResponse<Order | null>> {
    return this.#purchaseService.getOrder(partnerId, orderId);
  }

  // ─────────────────────────────────────────────── shift ──────────────────────────────────────────

  /** Locally stored terminal/device pairing for this workstation. */
  getPaymentConfiguration(): PaymentConfiguration | undefined {
    return this.#paymentConfigStorageService.getConfiguration();
  }

  // ──────────────────────────────────────── orders (scanner) ──────────────────────────────────────

  getPlan(partnerId: number, planId: number): Observable<Plan> {
    return this.#planService.getPlan(partnerId, planId).pipe(unwrapData<Plan>());
  }

  getPlans(partnerId: number, planIds: number[] = [], params?: { channelId?: string }): Observable<Plan[] | null> {
    return this.#planService.getPlans(partnerId, planIds, params).pipe(unwrapDataOrNull<Plan[]>());
  }

  // ─────────────────────────────────── modify order (seat handover) ────────────────────────────────

  /**
   * Prefetches (and caches, inside the service) the setup's preset coupons, chained onto setup
   * resolution so the coupon selector is warm before the first sale.
   */
  getPresetCoupons(onsiteSetup: OnsiteSetup): Observable<PresetCoupons> {
    return this.#onsiteSetupsPresetCouponsService.getPresetCouponsByOnsiteSetup(onsiteSetup);
  }

  // ─────────────────────────────────────── setup / custom tabs ────────────────────────────────────

  /**
   * Fiscal-printer readiness gate in front of every purchase (`guardPurchase`). Only active
   * where a fiscal environment is configured for the country — `EfrHealthCheckService` short-circuits
   * on `isFiscalReceiptEnabled`, so the observable emits `true` immediately elsewhere.
   *
   * Same accepted `NgbModal`/`Dialog` impurity as {@link pay}: the service owns its own retry dialog.
   */
  guardFiscalPurchase(countryCode: string | undefined, context?: EfrGuardPurchaseContext): Observable<boolean> {
    return this.#efrHealthCheckModalService.guardPurchase(countryCode, context);
  }

  guardFiscalPurchaseAfterShiftStart(countryCode: string | undefined, context?: EfrGuardPurchaseContext): Observable<boolean> {
    return this.#efrHealthCheckModalService.guardPurchaseAfterShiftStart(countryCode, context);
  }

  guardFiscalTaxes(countryCode: string | undefined, partnerId: number | undefined, cartId: string | null | undefined): Observable<boolean> {
    return this.#fiscalTaxGateService.guardPurchase(countryCode, partnerId, cartId);
  }

  /**
   * Loads (and caches, inside the service) the setup's retail catalog. The envelope is preserved
   * because the caller decides `isProductCatalogLoaded` from the payload's session map.
   */
  initializeProductCatalog(
    partnerId: number,
    onsiteSetupId: string,
    channel: string,
  ): Observable<BaseResponse<ProductSessionsSummary | null>> {
    return this.#productSessionsSummaryService.initializeService(partnerId, onsiteSetupId, channel);
  }

  /** True while a cancellation is in flight — part of the same split branch. */
  isCancellingPayment(): boolean {
    return this.#oneStepPurchaseService.getIsCancellingPayment();
  }

  /** Holds every question of the cart, so its pre- and post-booking steps read them without a request. */
  holdBookingQuestions(cartId: string, questions: BookingQuestion[]): void {
    this.#cartBookingQuestionsCache.hold(cartId, questions);
  }

  isCartPrepared(cartId: string | undefined): boolean {
    return this.#oneStepPurchaseService.isCartPrepared(cartId);
  }

  /** True while a FR async fiscal failure is being surfaced, which must block a new payment. */
  isHandlingFranceAsyncFiscalFailure(): boolean {
    return this.#oneStepPurchaseService.isHandlingFranceAsyncFiscalFailure();
  }

  /** Terminal availability rules — pure predicate on `PaymentService`, no request. */
  isCardPaymentDisallowed(...args: Parameters<PaymentService['isCardPaymentDisallowed']>): boolean {
    return this.#paymentService.isCardPaymentDisallowed(...args);
  }

  // ───────────────────────────────────────────── payment ──────────────────────────────────────────

  /** Links the original order to the one the modification produced. */
  linkOrders(request: LinkOrdersRequest): Observable<BaseResponse<void>> {
    return this.#seatsManagementService.linkOrders(request);
  }

  /** General-admission (free selection) map. */
  loadFreeSeatingMap(query: FreeSeatingMapQuery): Observable<BaseResponse<FreeSeatingMap>> {
    return this.#freeSeatingMapService.getFreeSeatingMap(query);
  }

  /** Reserved-seating map for the sessions currently in the non-confirmed cart. */
  loadSeatingMap(query: SeatingMapQuery): Observable<BaseResponse<SeatingMap>> {
    return this.#seatingMapService.getSeatingMap(query);
  }

  /** PayHere terminals re-pair on every setup load. */
  pairPayHere(partnerId: number, paymentTerminalId: string, appIdentifier: string, onsiteSetupId: string): Observable<boolean> {
    return this.#paymentService.pairPayHere(partnerId, paymentTerminalId, appIdentifier, onsiteSetupId);
  }

  /** Every booking question of the cart, requested ahead of the pre- and post-booking steps that read them. */
  prefetchBookingQuestions(cartId: string): void {
    this.#bookingQuestionsService.prefetchQuestions(cartId);
  }

  /** One-step purchase. See the class note on the accepted `NgbModal` impurity inside this service. */
  pay(query: PayOneStepQuery): Observable<PayOneStepResponse> {
    return this.#oneStepPurchaseService.payOneStep(query, this.#destroyRef);
  }

  /** The payment's 2.1 prepare, run ahead of it; `pay` then starts from the cart it answers (`query.preparedCart`). */
  prepareCartWithBookingQuestions(query: PayOneStepQuery): Observable<PreparedCartForPayment> {
    return this.#oneStepPurchaseService.prepareCartWithBookingQuestions(query);
  }

  /**
   * Stored-pairing changes, including the ones other tabs make (`storage` events). Emits the
   * current value first.
   */
  paymentConfigurationChanges(): Observable<PaymentConfiguration | undefined> {
    return this.#paymentConfigStorageService.listenStorage();
  }

  /**
   * The purchase wrapped in the checkout modal's resend loop. A failed modal payment keeps the
   * modal open on its payment-failed screen; each resend re-enters `hooks.payInOneStep`.
   */
  payWithModalResend(hooks: ModalResendHooks): Observable<PayOneStepResponse | null> {
    return this.#checkoutModalResendService.payWithModalResend(hooks);
  }

  reportModalFailureBeforePay(reason?: string): void {
    this.#oneStepPurchaseService.reportModalFailureBeforePay(reason);
  }

  /** Pushes the confirmed cart into the shared mirror consumed by the cart-detail children. */
  publishCart(cart: Cart): void {
    this.#cartDetailService?.setCart(cart);
  }

  // ────────────────────────────────────────── purchase ────────────────────────────────────────────

  /** Fire-and-forget hold-token expiry; safe from `pagehide` (uses a keepalive `fetch`). */
  releaseHoldToken(query: ReleaseHoldTokenQuery): void {
    this.#expireHoldTokenService.expireHoldToken(query.partnerId, {
      hold_token: query.holdToken,
      provider_public_key: query.providerPublicKey,
      seating_provider: query.seatingProvider,
    });
  }

  removeGiftCardCombination(query: GiftCardCombinationQuery): Observable<BaseResponse<Cart | null>> {
    return this.#cartService.removeGiftCardCombination(query);
  }

  removePlanFromCart(query: RemovePlanFromCartQuery): Observable<Cart | null> {
    return this.#cartService.removePlanFromCart(query).pipe(unwrapDataOrNull<Cart>());
  }

  /** Drops a stored pairing that no longer matches the resolved setup's gateway. */
  removeStoredPaymentConfiguration(): void {
    this.#paymentConfigStorageService.removeConfiguration();
  }

  /** Barcode → order lookup behind the scanner. */
  searchOrders(query: SearchOrderQuery): Observable<BaseResponse<Order[] | null>> {
    return this.#purchaseService.searchOrders(query);
  }

  /** Persists the pairing the device modals produced. */
  setPaymentConfiguration(config: PaymentConfiguration): void {
    this.#paymentConfigStorageService.setConfiguration(config);
  }

  // ─────────────────────────────────────── fiscal (EFSTA / EFR) ───────────────────────────────────

  /**
   * Shows the fiscal device's pending operator message before post-purchase navigation, if any.
   * Completes immediately when there is nothing to show. Accepted modal
   * impurity, as above.
   */
  showFiscalUserMessageIfPresent(): Observable<void> {
    return this.#efrUserMessageModalService.showIfPresent();
  }

  updateCart(query: CreateOrUpdateCartQuery & { cartId: string }): Observable<BaseResponse<Cart>> {
    const updateCartQuery: UpdateCartQuery = {
      cartId: query.cartId,
      ...(query.bundleIds !== undefined && { bundleIds: query.bundleIds }),
      hasSeating: query.hasSeating,
      overrideCapacity: query.overrideCapacity,
      partnerId: query.partnerId,
      seatingHoldTokensBySessionId: query.seatingHoldTokensBySessionId,
      seatingMapState: query.seatingMapState,
      sessionItemsByDatetime: query.sessionItemsByDatetime,
      ...(query.sessionItemLines !== undefined && { sessionItemLines: query.sessionItemLines }),
      ...(query.useSessionItemLines !== undefined && { useSessionItemLines: query.useSessionItemLines }),
    };
    return this.#cartService.updateCart(updateCartQuery) as Observable<BaseResponse<Cart>>;
  }
}
