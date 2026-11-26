import { computed, inject, Injectable, Injector } from '@angular/core';

import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { isFlexibleBundle } from '@fz-original/app/shared/models/plan/is-flexible-bundle.util';
import { type Bundle } from '@fz-original/app/shared/models/plan/plan.model';

import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosFlexibleBundleStore } from '../../store/pos-flexible-bundle.store';
import {
  buildFlexibleBundlePricingSnapshotForPlan,
  buildFlexibleBundleServerUnitPricesBySessionId,
  buildFlexibleBundleSessionItemLines,
  canJoinFlexibleBundle,
  isFlexibleBundleSessionTypeUnavailable,
  resolveFlexibleBundleBundledUnitPrice,
  resolveFlexibleBundleDisplayUnitPrice,
  resolveFlexibleBundleLineDiscount,
  type FlexibleBundlePricingSnapshot,
  type FlexibleBundleServerUnitPrices,
  type FlexibleBundleVisibleSession,
} from '../../utils/flexible-bundle-session-prices.util';
import { PosCartService } from '../cart/pos-cart.service';

export interface FlexibleBundleCartWriteSelection {
  readonly bundleIds: readonly number[];
  readonly secondaryPlanIds: readonly number[];
}

interface FlexibleBundleServerUnitPricesForCart {
  readonly cartId: string | null;
  readonly prices: FlexibleBundleServerUnitPrices;
  readonly selection: string;
}

@Injectable()
export class PosFlexibleBundleService {
  readonly #injector = inject(Injector);
  readonly #state = inject(PosTicketingState);
  readonly #store = inject(PosFlexibleBundleStore);

  readonly snapshot = computed<FlexibleBundlePricingSnapshot>(() =>
    buildFlexibleBundlePricingSnapshotForPlan(
      this.#state.activePlan(),
      this.#state.selectedSecondaryPlanIds(),
      this.#store.flexibleBundleSessions(),
    ),
  );

  #serverUnitPrices: FlexibleBundleServerUnitPricesForCart | null = null;

  constructor() {
    this.#store.registerOnSettled(() => this.#cart().syncFlexibleBundlePricing());
  }

