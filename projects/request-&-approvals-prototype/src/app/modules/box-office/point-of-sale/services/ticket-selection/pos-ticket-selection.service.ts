import { computed, effect, inject, Injectable, Injector, signal, Signal, untracked, WritableSignal } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { OnsiteSetup, type OnsiteSetupOssCustomTab } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart, PRODUCTS_GROUP_KEY } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { ProductSession } from '@fz-original/app/shared/models/product-sessions-summary/product-sessions-summary-response.model';
import { RegularSessionAvailabilitySummaryByDate } from '@fz-original/app/shared/models/session-availability/regular-session-availability-summary-by-date.model';
import { SessionAvailabilitySummary } from '@fz-original/app/shared/models/session-availability/session-availability-summary.model';
import { SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';
import { SessionType } from '@fz-original/app/shared/models/session-type/session-type.model';
import { OngoingMultiDayTicketGroup } from '@fz-original/app/shared/models/ticket-type/ongoing-multi-day-ticket-group.model';
import { TicketType } from '@fz-original/app/shared/models/ticket-type/ticket-type.model';
import { ContactInformationDraftService } from '@fz-original/app/shared/services/contact-information-draft/contact-information-draft.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ProductSessionsSummaryService } from '@fz-original/app/shared/services/product-sessions-summary/product-sessions-summary.service';
import { OngoingSessionUtil } from '@fz-original/app/shared/utils/ongoing-session.util';
import { safeStepQuantity } from '@fz-original/app/shared/utils/ticket-step.util';
import { type CustomTabForDateQuery, type CustomTabState, type SessionQuantities } from '@fz/ticketing';
import { signalMethod } from '@ngrx/signals';
import moment from 'moment-timezone';

import {
  HierarchyNavigationLeafNode,
  HierarchyNavigationLevel,
  HierarchyNavigationParentNode,
  OssCustomTabData,
  OssCustomTile,
  OssCustomTileExtraInfoHierarchyElement,
  OssCustomTilesData,
  OssHierarchyCategory,
  OssHierarchyProduct,
  OssSessionAvailability,
  OssSessionWithCustomTile,
  OssTab,
  OssTargetElementType,
  UpdateTicketTypeCounter,
} from '../../../one-stop-shop/models';
import { type PosCartSource } from '../../../one-stop-shop/tracking/events/pos-cart-item-quantity-change.event';
import { TrackPosCartItemQuantityChangeService } from '../../../one-stop-shop/tracking/services/track-pos-cart-item-quantity-change.service';
import { areTabDescriptorsEqual, toOssTab, type PosTabDescriptor } from '../../models/store/pos-ticket-selector-store.model';
import { type DerivedTicketSelectorRow, type TicketSelectorCatalogItem } from '../../models/ticket-selector-catalog-item.model';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosAvailabilityStore } from '../../store/pos-availability.store';
import { PosTicketSelectorStore } from '../../store/pos-ticket-selector.store';
import { POS_TICKET_SELECTOR_REARCHITECT } from '../../tokens/pos-ticket-selector-rearchitect.token';
import { canJoinFlexibleBundle } from '../../utils/flexible-bundle-session-prices.util';
import { isPartyMembersMode, isSameStartTime } from '../../utils/pos-party-members.util';
import { canTicketTypeCarryUnits } from '../../utils/pos-ticket-type-units.util';
import { PosAvailabilityService } from '../availability/pos-availability.service';
import { PosCartService } from '../cart/pos-cart.service';
import { PosFlexibleBundleService } from '../flexible-bundle/pos-flexible-bundle.service';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';
import { PosPurchaseService } from '../purchase/pos-purchase.service';
import { PosSeatingService } from '../seating/pos-seating.service';
import { PosSecondScreenService } from '../second-screen/pos-second-screen.service';
import { type PosTabUiHandlers } from '../setup/pos-setup.service';

/** Counter maps as the ticket selector emits them. */
export interface TicketTypeCounterSelection {
  bySessionId: Map<string, number>;
  bySessionType: Map<string, number>;
}

interface OngoingSessionIdsCache {
  readonly buckets: RegularSessionAvailabilitySummaryByDate[];
  readonly calendarDate: string;
  readonly ids: Set<number>;
  readonly timezone: string;
}

/**
 * Ticket-type rows and the selection counters behind them.
 *
 * `selectTicketCounter` is deliberately absent: the OSS path is `newSelectTicketCounter`.
 */
@Injectable()
export class PosTicketSelectionService {
  readonly #contactInformationDraft = inject(ContactInformationDraftService);
  readonly #flexibleBundle = inject(PosFlexibleBundleService);
  readonly #injector = inject(Injector);
  readonly #isTicketSelectorRearchitectEnabled = inject(POS_TICKET_SELECTOR_REARCHITECT);
  /**
   * Retail catalog lookups are synchronous reads over the already-loaded catalog store — not
   * API-shaped, so they stay a direct dependency rather than going through `TicketingCoreService`.
   */
  readonly #partnerService = inject(PartnerService);
  readonly #productCatalog = inject(ProductSessionsSummaryService);
  readonly #selector = inject(PosTicketSelectorStore);
  readonly #state = inject(PosTicketingState);
  readonly #trackCartItemQuantityChange = inject(TrackPosCartItemQuantityChangeService);
  readonly #viewUpdate = inject(PosViewUpdateService);

  // Sibling strategies are resolved lazily: the call graph is bidirectional (cart's
  // `clearCart` calls `updateCapacityLimit`, this strategy calls cart's `updateNonConfirmedCart`), so
  // eager field injection would form a DI cycle (NG0200).
  #availabilityStrategy?: PosAvailabilityService;
  #cartStrategy?: PosCartService;
  #purchaseStrategy?: PosPurchaseService;
  #seatingStrategy?: PosSeatingService;
  #secondScreenStrategy?: PosSecondScreenService;

  readonly activeCustomTab: Signal<OssCustomTabData | null> = computed(() => {
    const tabSignals = this.#state.customTabSignals();
    const index = this.#state.activeCustomTabIndex();
    return tabSignals[index]?.() || null;
  });

  readonly customTabTilesData: Signal<(OssCustomTilesData | null)[]> = computed(() =>
    this.#state.customTabSignals().map(tabSignal => tabSignal()?.tilesData || null),
  );

  readonly customTabHasTilesData: Signal<boolean[]> = computed(() =>
    this.#state.customTabSignals().map(tabSignal => !!tabSignal()?.tilesData),
  );

  readonly #hierarchyLevelsCache = new Map<string, HierarchyNavigationLevel | null>();

  /** The structural cache keeps tile-availability changes from rebuilding the tree. */
  readonly customTabHierarchyLevels: Signal<(HierarchyNavigationLevel | null)[]> = computed(() =>
    this.customTabTilesData().map(data => {
      if (!data) {
        return null;
      }
      const cacheKey = this.#createStructuralCacheKey(data);
      if (this.#hierarchyLevelsCache.has(cacheKey)) {
        return this.#hierarchyLevelsCache.get(cacheKey)!;
      }
      const result = this.convertCustomTabsToHierarchy(data);
      this.#hierarchyLevelsCache.set(cacheKey, result);
      return result;
    }),
  );

  readonly customTabIcons: Signal<IconProp[]> = computed(() =>
    this.#state.customTabSignals().map(tabSignal => tabSignal()?.setupIcon || (['fal', 'heart'] as IconProp)),
  );

