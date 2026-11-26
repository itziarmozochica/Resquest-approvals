import { type CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import {
  type FlexibleBundlePlan,
  type FlexibleBundleSession,
  type FlexibleBundleSessions,
} from '@fz-original/app/shared/models/plan/flexible-bundle-sessions.model';
import { isFlexibleBundle } from '@fz-original/app/shared/models/plan/is-flexible-bundle.util';
import { type Bundle, type BundleInformation } from '@fz-original/app/shared/models/plan/plan.model';
import { addAmounts, multiplyAmount, subtractAmounts, type DecimalAmount } from '@fz/ticketing';

import { type DerivedTicketSelectorRow } from '../models/ticket-selector-catalog-item.model';

export interface FlexibleBundleProjectedSessions {
  readonly plans: readonly FlexibleBundlePlan[];
}

export interface FlexibleBundleCompanionPrice {
  readonly amount: DecimalAmount;
  readonly currency: string;
}

export interface FlexibleBundlePricingActivation {
  readonly bundle: BundleInformation | undefined;
  readonly selectedSecondaryPlanIds: ReadonlySet<number>;
  readonly sessions: FlexibleBundleSessions | null;
}

export interface FlexibleBundleVisibleSession {
  readonly mainPlanId: number;
  readonly sessionId: number;
  readonly sourceSessionTypeId: number;
  readonly units: number;
}

export interface FlexibleBundleCartProjection {
  readonly companionsBySourceSessionTypeId: ReadonlyMap<number, readonly FlexibleBundleVisibleSession[]>;
  readonly sessionToMainPlanId: Readonly<Record<number, number>>;
}

export interface FlexibleBundlePricingSnapshotParams extends FlexibleBundlePricingActivation {
  readonly mainPlanId: number | undefined;
}

export interface FlexibleBundlePricingSnapshot {
  readonly availableTypeIds: ReadonlySet<number>;
  readonly bundleIds: number[];
  readonly bundleSize: number;
  /** Companion sum at the current bundle size, that is with the bundle discount applied. Prices the cart totals. */
  readonly companionPriceBySourceSessionTypeId: ReadonlyMap<number, FlexibleBundleCompanionPrice>;
  /** Companion sum at the base prices, that is without the bundle discount. What the tiles and the cart lines show. */
  readonly companionFullPriceBySourceSessionTypeId: ReadonlyMap<number, FlexibleBundleCompanionPrice>;
  readonly isActive: boolean;
  readonly projectedSessions: FlexibleBundleProjectedSessions;
  readonly selectedSecondaryPlanIdsInBundleOrder: readonly number[];
}

export interface FlexibleBundleServerUnitPrices {
  /** Whole-line amounts, unlike `fullPriceBySessionId`, because that is how the backend sends a bundle discount. */
  readonly bundleDiscountBySessionId: ReadonlyMap<number, Money>;
  readonly fullPriceBySessionId: ReadonlyMap<number, Money>;
}

export function isFlexibleBundlePricingActive(params: FlexibleBundlePricingActivation): boolean {
  if (!isFlexibleBundle(params.bundle)) {
    return false;
  }

  if (params.sessions === null || params.sessions.plans.length === 0) {
    return false;
  }

  if (params.selectedSecondaryPlanIds.size === 0) {
    return false;
  }

  return params.selectedSecondaryPlanIds.size >= Math.max((params.bundle.minSize ?? 1) - 1, 0);
}

export function projectFlexibleBundleSessions(
  sessions: FlexibleBundleSessions,
  mainPlanId: number,
  selectedSecondaryPlanIds: ReadonlySet<number>,
): FlexibleBundleProjectedSessions {
  const selectedPlanIds = new Set<number>([mainPlanId, ...selectedSecondaryPlanIds]);

  return {
    plans: sessions.plans.filter((plan: FlexibleBundlePlan) => selectedPlanIds.has(plan.id)),
  };
}

export function getFlexibleBundleSize(view: FlexibleBundleProjectedSessions, mainPlanId: number): number {
  const countedPlanIds = new Set(
    view.plans.filter((plan: FlexibleBundlePlan) => plan.excludeFromBundleSizeCount === false).map((plan: FlexibleBundlePlan) => plan.id),
  );
  const mainPlan = view.plans.find((plan: FlexibleBundlePlan) => plan.id === mainPlanId);

  if (mainPlan === undefined || mainPlan.excludeFromBundleSizeCount === false) {
    countedPlanIds.add(mainPlanId);
  }

  return countedPlanIds.size;
}

export function resolveFlexibleBundleSessionPrice(session: FlexibleBundleSession, bundleSize: number): Money {
  let closestDiscount: FlexibleBundleSession['pricingDiscountByBundleSize'][number] | undefined;

  for (const discount of session.pricingDiscountByBundleSize) {
    if (discount.size == null || discount.size > bundleSize) {
      continue;
    }

    if (closestDiscount?.size == null || discount.size > closestDiscount.size) {
      closestDiscount = discount;
    }
  }

  return closestDiscount?.price ?? session.price;
}

export function getCommonFlexibleBundleSourceSessionTypeIds(
  selectedSecondaryPlanIds: ReadonlySet<number>,
  projectedPlans: readonly FlexibleBundlePlan[],
): Set<number> {
  if (selectedSecondaryPlanIds.size === 0) {
    return new Set();
  }

  const plansById = new Map(projectedPlans.map((plan: FlexibleBundlePlan) => [plan.id, plan]));
  let commonIds: Set<number> | null = null;

  for (const planId of selectedSecondaryPlanIds) {
    const plan = plansById.get(planId);

    if (plan === undefined) {
      return new Set();
    }

    const planTypeIds = new Set(plan.sessions.map((session: FlexibleBundleSession) => session.sourceSessionTypeId));

    if (commonIds === null) {
      commonIds = planTypeIds;
      continue;
    }

    for (const typeId of commonIds) {
      if (!planTypeIds.has(typeId)) {
        commonIds.delete(typeId);
      }
    }
  }

  return commonIds ?? new Set();
}

export function buildFlexibleBundleCompanionPriceBySourceSessionTypeId(
  view: FlexibleBundleProjectedSessions,
  bundleSize: number,
  mainPlanId: number,
): Map<number, FlexibleBundleCompanionPrice> {
  return companionPriceTotals(view, mainPlanId, (session: FlexibleBundleSession) => resolveFlexibleBundleSessionPrice(session, bundleSize));
}

export function buildFlexibleBundleCompanionFullPriceBySourceSessionTypeId(
  view: FlexibleBundleProjectedSessions,
  mainPlanId: number,
): Map<number, FlexibleBundleCompanionPrice> {
  return companionPriceTotals(view, mainPlanId, (session: FlexibleBundleSession) => session.price);
}

function companionPriceTotals(
  view: FlexibleBundleProjectedSessions,
  mainPlanId: number,
  priceOf: (session: FlexibleBundleSession) => Money,
): Map<number, FlexibleBundleCompanionPrice> {
  const totals = new Map<number, FlexibleBundleCompanionPrice>();

  for (const plan of view.plans) {
    if (plan.id === mainPlanId) {
      continue;
    }

    for (const session of plan.sessions) {
      const price = priceOf(session);
      const current = totals.get(session.sourceSessionTypeId);

      if (current === undefined) {
        totals.set(session.sourceSessionTypeId, { amount: decimalAmountFromNumber(price.amount), currency: price.currency });
        continue;
      }

      if (current.currency !== price.currency) {
        continue;
      }

      totals.set(session.sourceSessionTypeId, {
        amount: addAmounts(current.amount, decimalAmountFromNumber(price.amount)),
        currency: current.currency,
      });
    }
  }

  return totals;
}

export function getFlexibleBundleCartBundleIds(bundles: readonly Bundle[], selectedSecondaryPlanIds: ReadonlySet<number>): number[] {
  return selectedSecondaryBundles(bundles, selectedSecondaryPlanIds).map((bundle: Bundle) => bundle.bundleId);
}

export function selectedSecondaryPlanIdsInBundleOrder(bundles: readonly Bundle[], selectedSecondaryPlanIds: ReadonlySet<number>): number[] {
  return selectedSecondaryBundles(bundles, selectedSecondaryPlanIds).map((bundle: Bundle) => bundle.planId);
}

export function buildFlexibleBundleCartProjection(
  visibleSessions: readonly FlexibleBundleVisibleSession[],
  view: FlexibleBundleProjectedSessions,
  mainPlanId: number,
  selectedSecondaryPlanIdsInOrder: readonly number[],
  availableTypeIds: ReadonlySet<number>,
): FlexibleBundleCartProjection {
  const sessionToMainPlanId: Record<number, number> = {};
  const companionsBySourceSessionTypeId = new Map<number, FlexibleBundleVisibleSession[]>();
  const plansById = new Map(view.plans.map((plan: FlexibleBundlePlan) => [plan.id, plan]));

  for (const visible of visibleSessions) {
    if (visible.units <= 0 || !availableTypeIds.has(visible.sourceSessionTypeId)) {
      continue;
    }

    sessionToMainPlanId[visible.sessionId] = mainPlanId;
  }

  for (const secondaryPlanId of selectedSecondaryPlanIdsInOrder) {
    const plan = plansById.get(secondaryPlanId);

    if (plan === undefined) {
      continue;
    }

    for (const visible of visibleSessions) {
      if (visible.units <= 0 || !availableTypeIds.has(visible.sourceSessionTypeId)) {
        continue;
      }

      const companion = companionVisibleSession(visible, plan);

      if (companion === undefined) {
        continue;
      }

      sessionToMainPlanId[companion.sessionId] = secondaryPlanId;
      companionsBySourceSessionTypeId.set(visible.sourceSessionTypeId, [
        ...(companionsBySourceSessionTypeId.get(visible.sourceSessionTypeId) ?? []),
        companion,
      ]);
    }
  }

  return { companionsBySourceSessionTypeId, sessionToMainPlanId };
}

export function buildFlexibleBundleSessionItemLines(
  visibleSessions: readonly FlexibleBundleVisibleSession[],
  view: FlexibleBundleProjectedSessions,
  mainPlanId: number,
  selectedSecondaryPlanIdsInOrder: readonly number[],
  availableTypeIds: ReadonlySet<number>,
): FlexibleBundleVisibleSession[] {
  const availableVisible = visibleSessions.filter(
    (session: FlexibleBundleVisibleSession) => session.units > 0 && availableTypeIds.has(session.sourceSessionTypeId),
  );
  const plansById = new Map(view.plans.map((plan: FlexibleBundlePlan) => [plan.id, plan]));
  const mainLines = availableVisible.map((session: FlexibleBundleVisibleSession) => ({ ...session, mainPlanId }));
  const companionLines = selectedSecondaryPlanIdsInOrder.flatMap((secondaryPlanId: number) => {
    const plan = plansById.get(secondaryPlanId);

    if (plan === undefined) {
      return [];
    }

    return availableVisible.flatMap((visible: FlexibleBundleVisibleSession): FlexibleBundleVisibleSession[] => {
      const companion = companionVisibleSession(visible, plan);

      return companion === undefined ? [] : [companion];
    });
  });

  return [...mainLines, ...companionLines];
}

/**
 * What a bundle can price. Every caller reaches these four facts through a type of its own — a cart line, a
 * catalogue row, an availability — so the rule takes the facts rather than any of those types: adding a fifth
 * stops the other call sites compiling until each one answers it.
 */
export interface FlexibleBundleCandidate {
  readonly hasSeating: boolean;
  readonly isAddOn: boolean;
  readonly isPack: boolean;
  readonly isShopProduct: boolean;
}

export function canJoinFlexibleBundle(candidate: FlexibleBundleCandidate): boolean {
  return !candidate.isAddOn && !candidate.isShopProduct && !candidate.hasSeating && !candidate.isPack;
}

export function applyFlexibleBundleCatalogOverlay(
  rows: readonly DerivedTicketSelectorRow[],
  snapshot: FlexibleBundlePricingSnapshot,
): readonly DerivedTicketSelectorRow[] {
  if (!snapshot.isActive) {
    return rows;
  }

  return rows.map((row: DerivedTicketSelectorRow) => {
    const candidate = { hasSeating: row.hasSeating, isAddOn: row.isAddon, isPack: row.isPack, isShopProduct: row.isShopProduct };

    if (!canJoinFlexibleBundle(candidate) || row.sessionTypeId === null || row.price === null) {
      return row;
    }

    return {
      ...row,
      isBundleUnavailable: isFlexibleBundleSessionTypeUnavailable(row.sessionTypeId, snapshot),
      price: resolveFlexibleBundleDisplayUnitPrice(row.price, row.sessionTypeId, snapshot),
    };
  });
}

/** The price the operator reads on a tile and on a cart line: the whole group, with no bundle discount. */
export function resolveFlexibleBundleDisplayUnitPrice(
  catalogue: { amount: number; currency: string },
  sessionTypeId: number,
  snapshot: FlexibleBundlePricingSnapshot,
): { amount: number; currency: string } {
  return addCompanionAmount(catalogue, snapshot.companionFullPriceBySourceSessionTypeId.get(sessionTypeId), snapshot.isActive);
}

/**
 * The bundle discount of a whole line, which the cart subtracts from the total the way the backend does, leaving
 * the unit price undiscounted. Null when the line earns nothing, so a stale discount is cleared with it.
 */
export function resolveFlexibleBundleLineDiscount(fullUnitPrice: Money, bundledUnitPrice: Money, units: number): Money | null {
  // `multiplyAmount` rejects a non-integer quantity, and a line is always a whole number of tickets.
  if (fullUnitPrice.currency !== bundledUnitPrice.currency || !Number.isInteger(units) || units <= 0) {
    return null;
  }

  const perUnit = subtractAmounts(decimalAmountFromNumber(fullUnitPrice.amount), decimalAmountFromNumber(bundledUnitPrice.amount));
  const amount = numberFromDecimalAmount(multiplyAmount(perUnit, units));

  return amount <= 0 ? null : new Money(amount, fullUnitPrice.currency);
}

/** The price at the current bundle size, that is with the bundle discount applied. Prices the line discount. */
export function resolveFlexibleBundleBundledUnitPrice(
  catalogue: { amount: number; currency: string },
  sessionTypeId: number,
  snapshot: FlexibleBundlePricingSnapshot,
): { amount: number; currency: string } {
  return addCompanionAmount(catalogue, snapshot.companionPriceBySourceSessionTypeId.get(sessionTypeId), snapshot.isActive);
}

function addCompanionAmount(
  catalogue: { amount: number; currency: string },
  companion: FlexibleBundleCompanionPrice | undefined,
  isActive: boolean,
): { amount: number; currency: string } {
  if (!isActive || companion === undefined || companion.currency !== catalogue.currency) {
    return catalogue;
  }

  return {
    amount: numberFromDecimalAmount(addAmounts(decimalAmountFromNumber(catalogue.amount), companion.amount)),
    currency: catalogue.currency,
  };
}

export function buildFlexibleBundleServerUnitPricesBySessionId(
  serverSessions: readonly CartSession[],
  mainPlanId: number,
  sessions: FlexibleBundleSessions,
): FlexibleBundleServerUnitPrices {
  return {
    bundleDiscountBySessionId: serverUnitPriceBySessionId(serverSessions, mainPlanId, sessions, serverBundleDiscount),
    fullPriceBySessionId: serverUnitPriceBySessionId(serverSessions, mainPlanId, sessions, serverUnitPrice),
  };
}

function serverUnitPriceBySessionId(
  serverSessions: readonly CartSession[],
  mainPlanId: number,
  sessions: FlexibleBundleSessions,
  unitPriceOf: (session: CartSession) => Money | null,
): ReadonlyMap<number, Money> {
  const sourceSessionTypeIdByCompanion = new Map<string, number>(
    sessions.plans
      .filter((plan: FlexibleBundlePlan) => plan.id !== mainPlanId)
      .flatMap((plan: FlexibleBundlePlan) =>
        plan.sessions.map((session: FlexibleBundleSession): [string, number] => [`${plan.id}:${session.id}`, session.sourceSessionTypeId]),
      ),
  );
  const companionsBySourceSessionTypeId = new Map<number, Map<string, Money>>();

  for (const session of serverSessions) {
    const key = `${session.mainPlanId ?? ''}:${session.sessionId}`;
    const sourceSessionTypeId = sourceSessionTypeIdByCompanion.get(key);
    const unitPrice = unitPriceOf(session);

    if (sourceSessionTypeId === undefined || unitPrice === null) {
      continue;
    }

    const companions = companionsBySourceSessionTypeId.get(sourceSessionTypeId) ?? new Map<string, Money>();
    companionsBySourceSessionTypeId.set(sourceSessionTypeId, companions.set(key, unitPrice));
  }

  return new Map(
    serverSessions.flatMap((session: CartSession): [number, Money][] => {
      const sessionTypeId = session.sessionType?.id;
      const mainUnitPrice = unitPriceOf(session);

      if (session.mainPlanId != null && session.mainPlanId !== mainPlanId) {
        return [];
      }

      if (sessionTypeId == null || mainUnitPrice == null) {
        return [];
      }

      const companionUnitPrices = [...(companionsBySourceSessionTypeId.get(sessionTypeId)?.values() ?? [])];

      if (companionUnitPrices.some((price: Money) => price.currency !== mainUnitPrice.currency)) {
        return [];
      }

      const amount = companionUnitPrices.reduce(
        (sum: DecimalAmount, price: Money) => addAmounts(sum, decimalAmountFromNumber(price.amount)),
        decimalAmountFromNumber(mainUnitPrice.amount),
      );

      return [[session.sessionId, new Money(numberFromDecimalAmount(amount), mainUnitPrice.currency)]];
    }),
  );
}

export function isFlexibleBundleSessionTypeUnavailable(typeId: number | undefined, snapshot: FlexibleBundlePricingSnapshot): boolean {
  return snapshot.isActive && typeId != null && !snapshot.availableTypeIds.has(typeId);
}

export function buildFlexibleBundlePricingSnapshotForPlan(
  plan: { bundleInformation?: BundleInformation; id?: number } | null | undefined,
  selectedSecondaryPlanIds: ReadonlySet<number>,
  sessions: FlexibleBundleSessions | null,
): FlexibleBundlePricingSnapshot {
  return buildFlexibleBundlePricingSnapshot({
    bundle: plan?.bundleInformation,
    mainPlanId: plan?.id,
    selectedSecondaryPlanIds,
    sessions,
  });
}

export function buildFlexibleBundlePricingSnapshot(params: FlexibleBundlePricingSnapshotParams): FlexibleBundlePricingSnapshot {
  const emptySnapshot: FlexibleBundlePricingSnapshot = {
    availableTypeIds: new Set(),
    bundleIds: [],
    bundleSize: 0,
    companionFullPriceBySourceSessionTypeId: new Map(),
    companionPriceBySourceSessionTypeId: new Map(),
    isActive: false,
    projectedSessions: { plans: [] },
    selectedSecondaryPlanIdsInBundleOrder: [],
  };

  if (params.mainPlanId == null || params.sessions === null || !isFlexibleBundlePricingActive(params)) {
    return emptySnapshot;
  }

  const projectedSessions = projectFlexibleBundleSessions(params.sessions, params.mainPlanId, params.selectedSecondaryPlanIds);
  const availableTypeIds = withCurrencyFailClosed(
    getCommonFlexibleBundleSourceSessionTypeIds(params.selectedSecondaryPlanIds, projectedSessions.plans),
    projectedSessions,
    params.mainPlanId,
  );
  const bundleSize = getFlexibleBundleSize(projectedSessions, params.mainPlanId);
  const selectedSecondaryIds = selectedSecondaryPlanIdsInBundleOrder(params.bundle?.bundles ?? [], params.selectedSecondaryPlanIds);
  return {
    availableTypeIds,
    bundleIds: getFlexibleBundleCartBundleIds(params.bundle?.bundles ?? [], params.selectedSecondaryPlanIds),
    bundleSize,
    companionFullPriceBySourceSessionTypeId: buildFlexibleBundleCompanionFullPriceBySourceSessionTypeId(
      projectedSessions,
      params.mainPlanId,
    ),
    companionPriceBySourceSessionTypeId: buildFlexibleBundleCompanionPriceBySourceSessionTypeId(
      projectedSessions,
      bundleSize,
      params.mainPlanId,
    ),
    isActive: true,
    projectedSessions,
    selectedSecondaryPlanIdsInBundleOrder: selectedSecondaryIds,
  };
}

function companionVisibleSession(
  visible: FlexibleBundleVisibleSession,
  plan: FlexibleBundlePlan,
): FlexibleBundleVisibleSession | undefined {
  const companion = plan.sessions.find((session: FlexibleBundleSession) => session.sourceSessionTypeId === visible.sourceSessionTypeId);

  if (companion === undefined) {
    return undefined;
  }

  return {
    mainPlanId: plan.id,
    sessionId: companion.id,
    sourceSessionTypeId: visible.sourceSessionTypeId,
    units: visible.units,
  };
}

function serverUnitPrice(session: CartSession): Money | null {
  return session.unitPrice ?? null;
}

/**
 * The saving the backend already priced for this line. Summing it across the group is exact, where dividing it
 * into a per-unit price and multiplying back would not be: a discount rarely splits evenly between units.
 *
 * A line the backend did not discount saves zero rather than dropping out of the group. The cart omits
 * `bundle_discount` on an undiscounted line, and the main plan is routinely the one carrying no saving, so
 * skipping it would strip the whole group of the companion savings keyed on it.
 */
function serverBundleDiscount(session: CartSession): Money | null {
  const currency = session.unitPrice?.currency;

  if (currency == null) {
    return null;
  }

  const bundleDiscount = session.bundleDiscount;

  if (bundleDiscount == null) {
    return new Money(0, currency);
  }

  return bundleDiscount.currency === currency ? bundleDiscount : null;
}

function decimalAmountFromNumber(amount: number): DecimalAmount {
  return String(amount);
}

function numberFromDecimalAmount(amount: DecimalAmount): number {
  return Number(amount);
}

function selectedSecondaryBundles(bundles: readonly Bundle[], selectedSecondaryPlanIds: ReadonlySet<number>): Bundle[] {
  return bundles.filter(
    (bundle: Bundle, index: number) =>
      selectedSecondaryPlanIds.has(bundle.planId) && bundles.findIndex((other: Bundle) => other.planId === bundle.planId) === index,
  );
}

function withCurrencyFailClosed(availableTypeIds: Set<number>, view: FlexibleBundleProjectedSessions, mainPlanId: number): Set<number> {
  const mainPlan = view.plans.find((plan: FlexibleBundlePlan) => plan.id === mainPlanId);
  const mainCurrencyByTypeId = new Map(
    (mainPlan?.sessions ?? []).map((session: FlexibleBundleSession) => [session.sessionTypeId, session.price.currency]),
  );

  for (const plan of view.plans) {
    if (plan.id === mainPlanId) {
      continue;
    }

    for (const session of plan.sessions) {
      if (!availableTypeIds.has(session.sourceSessionTypeId)) {
        continue;
      }

      const mainCurrency = mainCurrencyByTypeId.get(session.sourceSessionTypeId);

      if (mainCurrency !== undefined && session.price.currency !== mainCurrency) {
        availableTypeIds.delete(session.sourceSessionTypeId);
      }
    }
  }

  return availableTypeIds;
}