  adoptServerCart(cart: Cart): Cart {
    const secondaryPlanIds = this.#selectedSecondaryPlanIds();

    if (secondaryPlanIds.size === 0) {
      return cart;
    }

    this.#serverUnitPrices = this.#serverUnitPricesOf(cart);
    const sessionItemsByDatetime = new Map<string, CartSession[]>();

    for (const [datetime, sessions] of cart.sessionItemsByDatetime) {
      const kept = sessions.filter((session: CartSession) => !this.#isCompanionSession(session, secondaryPlanIds));

      if (kept.length > 0) {
        sessionItemsByDatetime.set(datetime, kept);
      }
    }

    cart.sessionItemsByDatetime = sessionItemsByDatetime;
    const serverPrices = this.#serverUnitPrices?.prices ?? null;
    this.#priceMainPlanSessions(cart, serverPrices);
    this.#priceMainPlanSessions(this.#state.nonConfirmedCart, serverPrices);
    this.#fillFlexibleBundleFields(this.#state.nonConfirmedCart);
    return cart;
  }

  applyUnitPrices(cart: Cart | null): void {
    this.#holdUnavailableLines(cart);
    this.#priceMainPlanSessions(cart, this.#serverUnitPricesForCurrentCart());
    this.#fillFlexibleBundleFields(cart);
  }

  bundleIdsForCartRequest(): { bundleIds: number[] } {
    const snapshot = this.snapshot();

    return { bundleIds: snapshot.isActive ? snapshot.bundleIds : [] };
  }

  canIncreaseSessionType(typeId: number | undefined): boolean {
    return !isFlexibleBundleSessionTypeUnavailable(typeId, this.snapshot());
  }

  canSaveCart(cart: Cart | null = this.#state.nonConfirmedCart): boolean {
    return cart === null || !this.#hasOnlyHeldLines(cart, this.unavailableCartSessionIds(cart));
  }

  cartWriteSelection(): FlexibleBundleCartWriteSelection {
    const snapshot = this.snapshot();

    return {
      bundleIds: this.bundleIdsForCartRequest().bundleIds,
      secondaryPlanIds: snapshot.isActive ? snapshot.selectedSecondaryPlanIdsInBundleOrder : [],
    };
  }

  sessionItemsForCartRequest(cart: Cart): Map<string, CartSession[]> {
    const snapshot = this.snapshot();
    const mainPlanId = this.#mainPlanId();

    if (!snapshot.isActive || mainPlanId == null) {
      return cart.sessionItemsByDatetime;
    }

    const secondaryPlanIds = this.#selectedSecondaryPlanIds();
    const unavailableSessionIds = this.unavailableCartSessionIds(cart);
    const sessionItemsByDatetime = new Map<string, CartSession[]>();
    const companionsByPlanSession = new Map<string, CartSession>();

    for (const [datetime, sessions] of cart.sessionItemsByDatetime) {
      const others = sessions.filter((session: CartSession) => !this.#isCompanionSession(session, secondaryPlanIds));
      const expandable = this.#mainPlanRegularSessions(others).filter(
        (session: CartSession) => session.units > 0 && session.sessionType?.id != null,
      );
      const lines = buildFlexibleBundleSessionItemLines(
        expandable.flatMap((session: CartSession) => {
          const sourceSessionTypeId = session.sessionType?.id;

          return sourceSessionTypeId == null
            ? []
            : [{ mainPlanId, sessionId: session.sessionId, sourceSessionTypeId, units: session.units }];
        }),
        snapshot.projectedSessions,
        mainPlanId,
        snapshot.selectedSecondaryPlanIdsInBundleOrder,
        snapshot.availableTypeIds,
      );
      const expandedSessions = [
        ...this.#mainSessionsFromLines(expandable, lines, mainPlanId),
        ...this.#newCompanionSessionsFromLines(lines, mainPlanId, companionsByPlanSession),
        ...others.filter((session: CartSession) => !expandable.includes(session) && !unavailableSessionIds.has(session.sessionId)),
      ];

      if (expandedSessions.length > 0) {
        sessionItemsByDatetime.set(datetime, expandedSessions);
      }
    }

    return sessionItemsByDatetime;
  }

  setSecondaryPlans(ids: ReadonlySet<number>): void {
    this.#state.selectedSecondaryPlanIds.set(new Set(ids));
    this.#cart().syncFlexibleBundlePricing();
  }

  shouldResendCart(): boolean {
    const cart = this.#state.nonConfirmedCart;
    const serverCart = this.#state.cart;

    if (serverCart === null || cart === null || this.#state.partner == null || !this.#hasVisibleRegularUnits(cart)) {
      return false;
    }

    if (!this.canSaveCart(cart)) {
      return false;
    }

    const bundlePlanIds = this.#bundlePlanIds();
    const hasCompanionLines = (serverCart.sessionItemLines ?? []).some(
      (line: { mainPlanId: number | null }) => line.mainPlanId != null && bundlePlanIds.has(line.mainPlanId),
    );

    return this.snapshot().isActive || hasCompanionLines;
  }

  /**
   * Session ids, not type ids, so a reader needs no bundle rule of its own to use them: the lines a companion
   * cannot sell are already singled out here. A seated line can share its type with a regular one, which is
   * why type ids alone would mark the wrong row.
   */
  unavailableCartSessionIds(cart: Cart | null = this.#state.nonConfirmedCart): ReadonlySet<number> {
    if (cart === null) {
      return new Set();
    }

    const snapshot = this.snapshot();

    return new Set(
      this.#mainPlanRegularSessions([...cart.sessionItemsByDatetime.values()].flat())
        .filter((session: CartSession) => isFlexibleBundleSessionTypeUnavailable(session.sessionType?.id, snapshot))
        .map((session: CartSession) => session.sessionId),
    );
  }

  #bundlePlanIds(): ReadonlySet<number> {
    const plan = this.#state.activePlan();

    if (plan == null || !isFlexibleBundle(plan.bundleInformation)) {
      return new Set();
    }

    return new Set(plan.bundleInformation.bundles.map((bundle: Bundle) => bundle.planId).filter((planId: number) => planId !== plan.id));
  }