  readonly customTabNames: Signal<string[]> = computed(() => this.#state.customTabSignals().map(tabSignal => tabSignal()?.setupName || ''));

  readonly #customTileUnavailability: WritableSignal<ReadonlyMap<number, boolean>> = signal<ReadonlyMap<number, boolean>>(new Map());

  readonly customTileSessionAvailabilityMaps: Signal<(Map<number, { isUnavailable: boolean }> | null)[]> = computed(() => {
    const unavailability = this.#customTileUnavailability();

    return this.customTabTilesData().map(data => {
      if (!data) {
        return null;
      }
      const availabilityMap = new Map<number, { isUnavailable: boolean }>();
      data.customTiles.forEach(wrapper => {
        wrapper.customTile.sessions.forEach(session => {
          availabilityMap.set(session.id, {
            isUnavailable: unavailability.get(session.id) ?? false,
          });
        });
      });
      return availabilityMap;
    });
  });

  readonly initializeCustomTabs = signalMethod<OnsiteSetup | null>((onsiteSetup: OnsiteSetup | null): void => {
    if (onsiteSetup === null) {
      return;
    }
    const customTabs = onsiteSetup.custom_tabs ?? [];
    const datetime = this.#nowDatetime();

    this.#clearCustomTileUnavailability();
    this.#selector.initCustomTabs(customTabs.map(customTab => ({ datetime, setupId: customTab.id })));
    customTabs.forEach(customTab => {
      this.#selector.fetchCustomTab({ query: this.#customTabQuery(customTab.id, datetime), setupId: customTab.id });
    });
  });

  readonly #loggedCustomTabErrorIds = new Set<string>();

  #tabUiHandlers: PosTabUiHandlers | null = null;
  #lastRegularRowKeys = new Set<string | undefined>();
  #lastOngoingRowKeys = new Set<string>();
  #isWritingPartySelection = false;
  #ongoingSessionIds: OngoingSessionIdsCache | null = null;

  constructor() {
    effect(() => {
      this.#selector.customTabEntities().forEach((customTab: CustomTabState, index: number) => {
        if (customTab.error === null) {
          this.#loggedCustomTabErrorIds.delete(customTab.setupId);

          return;
        }
        if (this.#loggedCustomTabErrorIds.has(customTab.setupId)) {
          return;
        }
        this.#loggedCustomTabErrorIds.add(customTab.setupId);
        console.error(`Error loading Custom Tab ${index}:`, customTab.error);
      });
    });
  }

  /**
   * Folds custom-tile sessions into `ticketTypes` / `productTypes`.
   *
   * With an empty cart the rows are dropped first so a tab switch cannot leave stale tiles
   * behind.
   */
  addCustomTileSessionsToTicketTypes(customTilesData: OssCustomTilesData): void {
    if (!this.#state.cart && !this.#state.nonConfirmedCart) {
      this.#state.ticketTypes = [];
      this.updateAvailableTabs();
    }
    customTilesData.customTiles.forEach(customTile => {
      customTile.customTile.sessions.forEach(session => {
        const ticketType = new TicketType(
          session.name,
          session.sessionType?.id,
          session.minimumTicketsAllowedPerBooking,
          session.getMaximumSelectableTickets(this.#state.canOverrideCapacities),
          !this.isSessionDisabledConsideringOverride(session),
          session.isHidden,
          session.availableTickets,
          session.ticketPrice ?? undefined,
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
          if (!this.#state.productTypes.some(productType => productType.sessionId === session.id)) {
            this.#state.productTypes.push(ticketType);
          }

          return;
        }

        if (!this.#state.ticketTypes.some(existing => existing.sessionId === session.id)) {
          this.#state.ticketTypes.push(ticketType);
        }
      });
    });
  }

  /**
   * Shop-product tiles also have to become product session availabilities. A product a seeded modification
   * cart already registered takes the tile's pack step while keeping the ceiling it was given.
   */
  addProductSessionsByCustomTabsProductSessions(customTilesData: OssCustomTilesData): void {
    customTilesData.customTiles.forEach(customTile => {
      customTile.customTile.sessions.forEach(session => {
        if (!session.sessionType?.isShopProduct) {
          return;
        }
        const seededLine = this.#state.isModifyOrderCartSeeded ? this.#state.modifyOrderSeededProductLines.get(session.id) : undefined;
        if (seededLine) {
          this.#applySeededProductLimits(session, seededLine.maximum);
          return;
        }
        if (!this.#state.productSessions.some(productSession => productSession.id === session.id)) {
          this.#state.productSessions.push(session);
        }
      });
    });
  }

  /** Retail/product add-to-cart shortcut used by tiles, search and the scanner. */
  addProductSessionToCartUsingTicketTypeCounter(productSession: ProductSession, skipPosCartTracking = false): void {
    if (this.#purchase.isReservationSettlementMode()) {
      return;
    }
    this.#addProductSessionToProductTypesIfNotPresent(productSession);
    this.#addProductSessionToProductSessionAvailabilitiesIfNotPresent(productSession);
    this.updateTicketTypeFields();

    const sessionIdStr = productSession.id.toString();
    const currentCountById = this.#state.selectedTicketsBySessionId.get(sessionIdStr) || 0;
    const currentCountByType = this.#state.selectedTicketsBySessionType.get(productSession.title) || 0;
    const newCount = Math.max(currentCountById, currentCountByType) + 1;

    const updatedBySessionId = new Map(this.#state.selectedTicketsBySessionId);
    const updatedBySessionType = new Map(this.#state.selectedTicketsBySessionType);

    updatedBySessionId.set(sessionIdStr, newCount);
    updatedBySessionType.set(productSession.session_type.label, newCount);

    const ticketTypeCounter = {
      bySessionId: updatedBySessionId,
      bySessionType: updatedBySessionType,
    };
    this.newSelectTicketCounter(ticketTypeCounter, true, skipPosCartTracking);
  }

  /**
   * Parity-locked: the group-rule condition is inlined here instead of extracted into
   * `gatesAddToCartOnGroupRuleViolations()` / `hasGroupRuleViolations()`. Those two members are not
   * implemented, but the condition itself must stay — dropping it would let group-rule-violating
   * carts through.
   */
  addSessionsToCartIsDisabled(): boolean {
    if (this.cartIsNotEmptyAndContainsOnlyShopProducts()) {
      return this.#state.isLoadingCart;
    }

    if (this.#state.disableAddSessionsToCartByCapacity || this.#baseAddSessionsToCartIsDisabled()) {
      return true;
    }

    if (!this.#flexibleBundle.canSaveCart()) {
      return true;
    }

    return !this.#state.selectedSession;
  }

  /**
   * A tile asked for one more unit of a session.
   *
   * Sessions the catalog knows but the current rows do not go straight through the product path;
   * everything else is delegated to the ticket-selector rows via `addCounterSessionId`.
   */
  addUnitBySessionId(sessionId: number): void {
    if (this.#shouldRejectUnavailableFlexibleBundleChange(sessionId, true)) {
      return;
    }

    const sessionIsKnownInTicketOrProductTypes =
      this.#state.ticketTypes.some(ticketType => ticketType.sessionId === sessionId) ||
      this.#state.productTypes.some(productType => productType.sessionId === sessionId);
    if (!sessionIsKnownInTicketOrProductTypes) {
      const productSession = this.#productCatalog.getSessionDataBySessionId(sessionId);
      if (productSession) {
        const previousCount = this.#state.selectedTicketsBySessionId.get(productSession.id.toString()) ?? 0;
        this.addProductSessionToCartUsingTicketTypeCounter(productSession, true);
        this.trackPosCartItemQuantityChange({
          newCount: previousCount + 1,
          previousCount,
          sessionId: productSession.id,
          source: 'from_tile',
        });
        return;
      }
    }
    this.#state.tileAddSessionId = sessionId;
    try {
      this.#state.addCounterSessionId.next(sessionId);
    } finally {
      this.#state.tileAddSessionId = null;
    }
  }

  // ───────────────────────────────────────── ticket-type rows ─────────────────────────────────────

  /**
   * Public because the purchase flow's mandatory-field logic asks the same question; both call
   * sites pass `nonConfirmedCart`, hence the default.
   */
  cartIsNotEmptyAndContainsOnlyShopProducts(cart: Cart | null = this.#state.nonConfirmedCart): boolean {
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

  /** Zeroes the by-type counters while keeping their keys, so the rows stay rendered. */
  clearCounters(): void {
    const emptyValues: Array<[string, number]> = Array.from(this.#state.selectedTicketsBySessionType.keys()).map(key => [key, 0]);
    this.#state.selectedTicketsBySessionType = new Map(emptyValues);
  }

  /** Composed with `clearSelectedTicketsReferences`, which preserves custom-tab selections. */
  clearSelectedTickets(): void {
    this.clearSelectedTicketsReferences();
    this.#state.selectedSession = null;
    const types = [...this.#state.ticketTypes];
    this.#state.ticketTypes = [];
    this.#state.ticketTypes = types;
  }

  // ──────────────────────────────────────────── counters ──────────────────────────────────────────

  /**
   * The reset keeps custom-tab product selections, which live outside the availability-driven
   * rows.
   */
  clearSelectedTicketsReferences(): void {
    const hasProducts = this.#state.productSessions.length > 0;
    const hasDataToPreserve = this.#state.selectedTicketsBySessionId.size > 0 || this.#state.selectedTicketsBySessionType.size > 0;
    if (!hasProducts || !hasDataToPreserve) {
      this.#baseClearSelectedTicketsReferences();
      return;
    }

    const { customTabSelectionsBySessionId, customTabSelectionsBySessionType } = this.#extractCustomTabsSelections();
    this.#baseClearSelectedTicketsReferences();
    this.#restoreCustomTabsSelections(customTabSelectionsBySessionId, customTabSelectionsBySessionType);
  }

  dropSelectedTicketsOfSessionTypes(sessionTypeIds: ReadonlySet<number>): number {
    if (sessionTypeIds.size === 0 || this.#purchase.isModifyOrderMode()) {
      return 0;
    }

    const rows = untracked(this.#selector.catalog);
    const dropCandidates = rows.filter(
      (row: DerivedTicketSelectorRow) =>
        !row.isCustomTile &&
        !row.hasSeating &&
        row.sessionTypeId !== null &&
        sessionTypeIds.has(row.sessionTypeId) &&
        (this.#state.selectedTicketsBySessionId.get(String(row.sessionId)) ?? 0) > 0,
    );
    const zeroedSessionIds = [...new Set(dropCandidates.map((row: DerivedTicketSelectorRow) => row.sessionId))];

    if (zeroedSessionIds.length === 0) {
      return 0;
    }

    this.selectQuantitiesFromSelector(rows, new Map(zeroedSessionIds.map((sessionId: number): [number, number] => [sessionId, 0])), true);

    return zeroedSessionIds.filter((sessionId: number) => !this.#state.selectedTicketsBySessionId.has(String(sessionId))).length;
  }

  /** Names of the ongoing multi-day types with a selection, used by date availability. */
  getOngoingMultiDaySelectedTicketTypeNames(): string[] {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const group of this.#state.ongoingMultiDayTicketGroups) {
      for (const ticketType of group.ticketTypes) {
        if (ticketType.sessionId === undefined) {
          continue;
        }
        const bySessionId = this.#state.selectedTicketsBySessionId.get(String(ticketType.sessionId)) ?? 0;
        const bySessionType = this.#state.selectedTicketsBySessionType.get(ticketType.name) ?? 0;
        if ((bySessionId > 0 || bySessionType > 0) && !seen.has(ticketType.name)) {
          seen.add(ticketType.name);
          names.push(ticketType.name);
        }
      }
    }
    return names;
  }

  /** Rows for the add-ons tab. */
  getTicketTypesForAddonsTab(): TicketType[] {
    return this.#state.ticketTypes.filter(
      ticketType => ticketType.isAddon || (ticketType.sessionId !== undefined && !this.#seating.sessionHasSeating(ticketType.sessionId)),
    );
  }

  isSessionDisabledConsideringOverride(sessionAvailability?: SessionAvailability): boolean {
    return sessionAvailability?.isDisabled(this.#state.canOverrideCapacities) ?? true;
  }

  /**
   * The OSS counter path (base `selectTicketCounter` is not used here).
   *
   * Custom-tile availability refresh, free-seating seat back-fill, zero stripping, then tracking,
   * custom-tab preservation across the row rebuild, cart/capacity refresh and the cart-total
   * republish.
   */
  newSelectTicketCounter(
    ticketTypeCounter: TicketTypeCounterSelection,
    modifiedSessionIsShopProduct = false,
    skipPosCartTracking = false,
  ): void {
    if (this.#purchase.isReservationSettlementMode()) {
      return;
    }
    this.#purchase.exitModifyOrderPaymentIfActive();
    ticketTypeCounter.bySessionId.forEach((sessionTicketsSelected, sessionId) => {
      const numericSessionId = parseInt(sessionId);
      if (this.#isSessionInCustomTabs(numericSessionId)) {
        this.updateCustomTilesAvailability(numericSessionId, sessionTicketsSelected);
      }
    });

    if (this.#state.manageAsFreeSeatingMap && this.#state.selectedTicketsSeatsBySessionId.size > 0) {
      this.#state.selectedTicketsSeatsBySessionId.forEach((seatInfos, sessionId) => {
        const seatsCount = seatInfos.length;
        const existingSessionCounter = ticketTypeCounter.bySessionId.get(sessionId) ?? 0;
        if (seatsCount > 0 && existingSessionCounter <= 0) {
          ticketTypeCounter.bySessionId.set(sessionId, seatsCount);
          const ticketType = this.#getTicketTypeBySessionId(sessionId);
          if (ticketType) {
            const existingCount = ticketTypeCounter.bySessionType.get(ticketType) || 0;
            ticketTypeCounter.bySessionType.set(ticketType, existingCount + seatsCount);
          }
        }
      });
    }

    const ticketTypeCounterBySessionIdWithoutZeros = new Map<string, number>();
    ticketTypeCounter.bySessionId.forEach((counter, sessionId) => {
      if (counter > 0) {
        ticketTypeCounterBySessionIdWithoutZeros.set(sessionId, counter);
      }
    });
    const ticketTypeCounterBySessionTypeWithoutZeros = new Map<string, number>();
    ticketTypeCounter.bySessionType.forEach((counter, sessionId) => {
      if (counter > 0) {
        ticketTypeCounterBySessionTypeWithoutZeros.set(sessionId, counter);
      }
    });
    ticketTypeCounter.bySessionId = ticketTypeCounterBySessionIdWithoutZeros;
    ticketTypeCounter.bySessionType = ticketTypeCounterBySessionTypeWithoutZeros;

    if (!skipPosCartTracking) {
      for (const [sessionIdStr, newCount] of ticketTypeCounter.bySessionId.entries()) {
        const previousCount = this.#state.selectedTicketsBySessionId.get(sessionIdStr) ?? 0;
        if (newCount !== previousCount) {
          this.trackPosCartItemQuantityChange({ newCount, previousCount, sessionId: sessionIdStr, source: 'from_tile' });
        }
      }

      for (const [sessionIdStr, previousCount] of this.#state.selectedTicketsBySessionId.entries()) {
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

    this.#state.selectedTicketsBySessionType = ticketTypeCounter.bySessionType;
    this.#state.selectedTicketsBySessionId = ticketTypeCounter.bySessionId;

    this.#cart.updateNonConfirmedCart();
    this.#forgetContactDraftWhenSelectionIsEmpty();
    this.updateCapacityLimit();
    // Legacy reconciled the date-selector selection during the change detection this call triggers.
    this.#availability.reconcileSelectionWithCounters();

    // Rendered once by the change detection that ends this task, not by an extra synchronous pass.
    this.#viewUpdate.markForCheck();

    this.#cart.checkCartSessionsIsAboutToExpire();
    if (this.#state.coupon) {
      this.#state.updateCartTotalTrigger$.next();
    } else {
      this.#cart.updateCartTotalImmediate();
    }
  }

  /** Multi-day ongoing groups shown above the regular rows. */
  rebuildOngoingMultiDayTicketGroups(): void {
    this.#baseRebuildOngoingMultiDayTicketGroups();
    this.#applyOverrideCapacityToOngoingTicketGroups();
  }

  /** Recomputes the two counter maps from the non-confirmed cart. */
  recalculateSelectedTicketsFromCart(): void {
    this.#recalculateSelectedTicketsBySessionId();
    this.#recalculateSelectedTicketsBySessionType();
  }

  /**
   * Gives every shop-product line of a seeded modification cart the row and counters a tile, search or
   * scanner add would have left, so the cart steppers and the next add start from the order's quantity.
   * The row may grow by the catalog maximum on top of what the order holds, and that ceiling is also
   * written on the product's availability, so a custom-tab rebuild of the rows keeps it. The order
   * carries no pack step, so it comes from the product's custom-tab availability when one is loaded.
   * Idempotent: a line registers once per seed, and a product the catalog no longer holds keeps its
   * line without a row. Called when the cart is seeded and again when the catalog lands.
   */
  registerModifyOrderProductRowsFromCatalog(): void {
    if (!this.#state.isModifyOrderCartSeeded) {
      return;
    }
    const seededLines = this.#state.modifyOrderSeededProductLines;
    const productLines = this.#state.nonConfirmedCart?.sessionItemsByDatetime?.get(PRODUCTS_GROUP_KEY) ?? [];
    const bySessionId = new Map(this.#state.selectedTicketsBySessionId);
    const bySessionType = new Map(this.#state.selectedTicketsBySessionType);
    let hasRegisteredRows = false;
    for (const line of productLines) {
      if (seededLines.has(line.sessionId)) {
        continue;
      }
      const productSession = this.#productCatalog.getSessionDataBySessionId(line.sessionId);
      if (!productSession) {
        continue;
      }
      const maximum = line.units + (productSession.tickets_allowed_per_booking.maximum || 10);
      seededLines.set(line.sessionId, { line: line.clone(), maximum });
      this.#addProductSessionToProductTypesIfNotPresent(productSession);
      this.#addProductSessionToProductSessionAvailabilitiesIfNotPresent(productSession, line.sessionType?.ticketSelectorStepQuantity);
      const availability = this.#state.productSessions.find(session => session.id === line.sessionId);
      if (availability) {
        this.#applySeededProductLimits(availability, maximum);
      }
      bySessionId.set(line.sessionId.toString(), line.units);
      bySessionType.set(line.sessionType?.label ?? line.sessionName ?? productSession.session_type.label, line.units);
      hasRegisteredRows = true;
    }
    if (!hasRegisteredRows) {
      return;
    }
    this.#state.selectedTicketsBySessionId = bySessionId;
    this.#state.selectedTicketsBySessionType = bySessionType;
    this.#viewUpdate.markForCheck();
  }

  reseedSelectedTicketsBySessionId(): void {
    const state = this.#state;
    if (state.allowMultiTimeSlotSelection || state.selectedSession?.selectedDatetime == null) {
      return;
    }

    const regularRows = state.manageAsFreeSeatingMap ? this.getTicketTypesForAddonsTab() : state.ticketTypes;
    const ongoingRows = state.ongoingMultiDayTicketGroups.flatMap(group => group.ticketTypes);
    const previousRegularRowKeys = this.#lastRegularRowKeys;
    const previousOngoingRowKeys = new Set(this.#lastOngoingRowKeys);
    this.#lastRegularRowKeys = new Set(regularRows.map(row => row.sessionId?.toString()));
    for (const row of ongoingRows) {
      const key = row.sessionId?.toString();
      if (key !== undefined) {
        this.#lastOngoingRowKeys.add(key);
      }
    }
    if (state.selectedTicketsBySessionType.size === 0) {
      return;
    }

    const previous = state.selectedTicketsBySessionId;
    const carriedByName = new Map(state.selectedTicketsBySessionType);
    for (const row of ongoingRows) {
      const key = row.sessionId?.toString();
      const units = key === undefined ? 0 : (previous.get(key) ?? 0);
      const namedUnits = carriedByName.get(row.name);
      if (units > 0 && namedUnits !== undefined && previousRegularRowKeys.has(key)) {
        if (namedUnits > units) {
          carriedByName.set(row.name, namedUnits - units);
        } else {
          carriedByName.delete(row.name);
        }
      }
    }
    if (!areCountMapsEqual(state.selectedTicketsBySessionType, carriedByName)) {
      state.selectedTicketsBySessionType = new Map(carriedByName);
    }

    const rows = [...regularRows, ...ongoingRows];
    const productKeys = new Set(state.productTypes.map(productType => productType.sessionId?.toString()));
    const seeded = new Map<string, number>();

    for (const row of rows) {
      const key = row.sessionId?.toString();
      if (key === undefined || seeded.has(key)) {
        continue;
      }
      const byId = previous.get(key) ?? 0;
      const byName = carriedByName.get(row.name);
      if (byId > 0) {
        seeded.set(key, byId);
      } else if (byName !== undefined && !row.isOngoingMultiDay && canTicketTypeCarryUnits(row, byName)) {
        carriedByName.delete(row.name);
        seeded.set(key, byName);
      } else {
        seeded.set(key, 0);
      }
    }

    const next = new Map<string, number>();
    for (const [key, units] of previous) {
      const seededUnits = seeded.get(key);
      if (seededUnits !== undefined) {
        if (seededUnits > 0) {
          next.set(key, seededUnits);
        }
      } else if ((productKeys.has(key) || previousOngoingRowKeys.has(key)) && units > 0) {
        next.set(key, units);
      }
    }
    for (const [key, units] of seeded) {
      if (!next.has(key) && units > 0) {
        next.set(key, units);
      }
    }

    for (const key of [...this.#lastOngoingRowKeys]) {
      if ((next.get(key) ?? 0) === 0 && (previous.get(key) ?? 0) === 0) {
        this.#lastOngoingRowKeys.delete(key);
      }
    }

    if (areCountMapsEqual(previous, next)) {
      return;
    }

    state.selectedTicketsBySessionId = next;
    this.#cart.updateNonConfirmedCart();
    this.#cart.updateCartTotalImmediate();
  }

  /** Called when the displayed session type changes and rows were rebuilt. */
  restoreMissingTypesToSelection(): void {
    if (this.#state.selectedTicketsBySessionType.size === 0) {
      return;
    }

    const existingSelectionsBySessionType = new Map(this.#state.selectedTicketsBySessionType);
    const existingSelectionsBySessionId = new Map(this.#state.selectedTicketsBySessionId);

    const restoredSelectionsBySessionType = new Map(
      [...this.#state.productTypes, ...this.#state.ticketTypes].map(ticketType => [
        ticketType.name,
        existingSelectionsBySessionType.get(ticketType.name) || 0,
      ]),
    );

    const restoredSelectionsBySessionId = new Map(
      [...this.#state.productTypes, ...this.#state.ticketTypes].map(ticketType => [
        ticketType.sessionId?.toString() ?? '',
        existingSelectionsBySessionId.get(ticketType.sessionId?.toString() ?? '') ?? 0,
      ]),
    );

    this.#state.selectedTicketsBySessionType = restoredSelectionsBySessionType;
    this.#state.selectedTicketsBySessionId = restoredSelectionsBySessionId;
  }

  /**
   * Restores counters for a timeslot activated from a cart line. With multi-timeslot selection
   * every cart line counts, the `products` bucket included, since a shop product belongs to no
   * timeslot; otherwise only the ticket lines of `datetime` do.
   */
  restoreTicketCountsFromCart(datetime: string | null): void {
    const byDatetime = this.#state.nonConfirmedCart?.sessionItemsByDatetime;
    if (!byDatetime?.size) {
      return;
    }

    const cartSessions: CartSession[] = [];
    if (this.#state.allowMultiTimeSlotSelection) {
      for (const sessions of byDatetime.values()) {
        if (sessions?.length) {
          cartSessions.push(...sessions);
        }
      }
    } else if (datetime !== null) {
      const forDatetime = byDatetime.get(datetime);
      if (forDatetime?.length) {
        cartSessions.push(...forDatetime);
      }
    }

    if (cartSessions.length === 0) {
      return;
    }

    const ongoingSessionIds = this.#ongoingSessionIdsForSelectedCalendarDate();
    const { bySessionId, bySessionType } = cartSessions.reduce<{
      bySessionId: Map<string, number>;
      bySessionType: Map<string, number>;
    }>(
      (acc, session) => {
        const isShopProduct = session.sessionType?.isShopProduct === true;
        if (isShopProduct && !this.#state.allowMultiTimeSlotSelection) {
          return acc;
        }
        const sessionIdStr = session.sessionId.toString();
        const prevUnits = acc.bySessionId.get(sessionIdStr) ?? 0;
        acc.bySessionId.set(sessionIdStr, prevUnits + session.units);
        if (!isShopProduct && ongoingSessionIds.has(session.sessionId)) {
          return acc;
        }
        const typeKey = session.sessionType?.label ?? session.sessionName ?? '';
        const currentUnits = acc.bySessionType.get(typeKey) ?? 0;
        acc.bySessionType.set(typeKey, currentUnits + session.units);
        return acc;
      },
      { bySessionId: new Map<string, number>(), bySessionType: new Map<string, number>() },
    );

    this.#state.selectedTicketsBySessionId = bySessionId;
    this.#state.selectedTicketsBySessionType = bySessionType;
  }

  selectPartyAtTimeslot(datetime: string, nextQuantitiesBySessionId: SessionQuantities): boolean {
    const availabilityStore = this.#injector.get(PosAvailabilityStore);
    this.#isWritingPartySelection = true;
    try {
      if (!isSameStartTime(untracked(availabilityStore.selectedDatetime), datetime)) {
        this.#availability.selectTimeslotFromSelector(datetime, { refreshCart: false });
      }
      if (!isSameStartTime(untracked(availabilityStore.selectedDatetime), datetime)) {
        return false;
      }

      const rows = untracked(this.#selector.catalog).filter((row: DerivedTicketSelectorRow) => !row.isCustomTile);
      const nextBySessionId = new Map<number, number>(
        Object.entries(nextQuantitiesBySessionId).map(([sessionId, quantity]: [string, number]): [number, number] => [
          Number(sessionId),
          quantity,
        ]),
      );
      const rowSessionIds = new Set(rows.map((row: DerivedTicketSelectorRow) => row.sessionId));
      if ([...nextBySessionId.keys()].some((sessionId: number) => !rowSessionIds.has(sessionId))) {
        return false;
      }

      this.selectQuantitiesFromSelector(rows, nextBySessionId);
      return true;
    } finally {
      this.#isWritingPartySelection = false;
    }
  }

  selectQuantitiesFromSelector(
    rows: readonly TicketSelectorCatalogItem[],
    nextBySessionId: ReadonlyMap<number, number>,
    skipPosCartTracking = false,
  ): void {
    const bySessionId = new Map<string, number>();
    for (const row of rows) {
      const key = String(row.sessionId);
      bySessionId.set(key, nextBySessionId.get(row.sessionId) ?? this.#state.selectedTicketsBySessionId.get(key) ?? 0);
    }

    this.#state.selectedTicketsBySessionId.forEach((units, key) => {
      if (!bySessionId.has(key) && (this.#state.allowMultiTimeSlotSelection || this.#lastOngoingRowKeys.has(key))) {
        bySessionId.set(key, units);
      }
    });

    this.newSelectTicketCounter({ bySessionId, bySessionType: this.#deriveBySessionType(rows, bySessionId) }, false, skipPosCartTracking);
  }

  selectQuantityFromSelector(rows: readonly TicketSelectorCatalogItem[], sessionId: number, quantity: number): void {
    this.selectQuantitiesFromSelector(rows, new Map([[sessionId, quantity]]));
  }

  setTicketCounterHasErrors(hasErrors: boolean): void {
    this.#state.ticketCounterHasErrors = hasErrors;
    this.#cart.updateNonConfirmedCart();
  }

  // ──────────────────────────────────────── eligibility / capacity ────────────────────────────────

  /** Drives both `isInOverrideZone` and the `overrideCapacity` cart flag. */
  shouldSendOverrideCapacity(): boolean {
    if (this.#purchase.isReservationSettlementMode()) {
      return false;
    }
    const selectedDatetime = this.#state.selectedSession?.selectedDatetime;
    const baseCapacity = selectedDatetime?.capacity;
    const overrideCapacity = selectedDatetime?.overrideCapacity;
    const currentCart = this.#state.nonConfirmedCart ?? this.#state.cart;
    const numberOfTicketsCountingTowardCapacity = currentCart?.getNumberOfTicketCounts?.(false) ?? 0;

    return (
      this.#state.canOverrideCapacities &&
      this.#state.includeTimeSlotCapacity &&
      baseCapacity != null &&
      overrideCapacity != null &&
      overrideCapacity > 0 &&
      numberOfTicketsCountingTowardCapacity > baseCapacity
    );
  }

  /** Tracking helper — kept public because the seating batch also calls it. */
  trackPosCartItemQuantityChange(opts: {
    newCount: number;
    previousCount: number;
    sessionId: number | string;
    source: PosCartSource;
  }): void {
    this.#trackCartItemQuantityChange.track({
      newCount: opts.newCount,
      planId: this.#state.selectedPlan?.id ?? 0,
      previousCount: opts.previousCount,
      productTypes: this.#state.productTypes,
      sessionId: opts.sessionId,
      source: opts.source,
      ticketTypes: this.#state.ticketTypes,
    });
  }

  /** Max-per-booking + override-capacity handling. */
  updateCapacityLimit(): void {
    const selectedDatetime = this.#state.selectedSession?.selectedDatetime;
    const maxCapacity = selectedDatetime?.capacity;
    if (!this.#state.includeTimeSlotCapacity || maxCapacity == null || this.#purchase.isReservationSettlementMode()) {
      this.#state.forceDisableIncreaseCounter = false;
      this.#state.disableAddSessionsToCartByCapacity = false;
      this.#state.isInOverrideZone = false;
      this.#viewUpdate.markForCheck();
      return;
    }

    let effectiveCapacity = maxCapacity;
    if (this.#state.canOverrideCapacities && selectedDatetime?.overrideCapacity != null) {
      effectiveCapacity = maxCapacity + selectedDatetime.overrideCapacity;
    }

    const currentCart = this.#state.nonConfirmedCart ?? this.#state.cart;
    const numberOfTicketsCountingTowardCapacity = currentCart?.getNumberOfTicketCounts?.(false) ?? 0;
    const hasNormalTickets = numberOfTicketsCountingTowardCapacity > 0;
    this.#state.forceDisableIncreaseCounter = hasNormalTickets && numberOfTicketsCountingTowardCapacity >= effectiveCapacity;
    this.#state.disableAddSessionsToCartByCapacity = hasNormalTickets && numberOfTicketsCountingTowardCapacity > effectiveCapacity;
    this.#state.isInOverrideZone = this.shouldSendOverrideCapacity();
    this.#viewUpdate.markForCheck();
  }

  /** Single-session counter change coming from a tile or a cart stepper. */
  updateSessionIdCounter(event: UpdateTicketTypeCounter): void {
    if (this.#purchase.isReservationSettlementMode()) {
      return;
    }
    const isChange = event.newCounter !== (this.#state.selectedTicketsBySessionId.get(event.sessionId.toString()) ?? 0);
    const isRemoval = event.newCounter === 0;
    if (this.#shouldRejectUnavailableFlexibleBundleChange(event.sessionId, isChange && !isRemoval)) {
      return;
    }
    this.#purchase.exitModifyOrderPaymentIfActive();
    this.#state.updateTicketTypeCounter.next(event);
    const sessionIdAsString = event.sessionId.toString();
    const previousCount = this.#state.selectedTicketsBySessionId.get(event.sessionId.toString()) ?? 0;
    const source: PosCartSource = this.#state.tileAddSessionId === event.sessionId ? 'from_tile' : 'from_cart';

    if (event.newCounter === 0) {
      this.trackPosCartItemQuantityChange({ newCount: 0, previousCount, sessionId: event.sessionId, source });
      this.#handleCartSessionUpdate(event);
      this.#availability.reselectCartTimeslotAfterLineRemoval();
      if (!this.#state.selectedTicketsBySessionId.has(sessionIdAsString)) {
        this.#seating.releaseCartLineSeatingSelection(event.sessionId);
      }
      this.#checkAndCloseCartIfEmpty();
      this.updateCapacityLimit();
      this.#secondScreen.updateCart();
      return;
    }

    const productType = this.#state.productTypes.find(product => product.sessionId === event.sessionId);
    if (productType) {
      const ticketTypeCounter = {
        bySessionId: new Map(this.#state.selectedTicketsBySessionId),
        bySessionType: new Map(this.#state.selectedTicketsBySessionType),
      };
      ticketTypeCounter.bySessionId.set(event.sessionId.toString(), event.newCounter);
      ticketTypeCounter.bySessionType.set(productType.name, event.newCounter);
      this.newSelectTicketCounter(ticketTypeCounter, true, true);
      this.trackPosCartItemQuantityChange({ newCount: event.newCounter, previousCount, sessionId: event.sessionId, source });
    } else {
      this.trackPosCartItemQuantityChange({ newCount: event.newCounter, previousCount, sessionId: event.sessionId, source });
      this.#handleCartSessionUpdate(event);
      this.updateCapacityLimit();
      this.#secondScreen.updateCart();
    }
    this.#checkAndCloseCartIfEmpty();
  }

  /**
   * Rebuilds `ticketTypes` / `productTypes` from the current session selection.
   *
   * Custom-tab rows survive the rebuild, and a custom tab on screen short-circuits to a
   * product-types-only refresh.
   */
  updateTicketTypeFields(): void {
    if (this.#state.activeTabType === OssTab.CUSTOM_TABS) {
      this.#ossUpdateSessionAvailabilitySummary();
      this.#state.productTypes = this.#state.sessionAvailabilitySummary?.getProductTypes() ?? [];
      this.updateAvailableTabs();
      return;
    }
    const existingCustomTabTicketTypes = this.#state.ticketTypes.filter(ticketType => {
      return this.#state.customTabSignals().some(tabSignal => {
        const tabData = tabSignal();
        if (!tabData?.tilesData) {
          return false;
        }
        return tabData.tilesData.customTiles.some(tile => tile.customTile.sessions.some(session => session.id === ticketType.sessionId));
      });
    });
    this.#state.ticketTypes = [];
    this.#ossUpdateTicketTypeFields();
    existingCustomTabTicketTypes.forEach(ticketType => {
      if (!this.#state.ticketTypes.some(existing => existing.sessionId === ticketType.sessionId)) {
        this.#state.ticketTypes.push(ticketType);
      }
    });
    if (this.#isTicketSelectorRearchitectEnabled && !this.#isWritingPartySelection) {
      this.reseedSelectedTicketsBySessionId();
    }
    this.updateAvailableTabs();
  }

  /** Drops every custom tab: the store collection is the only owner of what tabs exist. */
  clearCustomTabs(): void {
    this.#clearCustomTileUnavailability();
    this.#selector.clearCustomTabs();
  }

  /** Tiles payload to hierarchy navigation levels. */
  convertCustomTabsToHierarchy(customTabData: OssCustomTilesData | null): HierarchyNavigationLevel | null {
    if (!customTabData?.customTiles) {
      return null;
    }
    let allSessions = customTabData.customTiles.flatMap(tile => tile.customTile.sessions);
    const fakeSessions: OssSessionAvailability[] = [];
    const directSessions = customTabData.customTiles
      .filter(tile => tile.customTile.targetElementType === OssTargetElementType.SESSION_TYPE)
      .reduce((sessionTilePairs: { customTile: OssCustomTile; session: OssSessionAvailability }[], tile, index) => {
        if (tile.customTile.sessions.length === 0) {
          const fakeId = -index - 1;
          const fakeSession = this.#createFakeUnavailableSession(fakeId, tile.customTile.name);
          fakeSessions.push(fakeSession);
          return [
            ...sessionTilePairs,
            {
              customTile: tile.customTile,
              session: fakeSession,
            },
          ];
        }
        return [
          ...sessionTilePairs,
          ...tile.customTile.sessions.map(session => ({
            customTile: tile.customTile,
            session,
          })),
        ];
      }, []);
    const hierarchyTilesWithConfig = customTabData.customTiles
      .filter(tile => this.#isHierarchyElementType(tile.customTile.targetElementType))
      .flatMap(tile => this.#flattenHierarchyTileToSessions(tile.customTile));
    const allSessionsWithConfig = [...directSessions, ...hierarchyTilesWithConfig];
    const hierarchySessionsTypesWithConfig = allSessionsWithConfig.filter(sessionWithConfig =>
      this.#isHierarchyElementType(sessionWithConfig.customTile.targetElementType),
    );
    const sessionsTypesWithConfig = allSessionsWithConfig.filter(
      sessionWithConfig => sessionWithConfig.customTile.targetElementType === OssTargetElementType.SESSION_TYPE,
    );
    const leafsFromFlattening: HierarchyNavigationLeafNode[] = [];
    const childrenParentNodes: HierarchyNavigationParentNode[] = hierarchySessionsTypesWithConfig.flatMap(sessionWithConfig => {
      const extraInfo = sessionWithConfig.customTile.targetElementExtraInfo as OssCustomTileExtraInfoHierarchyElement;
      const parent = this.#convertToHierarchyParent(
        extraInfo,
        sessionWithConfig.customTile.position,
        sessionWithConfig.customTile.color,
        sessionWithConfig.customTile.name,
      );

      if (sessionWithConfig.customTile.targetElementType === OssTargetElementType.PARENT_HIERARCHY_ELEMENT) {
        const { parents, promotedLeafs } = this.#applyFirstLevelFlattening(parent);
        leafsFromFlattening.push(...promotedLeafs);
        return parents;
      }
      return [parent];
    });
    const leafs: HierarchyNavigationLeafNode[] = [
      ...sessionsTypesWithConfig.map(sessionWithConfig => ({
        customColor: sessionWithConfig.customTile.color,
        customName: sessionWithConfig.customTile.name,
        order: sessionWithConfig.customTile.position,
        sessionId: sessionWithConfig.session.id.toString(),
      })),
      ...leafsFromFlattening,
    ];
    allSessions = [...allSessions, ...fakeSessions];
    return {
      leafNodes: leafs,
      name: 'Custom Tabs',
      parentNodes: childrenParentNodes,
      sessions: allSessions,
    };
  }

  getCustomTabData(tabIndex: number): OssCustomTabData | null {
    const tabSignals = this.#state.customTabSignals();
    return tabSignals[tabIndex]?.() || null;
  }

  /**
   * True when the given tab's content depends on the selected date.
   *
   * The composed callers only know the index the component is showing, so the index is resolved
   * against the store's tab descriptors here.
   */
  isTabDateDependant(tabIndex: number): boolean {
    const kind = untracked(this.#selector.availableTabs)[tabIndex]?.kind ?? 'tickets';
    if (kind === 'seating' && this.#state.manageAsFreeSeatingMap) {
      return true;
    }
    return kind === 'tickets' || kind === 'party-members';
  }

  /** Loads every configured custom tab. */
  loadAllCustomTabsData(): void {
    this.#clearCustomTileUnavailability();
    untracked(this.#selector.customTabEntities).forEach((customTab: CustomTabState) => {
      this.#selector.fetchCustomTab({
        query: this.#customTabQuery(customTab.setupId, customTab.datetimeSelected || this.#nowDatetime()),
        setupId: customTab.setupId,
      });
    });
  }

  /** Loads a single custom tab, honouring its own datetime. */
  loadCustomTabDataByIndex(tabIndex: number): void {
    const customTab = untracked(this.#selector.customTabEntities)[tabIndex];
    if (!customTab) {
      return;
    }
    this.#clearCustomTileUnavailabilityForTab(tabIndex);
    this.#selector.fetchCustomTab({
      query: this.#customTabQuery(customTab.setupId, customTab.datetimeSelected || this.#nowDatetime()),
      setupId: customTab.setupId,
    });
  }

  /** Quick tiles for a datetime. */
  loadQuickTilesByDateTime(datetime: string): void {
    this.#selector.setCustomTabDatetime(null, datetime);
    this.loadAllCustomTabsData();
  }

  /** Called once by `PointOfSaleComponent`; see {@link PosTabUiHandlers}. */
  registerTabUiHandlers(handlers: PosTabUiHandlers): void {
    this.#tabUiHandlers = handlers;
  }

  /**
   * Recomputes which tabs are available for the current setup + catalog.
   *
   * The `#ensureActiveTabIsValid` half is delegated to the component through
   * {@link registerTabUiHandlers}, because `activeTab` is the visual selection and stays there.
   */
  updateAvailableTabs(): void {
    if (this.#isPartyMembersMode()) {
      this.#updatePartyMembersTabs();
      return;
    }
    const baseTabs: PosTabDescriptor[] = this.#state.manageAsFreeSeatingMap
      ? [{ kind: 'seating', setupId: null }]
      : [{ kind: 'tickets', setupId: null }];
    const onsiteSetup = this.#state.activeOnsiteSetup();
    const currentTabs = untracked(this.#selector.availableTabs);
    if (!onsiteSetup) {
      this.#selector.setAvailableTabs(baseTabs);
      return;
    }
    if (this.#state.manageAsFreeSeatingMap && this.#hasAddonsOrNonSeatingTickets()) {
      baseTabs.push({ kind: 'tickets', setupId: null });
    }
    const customTabs = onsiteSetup.custom_tabs || [];
    const customTabsTabs: PosTabDescriptor[] = customTabs.map(customTab => ({ kind: 'custom', setupId: customTab.id }));
    const newTabs = customTabs.length > 0 ? [...baseTabs, ...customTabsTabs] : baseTabs;
    if (!areTabDescriptorsEqual(currentTabs, newTabs)) {
      this.#selector.setAvailableTabs(newTabs);
      this.#tabUiHandlers?.ensureActiveTabIsValid(newTabs.map((tab: PosTabDescriptor) => toOssTab(tab.kind)));
    }
  }

  /** Marks tiles unavailable / sold out as the selection changes. */
  updateCustomTilesAvailability(sessionId: number, sessionTicketsSelected: number | null = null): void {
    if (!this.#state.nonConfirmedCart) {
      return;
    }
    let totalCartTicketsForSession = 0;
    this.#state.nonConfirmedCart.sessionItemsByDatetime?.forEach(sessions => {
      const cartSession = sessions.find(session => session.sessionId === sessionId);
      if (cartSession) {
        totalCartTicketsForSession = cartSession.units;
      }
    });
    const currentTicketCount = sessionTicketsSelected !== null ? sessionTicketsSelected : totalCartTicketsForSession;
    const session = this.#findCustomTileSession(sessionId);
    if (!session) {
      return;
    }
    const isUnavailable = currentTicketCount >= session.maximumTicketsAllowedPerBooking;
    const current = untracked(this.#customTileUnavailability);
    if ((current.get(sessionId) ?? false) === isUnavailable) {
      return;
    }
    const next = new Map(current);
    next.set(sessionId, isUnavailable);
    this.#customTileUnavailability.set(next);
  }

  #addProductSessionToProductSessionAvailabilitiesIfNotPresent(productSession: ProductSession, stepQuantity?: number): void {
    if (!this.#state.productSessions.some(session => session.id === productSession.id)) {
      const sessionAvailability = this.#convertProductSessionToSessionAvailability(productSession, stepQuantity);
      this.#state.productSessions.push(sessionAvailability);
    }
  }

  // ───────────────────────────────── product / custom-tab session injection ────────────────────────

  /**
   * Stores a copy of the given availability as the seeded product's availability, carrying the raised ceiling,
   * its pack step and a minimum of at least one pack, and gives its row the same limits. The copy leaves the
   * tab tile it may come from untouched.
   */
  #applySeededProductLimits(availability: SessionAvailability, maximum: number): void {
    const stepQuantity = safeStepQuantity(availability.sessionType?.ticketSelectorStepQuantity);
    const minimum = Math.max(availability.minimumTicketsAllowedPerBooking || 1, stepQuantity);
    const seededAvailability: SessionAvailability = Object.assign(Object.create(Object.getPrototypeOf(availability)), availability, {
      maximumTicketsAllowedPerBooking: maximum,
      minimumTicketsAllowedPerBooking: minimum,
    });
    if (availability.sessionType) {
      seededAvailability.sessionType = Object.assign(
        Object.create(Object.getPrototypeOf(availability.sessionType)),
        availability.sessionType,
        {
          ticketSelectorStepQuantity: stepQuantity,
        },
      );
    }
    const index = this.#state.productSessions.findIndex(session => session.id === availability.id);
    if (index === -1) {
      this.#state.productSessions.push(seededAvailability);
    } else {
      this.#state.productSessions[index] = seededAvailability;
    }
    const row = this.#state.productTypes.find(productType => productType.sessionId === availability.id);
    if (row) {
      row.maximum = maximum;
      row.minimum = minimum;
      row.stepQuantity = stepQuantity;
    }
  }

  #addProductSessionToProductTypesIfNotPresent(productSession: ProductSession): void {
    if (this.#state.productTypes.some(productType => productType.sessionId === productSession.id)) {
      return;
    }

    this.#state.productTypes.push(
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

  #applyOverrideCapacityToOngoingTicketGroups(): void {
    if (!this.#state.canOverrideCapacities) {
      return;
    }
    const ongoingSessionsById = new Map<number, SessionAvailability>();
    for (const bucket of this.#availability.getOngoingMultiDayBuckets()) {
      for (const slot of bucket.sessionAvailabilityByDatetimeList) {
        for (const session of slot.sessionAvailabilityList) {
          ongoingSessionsById.set(session.id, session);
        }
      }
    }
    for (const group of this.#state.ongoingMultiDayTicketGroups) {
      for (const ticketType of group.ticketTypes) {
        const session = ticketType.sessionId === undefined ? undefined : ongoingSessionsById.get(ticketType.sessionId);
        if (!session) {
          continue;
        }
        ticketType.isPurchasable = !this.isSessionDisabledConsideringOverride(session);
        ticketType.overrideAvailableTickets = session.overrideAvailableTickets;
        ticketType.maximum = session.getMaximumSelectableTickets(this.#state.canOverrideCapacities);
      }
    }
  }

  get #availability(): PosAvailabilityService {
    return (this.#availabilityStrategy ??= this.#injector.get(PosAvailabilityService));
  }

  /** Minus the two group-rule members that were not carried over; their condition stays inline. */
  #baseAddSessionsToCartIsDisabled(): boolean {
    const emptyCart = this.#state.nonConfirmedCart === null || this.#state.nonConfirmedCart?.getNumberOfTicketCounts() === 0;
    return (
      emptyCart ||
      this.#state.isLoadingCart ||
      !this.#state.selectedSession ||
      (!this.#purchase.isReservationSettlementMode() && (this.#state.nonConfirmedCart?.getTimeslotsViolatingGroupRules().length ?? 0) > 0)
    );
  }

  #canJoinFlexibleBundle(sessionId: number, ticketType: TicketType | undefined): boolean {
    const session = (this.#state.selectedSession?.sessionAvailabilityByDatetimeList ?? [])
      .flatMap(datetime => datetime.sessionAvailabilityList)
      .find((availability: SessionAvailability) => availability.id === sessionId);

    return canJoinFlexibleBundle({
      hasSeating: session?.seating != null,
      isAddOn: ticketType?.isAddon === true,
      isPack: session?.isPack === true,
      isShopProduct: ticketType?.isShopProduct === true,
    });
  }

  /**
   * Seating and packs never join a bundle, so the catalog overlay leaves their tiles enabled and the cart detail
   * prices them apart. Rejecting their increase here would strand an enabled tile that silently does nothing.
   */
  #shouldRejectUnavailableFlexibleBundleChange(sessionId: number, isChange: boolean): boolean {
    const ticketType = this.#state.ticketTypes.find((type: TicketType) => type.sessionId === sessionId);

    return isChange && this.#canJoinFlexibleBundle(sessionId, ticketType) && !this.#flexibleBundle.canIncreaseSessionType(ticketType?.id);
  }

  // ═══════════════════════════════════════════ internals ══════════════════════════════════════════

  #baseClearSelectedTicketsReferences(): void {
    this.#state.selectedTicketsBySessionId = new Map();
    this.#state.selectedTicketsBySessionType = new Map();
    this.#state.selectedTicketsSeatsBySessionId = new Map();
    if (!this.#state.isPreservingCart) {
      this.#state.seatingHoldTokensBySessionId = new Map();
    }
    this.#state.hasSeatsSelected = false;
  }

  #baseRebuildOngoingMultiDayTicketGroups(): void {
    const groups: OngoingMultiDayTicketGroup[] = [];
    this.#state.ongoingMultiDayTicketGroups = groups;
    const selectedDate = this.#state.selectedSession?.date;
    const selectedDatetime = this.#state.selectedSession?.selectedDatetime?.datetime;
    for (const bucket of this.#availability.getOngoingMultiDayBuckets()) {
      const startOn = this.#formatOngoingCalendarDayLabel(bucket.date);
      const finishOn = this.#ongoingBucketFinishesOnLabel(bucket);
      const seenSessionIds = new Set<number>();
      const types: TicketType[] = [];
      for (const slot of bucket.sessionAvailabilityByDatetimeList) {
        for (const session of slot.sessionAvailabilityList) {
          if (seenSessionIds.has(session.id)) {
            continue;
          }
          if (selectedDate && !OngoingSessionUtil.isSessionOngoingOnDate(session, selectedDate, this.#state.timezone, selectedDatetime)) {
            continue;
          }
          seenSessionIds.add(session.id);
          const ticketType = this.#ticketTypeFromSession(session, true);
          ticketType.ongoingMultiDayStartOnLabel = this.#formatOngoingSessionDateTimeLabel(session.startsAt);
          ticketType.ongoingMultiDayFinishOnLabel = OngoingSessionUtil.isOpenEndedSession(session)
            ? ''
            : this.#formatOngoingSessionDateTimeLabel(session.endsAt);
          types.push(ticketType);
        }
      }
      if (types.length === 0) {
        continue;
      }
      groups.push({
        finishOn,
        startOn,
        ticketTypes: types,
      });
    }
  }

  get #cart(): PosCartService {
    return (this.#cartStrategy ??= this.#injector.get(PosCartService));
  }

  get #purchase(): PosPurchaseService {
    return (this.#purchaseStrategy ??= this.#injector.get(PosPurchaseService));
  }

  /**
   * Closing the cart panel is component-local UI, so the decision travels on a fire-and-forget
   * stream (two-mechanism rule).
   */
  #checkAndCloseCartIfEmpty(): void {
    this.#forgetContactDraftWhenSelectionIsEmpty();
    this.#state.closeCartDetailWhenEmpty$.next();
  }

  /**
   * An emptied selection starts a new sale, so the next contact modal opens empty. Read on the whole non-confirmed
   * cart once it is rebuilt: in a multi-plan sale the counters hold only this plan's lines, while the other plans'
   * lines stay in the cart (`PosCartService.mergeCartSessionsFromOtherPlans`).
   */
  #forgetContactDraftWhenSelectionIsEmpty(): void {
    const selection = this.#state.nonConfirmedCart;
    if (selection === null || selection.getNumberOfTicketAndProductCounts() === 0) {
      this.#contactInformationDraft.clear();
    }
  }

  /** The overlay lives and dies with the tile payload it annotates; see the module `AGENTS.md`. */
  #clearCustomTileUnavailability(): void {
    if (untracked(this.#customTileUnavailability).size === 0) {
      return;
    }
    this.#customTileUnavailability.set(new Map());
  }

  #clearCustomTileUnavailabilityForTab(tabIndex: number): void {
    const current = untracked(this.#customTileUnavailability);
    const tilesData = untracked(this.customTabTilesData)[tabIndex];
    if (current.size === 0 || !tilesData) {
      return;
    }
    const next = new Map(current);
    tilesData.customTiles.forEach(wrapper => {
      wrapper.customTile.sessions.forEach(session => next.delete(session.id));
    });
    if (next.size !== current.size) {
      this.#customTileUnavailability.set(next);
    }
  }

  #combinedPreservedCustomTabsBySessionId(
    ticketTypeCounter: TicketTypeCounterSelection,
    preservedCustomTabsBySessionId: Map<string, number>,
    preservedCustomTabsBySessionType: Map<string, number>,
  ): void {
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

  #convertProductSessionToSessionAvailability(productSession: ProductSession, stepQuantity?: number): SessionAvailability {
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
      undefined, // isEntryPass
      stepQuantity,
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
      this.#state.selectedPlace?.id,
    );
  }

  #deriveBySessionType(rows: readonly TicketSelectorCatalogItem[], bySessionId: Map<string, number>): Map<string, number> {
    const bySessionType = new Map<string, number>();
    for (const row of rows) {
      const units = bySessionId.get(String(row.sessionId));
      // Ongoing rows never ride the name key: the reseed would hand their units to the timeslot row of the same name.
      if (units !== undefined && !row.isOngoing) {
        // Rows may share a name (a session type kept beside its re-priced successor): the name carries their sum,
        // so a zero on the later row never erases the count of the one the operator tapped.
        bySessionType.set(row.name, (bySessionType.get(row.name) ?? 0) + units);
      }
    }

    return bySessionType;
  }

  #extractCustomTabsSelections(): {
    customTabSelectionsBySessionId: Map<string, number>;
    customTabSelectionsBySessionType: Map<string, number>;
  } {
    const customTabSelectionsBySessionId = new Map<string, number>();
    const customTabSelectionsBySessionType = new Map<string, number>();

    this.#state.selectedTicketsBySessionId.forEach((units, sessionId) => {
      const sessionIdNum = parseInt(sessionId);
      const isCustomTabProduct = this.#state.productTypes.some(
        productType => productType.sessionId === sessionIdNum && productType.isShopProduct === true,
      );
      if (isCustomTabProduct && units > 0) {
        customTabSelectionsBySessionId.set(sessionId, units);
      }
    });

    this.#state.selectedTicketsBySessionType.forEach((units, sessionType) => {
      const isCustomTabProduct = this.#state.productTypes.some(
        productType => productType.name === sessionType && productType.isShopProduct === true,
      );
      if (isCustomTabProduct && units > 0) {
        customTabSelectionsBySessionType.set(sessionType, units);
      }
    });

    return { customTabSelectionsBySessionId, customTabSelectionsBySessionType };
  }

  #formatOngoingCalendarDayLabel(isoDateOnly: string): string {
    const day = moment.tz(`${isoDateOnly}T12:00:00`, this.#state.timezone);
    if (this.#state.locale) {
      day.locale(this.#state.locale);
    }
    return typeof day.format === 'function' ? day.format('LL') : isoDateOnly;
  }

  #formatOngoingSessionDateTimeLabel(iso: string): string {
    const dateTime = moment.tz(iso, this.#state.timezone);
    if (this.#state.locale) {
      dateTime.locale(this.#state.locale);
    }
    return typeof dateTime.format === 'function' ? dateTime.format('lll') : iso;
  }

  #getStepQuantityFromSession(session: SessionAvailability): number {
    const stepQuantity = session.sessionType?.ticketSelectorStepQuantity;
    if (stepQuantity === undefined || stepQuantity === null) {
      return 1;
    }
    const num = Number(stepQuantity);
    return Number.isInteger(num) && num > 0 ? num : 1;
  }

  #getTicketTypeBySessionId(sessionId: string): string | null {
    const numericSessionId = parseInt(sessionId, 10);
    return this.#state.selectedSession?.selectedDatetime?.ticketTypesBySessionId?.get(numericSessionId) ?? null;
  }

  /**
   * A cart stepper moved a line: patch the matching cart line (or fall back to the raw counter
   * map) and recompute the derived selection.
   */
  #handleCartSessionUpdate(event: UpdateTicketTypeCounter): void {
    const sessionIdStr = event.sessionId.toString();
    const applyFallbackSelectedTicketsBySessionIdUpdate = (): void => {
      const updatedBySessionId = new Map(this.#state.selectedTicketsBySessionId);
      if (event.newCounter > 0) {
        updatedBySessionId.set(sessionIdStr, event.newCounter);
      } else {
        updatedBySessionId.delete(sessionIdStr);
      }
      this.#state.selectedTicketsBySessionId = updatedBySessionId;
    };
    const hasLineContext = event.datetime !== undefined && event.mainPlanId !== undefined && event.venueId !== undefined;
    const matchesCartLine = (session: CartSession, datetime: string): boolean => {
      if (session.sessionId !== event.sessionId) {
        return false;
      }
      if (!hasLineContext) {
        return true;
      }
      return (
        datetime === event.datetime &&
        (session.mainPlanId ?? null) === event.mainPlanId &&
        (session.sessionAddressId ?? null) === event.venueId
      );
    };

    if (this.#state.nonConfirmedCart?.sessionItemsByDatetime == null) {
      applyFallbackSelectedTicketsBySessionIdUpdate();
      return;
    }

    let targetSession: CartSession | undefined;

    for (const [datetime, sessions] of this.#state.nonConfirmedCart.sessionItemsByDatetime.entries()) {
      const session = sessions.find(cartSession => matchesCartLine(cartSession, datetime));
      if (session) {
        targetSession = session;
        break;
      }
    }

    if (event.newCounter === 0) {
      const updatedSessionItemsByDatetime = new Map<string, CartSession[]>();

      this.#state.nonConfirmedCart.sessionItemsByDatetime.forEach((sessions, datetime) => {
        const filteredSessions = sessions.filter(session => !matchesCartLine(session, datetime));
        if (filteredSessions.length > 0) {
          updatedSessionItemsByDatetime.set(datetime, filteredSessions);
        }
      });

      this.#state.nonConfirmedCart.sessionItemsByDatetime = updatedSessionItemsByDatetime;

      if (this.#isSessionInCustomTabs(event.sessionId)) {
        this.updateCustomTilesAvailability(event.sessionId, 0);
      }

      if (this.#state.nonConfirmedCart.sessionItemsByDatetime.size === 0) {
        this.#state.nonConfirmedCart = null;
        this.#state.cartTotalMoney = new Money(0, this.#state.currency ?? '');
        this.#state.selectedTicketsBySessionId = new Map<string, number>();
        this.#state.selectedTicketsBySessionType = new Map<string, number>();
      } else {
        this.#recalculateCartTotal();
        this.recalculateSelectedTicketsFromCart();
      }
    } else if (targetSession) {
      targetSession.units = event.newCounter;
      this.#recalculateCartTotal();
      this.recalculateSelectedTicketsFromCart();
    } else {
      applyFallbackSelectedTicketsBySessionIdUpdate();
    }
  }

  /** Guard used before calling `updateCustomTilesAvailability`. */
  #isSessionInCustomTabs(sessionId: number): boolean {
    return this.#state.customTabSignals().some(tabSignal => {
      const tabData = tabSignal();
      if (!tabData?.tilesData) {
        return false;
      }
      return tabData.tilesData.customTiles.some(tile => tile.customTile.sessions.some(session => session.id === sessionId));
    });
  }

  #applyFirstLevelFlattening(parent: HierarchyNavigationParentNode): {
    parents: HierarchyNavigationParentNode[];
    promotedLeafs: HierarchyNavigationLeafNode[];
  } {
    const parents: HierarchyNavigationParentNode[] = [];
    const promotedLeafs: HierarchyNavigationLeafNode[] = [];
    parent.childrenParentNodes.forEach(childParent => {
      // Children parent node with no children parent nodes and only one child leaf gets replaced by its child leaf.
      if (childParent.childrenParentNodes.length === 0 && childParent.childrenLeafNodes.length === 1) {
        promotedLeafs.push(childParent.childrenLeafNodes[0]);
        return;
      }
      parents.push(childParent);
    });
    promotedLeafs.push(...parent.childrenLeafNodes);
    return { parents, promotedLeafs };
  }

  #convertCategoryToParentNode(category: OssHierarchyCategory, order = 1): HierarchyNavigationParentNode {
    const parentNodes: HierarchyNavigationParentNode[] = [];
    const leafNodes: HierarchyNavigationLeafNode[] = [];
    if (category.children) {
      category.children.forEach(child => {
        parentNodes.push(this.#convertCategoryToParentNode(child));
      });
    }
    if (category.products) {
      category.products.forEach(product => {
        parentNodes.push(this.#convertProductToParentNode(product));
      });
    }
    if (category.productVariations) {
      category.productVariations.forEach(variation => {
        leafNodes.push({
          order,
          sessionId: variation.sessionId,
        });
      });
    }
    return {
      childrenLeafNodes: leafNodes,
      childrenParentNodes: parentNodes,
      name: category.name,
      order,
    };
  }

  #convertProductToParentNode(product: OssHierarchyProduct, order = 1): HierarchyNavigationParentNode {
    const leafs: HierarchyNavigationLeafNode[] = product.productVariations.map(variation => ({
      order,
      sessionId: variation.sessionId,
    }));
    return {
      childrenLeafNodes: leafs,
      childrenParentNodes: [],
      name: product.name,
      order,
    };
  }

  #convertToHierarchyParent(
    extraInfo: OssCustomTileExtraInfoHierarchyElement,
    order = 1,
    customColor?: string | null,
    customName?: string | null,
  ): HierarchyNavigationParentNode {
    const parentNodes: HierarchyNavigationParentNode[] = [];
    const leafNodes: HierarchyNavigationLeafNode[] = [];
    if (extraInfo.children) {
      extraInfo.children.forEach(child => {
        parentNodes.push(this.#convertCategoryToParentNode(child));
      });
    }
    if (extraInfo.products) {
      extraInfo.products.forEach(product => {
        parentNodes.push(this.#convertProductToParentNode(product));
      });
    }
    if (extraInfo.productVariations) {
      extraInfo.productVariations.forEach(variation => {
        leafNodes.push({
          order,
          sessionId: variation.sessionId,
        });
      });
    }
    return {
      childrenLeafNodes: leafNodes,
      childrenParentNodes: parentNodes,
      customColor,
      customName,
      name: customName || extraInfo.name,
      order,
    };
  }

  #createFakeUnavailableSession(fakeId: number, name?: string | null): OssSessionAvailability {
    const currentDate = new Date().toISOString();
    const fakeSession = new OssSessionAvailability(
      fakeId,
      name || 'Unavailable',
      currentDate,
      currentDate,
      new Money(0, 'EUR'),
      false,
      1,
      0,
      0,
      currentDate,
      currentDate,
      false,
    );
    fakeSession.isUnavailable = true;
    return fakeSession;
  }

  /** Structural key: session availability state is deliberately excluded. */
  #createStructuralCacheKey(data: OssCustomTilesData): string {
    const structuralData = {
      customTiles: data.customTiles.map(tile => ({
        customTile: {
          color: tile.customTile.color,
          name: tile.customTile.name,
          position: tile.customTile.position,
          sessions: tile.customTile.sessions.map(session => ({
            id: session.id,
            maximumTicketsAllowedPerBooking: session.maximumTicketsAllowedPerBooking,
            minimumTicketsAllowedPerBooking: session.minimumTicketsAllowedPerBooking,
            name: session.name,
          })),
          targetElementExtraInfo: tile.customTile.targetElementExtraInfo,
          targetElementType: tile.customTile.targetElementType,
        },
      })),
    };
    return JSON.stringify(structuralData);
  }

  #customTabQuery(customTabSetupId: string, fromDate: string): CustomTabForDateQuery {
    return {
      channel: this.#state.channelId,
      customTabSetupId,
      fromDate,
      partnerId: String(this.#partnerService.getPartner()!.id),
    };
  }

  #findCustomTileSession(sessionId: number): OssSessionAvailability | null {
    for (const data of untracked(this.customTabTilesData)) {
      for (const wrapper of data?.customTiles ?? []) {
        const session = wrapper.customTile.sessions.find(candidate => candidate.id === sessionId);
        if (session) {
          return session;
        }
      }
    }
    return null;
  }

  #flattenHierarchyTileToSessions(customTile: OssCustomTile): OssSessionWithCustomTile[] {
    const extraInfo = customTile.targetElementExtraInfo as OssCustomTileExtraInfoHierarchyElement;
    if (!extraInfo) {
      return [];
    }
    // Case 1: Single product variation directly (without products or children) → create session tile
    if (extraInfo.productVariations?.length === 1 && !extraInfo.products?.length && !extraInfo.children?.length) {
      const productVariation = extraInfo.productVariations[0];
      if (productVariation?.sessionId) {
        const sessionIdToMatch = Number(productVariation.sessionId);
        const session = customTile.sessions.find((candidate: OssSessionAvailability) => Number(candidate.id) === sessionIdToMatch);
        if (session) {
          return [
            {
              customTile: {
                ...customTile,
                name: customTile.name || session.getDisplayName(false) || '',
                targetElementType: OssTargetElementType.SESSION_TYPE,
              },
              session,
            },
          ];
        }
      }
    }
    // Case 2: Product with same name as category → create product tile
    if (extraInfo.products?.length === 1 && extraInfo.name === extraInfo.products[0].name) {
      const product = extraInfo.products[0];
      return [
        {
          customTile: {
            ...customTile,
            name: customTile.name || product.name,
            targetElementExtraInfo: {
              name: product.name,
              placeCityTimezone: extraInfo.placeCityTimezone,
              productVariations: product.productVariations,
            },
          },
          session: null as unknown as OssSessionAvailability,
        },
      ];
    }
    // Default case: Keep original hierarchy tile
    return [
      {
        customTile,
        session: null as unknown as OssSessionAvailability,
      },
    ];
  }

  /** A free seating map still needs the tickets tab for its add-ons. */
  #hasAddonsOrNonSeatingTickets(): boolean {
    if (this.#state.productTypes.some(productType => productType.isShopProduct)) {
      return true;
    }
    const sessionAvailabilityList = this.#state.selectedSession?.selectedDatetime?.sessionAvailabilityList ?? [];
    const hasSeatingBySessionId = new Map(
      sessionAvailabilityList.map(session => [session.id, session.seating !== null && session.seating !== undefined]),
    );

    return this.#state.ticketTypes.some(ticketType => {
      if (ticketType.isAddon) {
        return true;
      }
      if (ticketType.sessionId === undefined) {
        return false;
      }

      const hasSeating = hasSeatingBySessionId.get(ticketType.sessionId);
      return hasSeating === false || hasSeating === undefined;
    });
  }

  #isPartyMembersMode(): boolean {
    return isPartyMembersMode({
      isFreeSeatingMap: this.#state.manageAsFreeSeatingMap,
      isRearchitectEnabled: this.#isTicketSelectorRearchitectEnabled,
      ticketSelectorType: this.#state.activeOnsiteSetup()?.ticket_selector_type ?? null,
    });
  }

  #isHierarchyElementType(type: OssTargetElementType): boolean {
    return (
      type === OssTargetElementType.HIERARCHY_ELEMENT ||
      type === OssTargetElementType.PARENT_HIERARCHY_ELEMENT ||
      type === OssTargetElementType.PRODUCT
    );
  }

  #nowDatetime(): string {
    return moment(Date.now())?.format('YYYY-MM-DDTHH:mm:ss')?.toString() ?? '';
  }

  #ongoingBucketFinishesOnLabel(bucket: RegularSessionAvailabilitySummaryByDate): string {
    let latest: moment.Moment | undefined;
    for (const slot of bucket.sessionAvailabilityByDatetimeList) {
      for (const session of slot.sessionAvailabilityList) {
        if (!session.endsAt) {
          continue;
        }
        const endsAt = moment.tz(session.endsAt, this.#state.timezone);
        if (!latest || endsAt.isAfter(latest)) {
          latest = endsAt;
        }
      }
    }
    if (!latest) {
      return '';
    }
    if (this.#state.locale) {
      latest.locale(this.#state.locale);
    }
    return typeof latest.format === 'function' ? latest.format('LL') : latest.toISOString();
  }

  #ossUpdateSessionAvailabilitySummary(): void {
    this.#state.sessionAvailabilitySummary = new SessionAvailabilitySummary(
      this.#state.timezone,
      this.#state.allowMultiSessionPurchase,
      this.#state.hasExplodePipe,
      this.#state.selectedSession && this.#state.selectedSession instanceof RegularSessionAvailabilitySummaryByDate
        ? [this.#state.selectedSession]
        : this.#state.regularSessionAvailabilitySummaryByDateList,
      this.#state.nextAvailableDate,
      this.#state.sessionSelectorType,
      this.#state.productSessions,
    );
  }

  /** Body that `updateTicketTypeFields` delegates to for regular (non-custom-tab) rows. */
  #ossUpdateTicketTypeFields(): void {
    this.#updateTicketTypes();
    if (!this.#state.selectedSession) {
      this.rebuildOngoingMultiDayTicketGroups();
      return;
    }
    this.#state.ticketTypes.forEach(ticketType => {
      if (!ticketType.isShopProduct) {
        ticketType.availableTickets = 0;
        ticketType.isHidden = false;
        ticketType.price = undefined;
        ticketType.partySizeMinimum = 0;
      }
    });
    if (this.#state.selectedSession.selectedDatetime !== null) {
      const timeslotSessions = this.#state.selectedSession.selectedDatetime.sessionAvailabilityList;
      timeslotSessions.forEach(session => {
        const index = this.#state.ticketTypes.findIndex(ticketType => ticketType.sessionId === session.id);
        if (this.#state.ticketTypes[index]) {
          this.#state.ticketTypes[index].availableTickets = session.availableTickets ? session.availableTickets : 0;
          this.#state.ticketTypes[index].isHidden = session.isHidden;
          this.#state.ticketTypes[index].price = session.ticketPrice ?? undefined;
          this.#state.ticketTypes[index].isPurchasable = !this.isSessionDisabledConsideringOverride(session);
          this.#state.ticketTypes[index].sessionId = session.id;
          this.#state.ticketTypes[index].overrideAvailableTickets = session.overrideAvailableTickets;
          this.#state.ticketTypes[index].maximum = session.getMaximumSelectableTickets(this.#state.canOverrideCapacities);
          this.#state.ticketTypes[index].partySizeMinimum = SessionAvailability.partySizeMinimumForSession(session, timeslotSessions);
        }
      });
      this.#state.ticketTypes = [...this.#state.ticketTypes];
    }
    this.rebuildOngoingMultiDayTicketGroups();
  }

  #preserveCustomTabsBySessionId(ticketTypeCounter: TicketTypeCounterSelection): {
    preservedCustomTabsBySessionId: Map<string, number>;
    preservedCustomTabsBySessionType: Map<string, number>;
  } {
    const preservedCustomTabsBySessionId = new Map<string, number>();
    const preservedCustomTabsBySessionType = new Map<string, number>();

    this.#state.selectedTicketsBySessionId.forEach((units, sessionId) => {
      const sessionIdNum = parseInt(sessionId);
      const isCustomTabProduct = this.#state.productTypes.some(
        productType => productType.sessionId === sessionIdNum && productType.isShopProduct === true,
      );
      if (isCustomTabProduct && units > 0 && !ticketTypeCounter.bySessionId.has(sessionId)) {
        preservedCustomTabsBySessionId.set(sessionId, units);
      }
    });

    this.#state.selectedTicketsBySessionType.forEach((units, sessionType) => {
      const isCustomTabProduct = this.#state.productTypes.some(
        productType => productType.name === sessionType && productType.isShopProduct === true,
      );
      if (isCustomTabProduct && units > 0 && !ticketTypeCounter.bySessionType.has(sessionType)) {
        preservedCustomTabsBySessionType.set(sessionType, units);
      }
    });
    return { preservedCustomTabsBySessionId, preservedCustomTabsBySessionType };
  }

  #recalculateCartTotal(): void {
    if (!this.#state.nonConfirmedCart) {
      return;
    }

    if (this.#state.coupon) {
      this.#state.updateCartTotalTrigger$.next();
      return;
    }

    this.#state.nonConfirmedCart.calculateTotal();
    const cartCurrency = this.#state.nonConfirmedCart.total?.currency || this.#state.currency || '';
    this.#state.cartTotalMoney = new Money(this.#state.nonConfirmedCart.total?.amount ?? 0, cartCurrency);
    this.#state.nonConfirmedCart = this.#state.nonConfirmedCart.clone();
  }

  #recalculateSelectedTicketsBySessionId(): void {
    const newTicketsBySessionId = new Map<string, number>();

    if (!this.#state.nonConfirmedCart?.sessionItemsByDatetime) {
      this.#state.selectedTicketsBySessionId = newTicketsBySessionId;
      return;
    }

    const unavailableSessionIds = this.#flexibleBundle.unavailableCartSessionIds(this.#state.nonConfirmedCart);
    this.#state.nonConfirmedCart.sessionItemsByDatetime.forEach(sessions => {
      sessions.forEach(session => {
        const sessionId = session.sessionId?.toString();
        if (sessionId == null) {
          return;
        }
        const currentCount = newTicketsBySessionId.get(sessionId) ?? 0;
        const units = unavailableSessionIds.has(session.sessionId)
          ? (this.#state.selectedTicketsBySessionId.get(sessionId) ?? 0)
          : session.units;
        newTicketsBySessionId.set(sessionId, currentCount + units);
      });
    });

    this.#state.selectedTicketsBySessionId = newTicketsBySessionId;
  }

  #recalculateSelectedTicketsBySessionType(): void {
    const newTicketsBySessionType = new Map<string, number>();

    if (!this.#state.nonConfirmedCart?.sessionItemsByDatetime) {
      this.#state.selectedTicketsBySessionType = newTicketsBySessionType;
      return;
    }

    const ongoingSessionIds = this.#ongoingSessionIdsForSelectedCalendarDate();
    const unavailableSessionIds = this.#flexibleBundle.unavailableCartSessionIds(this.#state.nonConfirmedCart);
    this.#state.nonConfirmedCart.sessionItemsByDatetime.forEach(sessions => {
      sessions.forEach(session => {
        if (ongoingSessionIds.has(session.sessionId)) {
          return;
        }
        const sessionTypeName = session.sessionType?.label ?? session.sessionName ?? '';
        if (sessionTypeName) {
          const currentCount = newTicketsBySessionType.get(sessionTypeName) || 0;
          const units = unavailableSessionIds.has(session.sessionId)
            ? (this.#state.selectedTicketsBySessionId.get(session.sessionId.toString()) ?? 0)
            : session.units;
          newTicketsBySessionType.set(sessionTypeName, currentCount + units);
        }
      });
    });

    this.#state.selectedTicketsBySessionType = newTicketsBySessionType;
  }

  #ongoingSessionIdsForSelectedCalendarDate(): Set<number> {
    const calendarDate = this.#state.selectedDateAvailability?.date;
    if (!calendarDate) {
      return new Set<number>();
    }
    // Every cart line change asks again, and the answer only moves with the buckets, the date or the timezone.
    const buckets = this.#state.regularSessionAvailabilitySummaryByDateList;
    const timezone = this.#state.timezone;
    const cached = this.#ongoingSessionIds;
    if (cached?.buckets === buckets && cached.calendarDate === calendarDate && cached.timezone === timezone) {
      return cached.ids;
    }
    const ids = OngoingSessionUtil.sessionIdsFromBuckets(buckets, calendarDate, timezone);
    this.#ongoingSessionIds = { buckets, calendarDate, ids, timezone };
    return ids;
  }

  #restoreCustomTabsSelections(
    customTabSelectionsBySessionId: Map<string, number>,
    customTabSelectionsBySessionType: Map<string, number>,
  ): void {
    customTabSelectionsBySessionId.forEach((units, sessionId) => {
      if (units > 0) {
        this.#state.selectedTicketsBySessionId.set(sessionId, units);
      }
    });
    customTabSelectionsBySessionType.forEach((units, sessionType) => {
      if (units > 0) {
        this.#state.selectedTicketsBySessionType.set(sessionType, units);
      }
    });
  }

  get #seating(): PosSeatingService {
    return (this.#seatingStrategy ??= this.#injector.get(PosSeatingService));
  }

  get #secondScreen(): PosSecondScreenService {
    return (this.#secondScreenStrategy ??= this.#injector.get(PosSecondScreenService));
  }

  #ticketTypeFromSession(session: SessionAvailability, isOngoingMultiDay: boolean): TicketType {
    return new TicketType(
      session.name,
      session.sessionType?.id,
      session.minimumTicketsAllowedPerBooking,
      session.maximumTicketsAllowedPerBooking,
      !session.isDisabled(),
      session.isHidden,
      session.availableTickets,
      session.ticketPrice ?? undefined,
      session.surchargePerTicket,
      session.id,
      session.sessionType!.reservationRestriction,
      session.sessionType!.ticketReceiptLabel,
      session.sessionType!.isAddOn,
      session.details,
      false,
      session.strikethroughPrice,
      undefined,
      this.#getStepQuantityFromSession(session),
      isOngoingMultiDay,
      undefined,
      undefined,
      session.sessionType?.imageUrl,
      session.sessionType?.tileColor,
    );
  }

  /** Intentional: no `filterOutWhenOnlyGlobalAddons` filtering on the OSS ticket-type path. */
  #updatePartyMembersTabs(): void {
    const customTabs = this.#state.activeOnsiteSetup()?.custom_tabs ?? [];
    const partyTabs: PosTabDescriptor[] = [
      { kind: 'party-members', setupId: null },
      ...customTabs.map((customTab: OnsiteSetupOssCustomTab): PosTabDescriptor => ({ kind: 'custom', setupId: customTab.id })),
    ];
    this.#selector.setAvailableTabs(partyTabs);
    this.#selector.activatePartyMembersTabIfAvailable();
  }

  #updateTicketTypes(): void {
    this.#ossUpdateSessionAvailabilitySummary();
    if (this.#state.selectedSession && this.#state.selectedSession.selectedDatetime !== null) {
      this.#state.ticketTypes = [];
      this.#state.selectedSession.selectedDatetime.sessionAvailabilityList.forEach(session => {
        this.#state.ticketTypes.push(
          new TicketType(
            session.name,
            session.sessionType?.id,
            session.minimumTicketsAllowedPerBooking,
            session.getMaximumSelectableTickets(this.#state.canOverrideCapacities),
            !this.isSessionDisabledConsideringOverride(session),
            session.isHidden,
            session.availableTickets,
            session.ticketPrice ?? undefined,
            session.surchargePerTicket,
            session.id,
            session.sessionType?.reservationRestriction,
            session.sessionType?.ticketReceiptLabel,
            session.sessionType?.isAddOn,
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
          ),
        );
      });
    } else {
      this.#state.ticketTypes = this.#state.sessionAvailabilitySummary?.getTicketTypes() ?? [];
    }

    const existingShopProductsInCart = this.#state.productTypes.filter(productType => {
      const isInCart = this.#state.selectedTicketsBySessionId.has(productType.sessionId?.toString() ?? '');
      return productType.isShopProduct && isInCart;
    });

    const newProductTypes = this.#state.sessionAvailabilitySummary?.getProductTypes() ?? [];

    this.#state.productTypes = [...existingShopProductsInCart];
    newProductTypes.forEach(newProduct => {
      if (!this.#state.productTypes.some(existing => existing.sessionId === newProduct.sessionId)) {
        this.#state.productTypes.push(newProduct);
      }
    });
  }
}

function areCountMapsEqual(left: ReadonlyMap<string, number>, right: ReadonlyMap<string, number>): boolean {
  if (left.size !== right.size) {
    return false;
  }
  const leftEntries = [...left];
  const rightEntries = [...right];

  return leftEntries.every(([key, units], index) => rightEntries[index][0] === key && rightEntries[index][1] === units);
}