  #cart(): PosCartService {
    return this.#injector.get(PosCartService);
  }

  #cataloguePriceBySessionId(): ReadonlyMap<number, Money> {
    const cataloguePriceBySessionId = new Map<number, Money>();
    const summaries = [...this.#state.regularSessionAvailabilitySummaryByDateList, this.#state.selectedSession];

    for (const summary of summaries) {
      for (const datetime of summary?.sessionAvailabilityByDatetimeList ?? []) {
        for (const availability of datetime.sessionAvailabilityList) {
          if (availability.ticketPrice !== null) {
            cataloguePriceBySessionId.set(availability.id, availability.ticketPrice);
          }
        }
      }
    }

    return cataloguePriceBySessionId;
  }

  #fillFlexibleBundleFields(cart: Cart | null): void {
    if (cart === null) {
      return;
    }

    const sessions = this.#mainPlanRegularSessions([...cart.sessionItemsByDatetime.values()].flat());
    const bundleDiscountCurrency = [...cart.sessionItemsByDatetime.values()]
      .flat()
      .find((session: CartSession) => (session.bundleDiscount?.amount ?? 0) > 0)?.bundleDiscount?.currency;
    cart.totalBundleDiscount =
      bundleDiscountCurrency === undefined ? null : new Money(cart.getBundleDiscountTotal(), bundleDiscountCurrency);

    if (!this.snapshot().isActive) {
      for (const session of sessions) {
        session.sourceSessionTypeId = null;
      }
      cart.isFlexibleBundle = false;
      return;
    }

    for (const session of sessions) {
      session.sourceSessionTypeId = session.sessionType?.id ?? null;
    }
    cart.isFlexibleBundle = true;
  }

  #groupPricingOf(
    session: CartSession,
    serverPrices: FlexibleBundleServerUnitPrices | null,
    cataloguePriceBySessionId: ReadonlyMap<number, Money>,
    snapshot: FlexibleBundlePricingSnapshot,
  ): { discount: Money | null; full: Money } | null {
    const serverFull = serverPrices?.fullPriceBySessionId.get(session.sessionId);

    if (serverFull !== undefined) {
      const serverDiscount = serverPrices?.bundleDiscountBySessionId.get(session.sessionId);

      return { discount: serverDiscount != null && serverDiscount.amount > 0 ? serverDiscount : null, full: serverFull };
    }

    const catalogue = cataloguePriceBySessionId.get(session.sessionId);
    const sessionTypeId = session.sessionType?.id;

    if (catalogue == null || sessionTypeId == null) {
      return null;
    }

    const full = resolveFlexibleBundleDisplayUnitPrice(catalogue, sessionTypeId, snapshot);
    const bundled = resolveFlexibleBundleBundledUnitPrice(catalogue, sessionTypeId, snapshot);
    const fullPrice = new Money(full.amount, full.currency);

    return {
      discount: resolveFlexibleBundleLineDiscount(fullPrice, new Money(bundled.amount, bundled.currency), session.units),
      full: fullPrice,
    };
  }

  #hasOnlyHeldLines(cart: Cart, unavailableSessionIds: ReadonlySet<number>): boolean {
    const sessions = [...cart.sessionItemsByDatetime.values()].flat();

    return (
      sessions.some((session: CartSession) => unavailableSessionIds.has(session.sessionId)) &&
      sessions.every((session: CartSession) => session.units === 0)
    );
  }

  #hasVisibleRegularUnits(cart: Cart): boolean {
    return this.#mainPlanRegularSessions([...cart.sessionItemsByDatetime.values()].flat()).some(
      (session: CartSession) => session.units > 0,
    );
  }

  #holdUnavailableLines(cart: Cart | null): void {
    const unavailableSessionIds = this.unavailableCartSessionIds(cart);

    for (const session of [...(cart?.sessionItemsByDatetime.values() ?? [])].flat()) {
      if (unavailableSessionIds.has(session.sessionId)) {
        session.units = 0;
      }
    }
  }

  #isCompanionSession(session: CartSession, secondaryPlanIds: ReadonlySet<number>): boolean {
    return this.#isRegularTicketSession(session) && session.mainPlanId != null && secondaryPlanIds.has(session.mainPlanId);
  }

  #isRegularTicketSession(session: CartSession): boolean {
    return canJoinFlexibleBundle({
      hasSeating: session.hasSeating === true,
      isAddOn: session.sessionType?.isAddOn === true,
      isPack: session.isPack === true,
      isShopProduct: session.sessionType?.isShopProduct === true,
    });
  }

  #mainPlanId(): number | undefined {
    return this.#state.activePlan()?.id ?? this.#state.selectedPlan?.id;
  }

  #mainPlanRegularSessions(sessions: readonly CartSession[]): CartSession[] {
    const mainPlanId = this.#mainPlanId();
    const secondaryPlanIds = this.#selectedSecondaryPlanIds();

    return sessions.filter(
      (session: CartSession) =>
        this.#isRegularTicketSession(session) &&
        !this.#isCompanionSession(session, secondaryPlanIds) &&
        (session.mainPlanId == null || mainPlanId == null || session.mainPlanId === mainPlanId),
    );
  }

  #mainSessionsFromLines(
    mainSessions: readonly CartSession[],
    lines: readonly FlexibleBundleVisibleSession[],
    mainPlanId: number,
  ): CartSession[] {
    return lines
      .filter((line: FlexibleBundleVisibleSession) => line.mainPlanId === mainPlanId)
      .map((line: FlexibleBundleVisibleSession) => {
        const mainSession = mainSessions.find((session: CartSession) => session.sessionId === line.sessionId);
        const session = mainSession?.clone() ?? new CartSession(line.sessionId, line.units);
        session.mainPlanId = line.mainPlanId;
        session.units = line.units;
        return session;
      });
  }

  #newCompanionSessionsFromLines(
    lines: readonly FlexibleBundleVisibleSession[],
    mainPlanId: number,
    companionsByPlanSession: Map<string, CartSession>,
  ): CartSession[] {
    return lines
      .filter((line: FlexibleBundleVisibleSession) => line.mainPlanId !== mainPlanId)
      .flatMap((line: FlexibleBundleVisibleSession) => {
        const key = `${line.mainPlanId}:${line.sessionId}`;
        const companion = companionsByPlanSession.get(key);

        if (companion !== undefined) {
          companion.units += line.units;
          return [];
        }

        const newCompanion = new CartSession(line.sessionId, line.units);
        newCompanion.mainPlanId = line.mainPlanId;
        companionsByPlanSession.set(key, newCompanion);
        return [newCompanion];
      });
  }

  /**
   * Each main-plan line carries the undiscounted group price as its unit price and the group's bundle discount
   * apart, the way the backend sends them, so the line reads one price and `Cart` nets the discount off the total.
   */
  #priceMainPlanSessions(cart: Cart | null, serverPrices: FlexibleBundleServerUnitPrices | null): void {
    if (cart === null || !isFlexibleBundle(this.#state.activePlan()?.bundleInformation)) {
      return;
    }

    const snapshot = this.snapshot();
    const cataloguePriceBySessionId = this.#cataloguePriceBySessionId();

    for (const session of this.#mainPlanRegularSessions([...cart.sessionItemsByDatetime.values()].flat())) {
      const pricing = this.#groupPricingOf(session, serverPrices, cataloguePriceBySessionId, snapshot);

      if (pricing === null) {
        continue;
      }

      session.unitPrice = pricing.full;
      session.bundleDiscount = pricing.discount;
    }

    if ([...cart.sessionItemsByDatetime.values()].flat().every((session: CartSession) => session.unitPrice != null)) {
      cart.calculateTotal(cart.appliedCoupon ?? undefined);
    }
  }

  #selectedSecondaryPlanIds(): ReadonlySet<number> {
    const selectedSecondaryPlanIds = this.#state.selectedSecondaryPlanIds();

    return new Set([...this.#bundlePlanIds()].filter((planId: number) => selectedSecondaryPlanIds.has(planId)));
  }

  #serverUnitPricesForCurrentCart(): FlexibleBundleServerUnitPrices | null {
    const serverUnitPrices = this.#serverUnitPrices;
    const isForCurrentCart =
      serverUnitPrices !== null &&
      serverUnitPrices.cartId !== null &&
      serverUnitPrices.cartId === this.#state.cart?.id &&
      serverUnitPrices.selection === this.#serverUnitPricesSelection();

    return isForCurrentCart ? serverUnitPrices.prices : null;
  }

  #serverUnitPricesOf(cart: Cart): FlexibleBundleServerUnitPricesForCart | null {
    const mainPlanId = this.#mainPlanId();
    const sessions = this.#store.flexibleBundleSessions();

    if (mainPlanId == null || sessions === null) {
      return null;
    }

    const selectedSecondaryPlanIds = this.#selectedSecondaryPlanIds();
    const bundledSessions = [...cart.sessionItemsByDatetime.values()]
      .flat()
      .filter(
        (session: CartSession) =>
          this.#isRegularTicketSession(session) &&
          (session.mainPlanId == null || session.mainPlanId === mainPlanId || selectedSecondaryPlanIds.has(session.mainPlanId)),
      );

    return {
      cartId: cart.id ?? null,
      prices: buildFlexibleBundleServerUnitPricesBySessionId(bundledSessions, mainPlanId, sessions),
      selection: this.#serverUnitPricesSelection(),
    };
  }

  #serverUnitPricesSelection(): string {
    return JSON.stringify([this.#mainPlanId(), this.cartWriteSelection()]);
  }
}
