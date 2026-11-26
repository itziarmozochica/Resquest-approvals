import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  untracked,
  type TemplateRef,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';

import { type PlanDiscount } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';
import { calculateTotalDiscount } from '@fz-original/app/modules/box-office/memberships/utils/memberships.utils';
import { OssTab } from '@fz-original/app/modules/box-office/one-stop-shop/models';
import { OssOnsiteSetupStore } from '@fz-original/app/modules/box-office/one-stop-shop/store/oss-onsite-setup.store';
import { OssPlanSelectionStore } from '@fz-original/app/modules/box-office/one-stop-shop/store/oss-plan-selection.store';
import { posBreadcrumbsBreadcrumbTapped } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-breadcrumbs-breadcrumb-tapped.event';
import { posPartyCategorySelected } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-party-category-selected.event';
import { posPartyStartTimeTapped } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-party-start-time-tapped.event';
import { posProductTileTapped } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-product-tile-tapped.event';
import { posTabSwitched } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-tab-switched.event';
import { ReservationSettlementSessionService } from '@fz-original/app/modules/reservation-settlement/services/reservation-settlement-session.service';
import { ADDONS_INDEPENDENT_FROM_EXPLODE_PIPE_FEATURE } from '@fz-original/app/shared/components/ticket-selector/addon-explode-pipe.utils';
import { isFlexibleBundle } from '@fz-original/app/shared/models/plan/is-flexible-bundle.util';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { sessionTypeColorsAnswer } from '@fz-original/app/shared/tags/utils/session-type-colors.util';
import { sessionTypeTileColor } from '@fz-original/app/shared/tags/utils/session-type-tile-color.util';
import { sessionTypeDiscountFor } from '@fz-original/app/shared/utils/session-type-discount.util';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import {
  buildExplodeLevelTree,
  filterTicketTypesForLevel,
  fitPartySessionAllocation,
  partyQuantityTotal,
  partySessionChoiceAt,
  resolveDefaultExplodePath,
  resolveRememberedExplodePath,
  safeStepQuantity,
  stepUp,
  toExplodeLevelRow,
  type CustomTabHierarchyLevel,
  type DaySummary,
  type Money,
  type PartyFitParams,
  type PartySessionChoice,
  type Session,
  type SessionQuantities,
  type TimeslotSummary,
} from '@fz/ticketing';
import {
  buildCustomTabGridVm,
  buildPartyColumnVm,
  buildTicketGridVm,
  buildTicketSelectorVm,
  buildTicketsSectionVm,
  formatTimeslotTimeLabel,
  FztTicketSelectorComponent,
  partyMembersInPanelOrder,
  type FztBreadcrumbNavigationIntent,
  type FztCategoryChipVm,
  type FztPartyColumnVm,
  type FztPartyStartTimeTapIntent,
  type FztTabVm,
  type FztTicketRowInput,
  type FztTicketSelectorVm,
  type FztTicketsSectionFrame,
  type FztTicketsSectionVm,
  type FztTileAddIntent,
  type FztTileTapIntent,
} from '@fz/ticketing-ui';
import { IgntAlertComponent, IgntDialogService, type IgntDialogRef } from '@ignite/common';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { type EntityId } from '@ngrx/signals/entities';
import { TranslateService } from '@ngx-translate/core';
import { debounce } from 'rxjs';

import { toOssTab, type PosTabDescriptor } from '../../models/store/pos-ticket-selector-store.model';
import {
  type DerivedTicketSelectorRow,
  type TicketSelectorCatalogItem,
  type TicketSelectorCatalogPrice,
} from '../../models/ticket-selector-catalog-item.model';
import { PosMemberAccountService } from '../../services/member-account/pos-member-account.service';
import { PosMembershipsService } from '../../services/memberships/pos-memberships.service';
import { PosViewUpdateService } from '../../services/pos-view-update/pos-view-update.service';
import { PosTicketSelectionService } from '../../services/ticket-selection/pos-ticket-selection.service';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosTicketSelectorStore } from '../../store/pos-ticket-selector.store';
import { afterNextPaint } from '../../utils/after-next-paint.util';
import { formatPosPrice } from '../../utils/pos-format-price.util';
import {
  arePartyQuantitiesEqual,
  partySessionAdditions,
  toPartySessionQuantities,
  withPartyMaximumOverride,
} from '../../utils/pos-party-members.util';
import { partySessionPickerSubtitle } from '../../utils/pos-party-session-picker-subtitle.util';
import { doesNotFitAlert } from '../../utils/pos-party-session-picker-vm.util';
import { canIncrease, rowEffectiveMax } from '../../utils/pos-ticket-row-policy.util';
import { PosPartyHandheldModalService } from '../pos-party-handheld-modal/services/pos-party-handheld-modal.service';
import { PosSecondaryAttractionSelectorComponent } from '../pos-secondary-attraction-selector/pos-secondary-attraction-selector.component';
import { PosPartySessionPickerModalComponent } from './pos-party-session-picker-modal/pos-party-session-picker-modal.component';
import type {
  PartySessionPickerReopen,
  PosPartySessionPickerModalData,
  PosPartySessionPickerModalResult,
} from './pos-party-session-picker-modal/pos-party-session-picker-modal.model';

const CUSTOM_TAB_KEY_PREFIX = 'custom:';
const CUSTOM_TAB_NAVIGATION_DELAY_MS = 120;
const DEFAULT_CUSTOM_TAB_ICON: FztTabVm['icon'] = ['fal', 'heart'];
const FIRST_TILE_TOUR_ANCHOR_ID = 'tileSelection';
const PARENT_TILE_KEY_PREFIX = 'parent:';
const TABS_TOUR_ANCHOR_ID = 'tabsSelection';

interface PosTicketSelectorViewFlags {
  readonly allowMultiSession: boolean;
  readonly canOverrideCapacities: boolean;
  readonly explodePipeEnabled: boolean;
  readonly forceDisableIncreaseCounter: boolean;
  readonly isInOverrideZone: boolean;
  readonly isLoading: boolean;
  readonly locale: string;
  readonly manageAsFreeSeatingMap: boolean;
  readonly showUnitsAvailable: boolean;
  readonly timeZone: string;
}

interface PosPartyFitRules {
  readonly canOverrideCapacity: boolean;
  readonly includeTimeSlotCapacity: boolean;
  readonly minutesBeforeToExpire: number;
  readonly overrideMaximumTickets: number | null;
}

interface PosExplodeLevelSource {
  readonly addonsIndependentFromExplodePipe: boolean;
  readonly rows: readonly TicketSelectorCatalogItem[];
  readonly ticketsTabLive: boolean;
}

/**
 * Smart container of the POS ticket-selector region: builds the view-model the reusable
 * `fzt-ticket-selector` renders, owns the Mixpanel events and the flag reads, and translates every
 * intent into an existing legacy command. Contracts, the tracking table, the projections and the
 * sanctioned divergences are documented in `point-of-sale/AGENTS.md`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-loading-plan]': 'isLoadingPlan()' },
  imports: [FztTicketSelectorComponent, IgntAlertComponent, IgntSkeletonBaseComponent, PosSecondaryAttractionSelectorComponent],
  selector: 'pos-ticket-selector',
  standalone: true,
  styleUrl: './pos-ticket-selector.component.scss',
  templateUrl: './pos-ticket-selector.component.html',
})
export class PosTicketSelectorComponent {
  static readonly partyTabLabelKey = 'boxOffice.cart.sectionTicketsTitle';
  static readonly partyTabTrackingName = 'party_members';
  static readonly partyTabs: readonly PosTabDescriptor[] = [{ kind: 'party-members', setupId: null }];

  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(IgntDialogService);
  readonly #elementRef = inject(ElementRef);
  readonly #memberAccount = inject(PosMemberAccountService);
  readonly #memberships = inject(PosMembershipsService);
  readonly #onsiteSetupStore = inject(OssOnsiteSetupStore);
  readonly #optimizely = inject(OptimizelyService);
  readonly #partyHandheldModal = inject(PosPartyHandheldModalService);
  readonly #planSelectionStore = inject(OssPlanSelectionStore);
  readonly #reservationSettlement = inject(ReservationSettlementSessionService);
  readonly #state = inject(PosTicketingState);
  readonly #store = inject(PosTicketSelectorStore);
  readonly #ticketSelection = inject(PosTicketSelectionService);
  readonly #track = inject(FzTrackingService);
  readonly #translate = inject(TranslateService);
  readonly #viewUpdate = inject(PosViewUpdateService);

  #pendingCustomTabNavigationId: ReturnType<typeof setTimeout> | null = null;
  #sessionPickerRef: IgntDialogRef<PosPartySessionPickerModalResult> | null = null;

  readonly dateSelectorTemplate = input<TemplateRef<unknown> | null>(null);
  readonly isCustomTabDateSelectorModalOpen = input(false);
  readonly isMobile = input(false);
  readonly isTablet = input(false);
  readonly placeholderTemplate = input<TemplateRef<unknown> | null>(null);
  readonly seatingTemplate = input<TemplateRef<unknown> | null>(null);
  readonly scrollToCartItem = output<number>();

  protected readonly isFlexibleBundle = computed(() => isFlexibleBundle(this.#state.activePlan()?.bundleInformation));

  protected readonly hasSecondarySelection = computed(() => {
    const bundle = this.#state.activePlan()?.bundleInformation;

    if (!isFlexibleBundle(bundle)) {
      return true;
    }

    const minSecondary = Math.max((bundle.minSize ?? 1) - 1, 0);

    return this.#state.selectedSecondaryPlanIds().size >= minSecondary;
  });

  readonly #cartLocked = computed<boolean>(() => this.#reservationSettlement.session() !== null);

  /**
   * The quantities the party grid renders, one paint behind the store. The first member picked swaps the
   * empty state for the whole grid (fits for every leaf, every tile mounted and measured); deferring it lets
   * the counter paint the tap first, and the taps that land before that paint rebuild the grid once.
   */
  readonly #partyGridQuantities = toSignal(toObservable(this.#store.partyQuantities).pipe(debounce(() => afterNextPaint())), {
    initialValue: this.#store.partyQuantities(),
  });

  /** By content: the store also rebuilds the object on a loaded-day reconcile that moves nobody. */
  readonly #isPartyGridBehindStore = computed<boolean>(
    () => !arePartyQuantitiesEqual(this.#partyGridQuantities(), this.#store.partyQuantities()),
  );

  readonly #viewFlags = computed<PosTicketSelectorViewFlags>(() => {
    this.#viewUpdate.viewVersion();
    const state = this.#state;

    return {
      allowMultiSession: state.allowMultiSessionPurchase,
      canOverrideCapacities: state.canOverrideCapacities,
      explodePipeEnabled: state.hasExplodePipe,
      forceDisableIncreaseCounter: state.forceDisableIncreaseCounter,
      isInOverrideZone: state.isInOverrideZone,
      isLoading: state.isLoadingSessions || state.isLoadingDateSessions,
      locale: state.locale,
      manageAsFreeSeatingMap: state.manageAsFreeSeatingMap,
      showUnitsAvailable: !state.useCacheEnabled,
      timeZone: state.timezone,
    };
  });

  readonly #catalogBeforeMemberLock = computed<readonly DerivedTicketSelectorRow[]>(() =>
    (this.#viewFlags().manageAsFreeSeatingMap ? this.#store.addonsTabCatalog() : this.#store.catalog()).filter(
      (row: DerivedTicketSelectorRow) => !row.isCustomTile,
    ),
  );

  readonly #catalog = computed<readonly DerivedTicketSelectorRow[]>(() => {
    const lockedSessionTypeIds = this.#memberAccount.lockedSessionTypeIds;

    return this.#catalogBeforeMemberLock().filter((row: DerivedTicketSelectorRow) => !isLockedForMember(row, lockedSessionTypeIds));
  });

  /** A tile whose session type keeps the line price of the order being modified never takes a member discount. */
  readonly #priceWithDiscountByRowKey = computed<ReadonlyMap<string, TicketSelectorCatalogPrice>>(() => {
    const discounts = this.#memberships.membershipsData.planDiscounts;
    const byRowKey = new Map<string, TicketSelectorCatalogPrice>();

    if (discounts.length === 0) {
      return byRowKey;
    }

    const sessionTypeDiscounts = this.#state.modifyOrderSessionTypeDiscounts();
    const mainPlanId = this.#state.modifiedOrder()?.effectivePlanId;

    for (const row of this.#catalog()) {
      const price = row.price;

      if (price === null || price.amount <= 0 || row.sessionTypeId === null) {
        continue;
      }

      if (sessionTypeDiscountFor(sessionTypeDiscounts, mainPlanId, row.sessionTypeId) !== null) {
        continue;
      }

      const discount = discounts.find((planDiscount: PlanDiscount) => planDiscount.ticketTypeId === row.sessionTypeId);

      if (discount === undefined || discount.discount <= 0) {
        continue;
      }

      const discounted = calculateTotalDiscount(price.amount, price.currency, {
        amount: discount.discount,
        type: discount.discountType,
      });

      byRowKey.set(row.key, { amount: discounted.amount, currency: discounted.currency });
    }

    return byRowKey;
  });

  readonly #quantitiesBySessionId = computed<ReadonlyMap<string, number>>(() => {
    this.#state.selectionVersion();

    return new Map(this.#state.selectedTicketsBySessionId);
  });

  readonly #quantitiesBySessionType = computed<ReadonlyMap<string, number>>(() => {
    this.#state.selectionVersion();

    return new Map(this.#state.selectedTicketsBySessionType);
  });

  readonly #ticketRows = computed<readonly FztTicketRowInput[]>(() => {
    const flags = this.#viewFlags();
    const hasSessionTypeColors = this.#hasSessionTypeColors();
    const priceWithDiscountByRowKey = this.#priceWithDiscountByRowKey();
    const quantities = this.#quantitiesBySessionId();

    return this.#catalog().map((row: DerivedTicketSelectorRow): FztTicketRowInput => {
      const quantity = quantities.get(String(row.sessionId)) ?? 0;

      return {
        availableTickets: row.availableTickets ?? null,
        canIncrease:
          canIncrease(row, { forceDisableIncreaseCounter: flags.forceDisableIncreaseCounter, quantity }) &&
          row.isBundleUnavailable !== true,
        customColor: hasSessionTypeColors ? sessionTypeTileColor(row.sessionTypeColor) : null,
        endsAt: row.endsAt,
        isAddon: row.isAddon,
        isHidden: row.isHidden,
        isMultiDay: row.isMultiDay,
        isOngoing: row.isOngoing,
        isPass: row.isPass,
        isPurchasable: row.isPurchasable,
        isShopProduct: row.isShopProduct,
        key: row.key,
        name: row.name,
        price: toLibMoney(row.price),
        priceWithDiscount: toLibMoney(priceWithDiscountByRowKey.get(row.key) ?? null),
        quantity,
        sessionId: row.sessionId,
        showWarning: flags.isInOverrideZone && quantity > 0,
        startsAt: row.startsAt,
      };
    });
  });

  readonly #explodeRows = computed<readonly TicketSelectorCatalogItem[]>(
    () => this.#catalog().filter((row: TicketSelectorCatalogItem) => !row.isOngoing),
    { equal: catalogRowsEqualBySessionId },
  );

  readonly #ticketsTabLive = computed<boolean>(
    () => this.#viewFlags().manageAsFreeSeatingMap || this.#store.activeTab().kind === 'tickets',
  );

  readonly #explodeLevelSource = computed<PosExplodeLevelSource>(
    () => {
      this.#viewUpdate.viewVersion();

      return {
        addonsIndependentFromExplodePipe: this.#addonsIndependentFromExplodePipe(),
        rows: this.#explodeRows(),
        ticketsTabLive: this.#ticketsTabLive(),
      };
    },
    {
      equal: (left, right) =>
        left.addonsIndependentFromExplodePipe === right.addonsIndependentFromExplodePipe &&
        left.rows === right.rows &&
        left.ticketsTabLive === right.ticketsTabLive,
    },
  );

  readonly #activePlanId = computed<number | null>(() => this.#state.activePlan()?.id ?? null);

  readonly #lastOpenedExplodePath = linkedSignal<number | null, readonly string[] | null>({
    source: this.#activePlanId,
    computation: () => null,
  });

  readonly #explodeLevelPath = linkedSignal<PosExplodeLevelSource, readonly string[]>({
    source: this.#explodeLevelSource,
    computation: ({ addonsIndependentFromExplodePipe, rows }) => {
      const levelRows = addonsIndependentFromExplodePipe ? filterTicketTypesForLevel(rows) : rows;
      const tree = buildExplodeLevelTree(levelRows.map((row: TicketSelectorCatalogItem) => toExplodeLevelRow(row)));
      const lastOpenedPath = untracked(this.#lastOpenedExplodePath);
      const reopenedPath = lastOpenedPath === null ? [] : resolveRememberedExplodePath(tree, lastOpenedPath);

      return reopenedPath.length > 0
        ? reopenedPath
        : resolveDefaultExplodePath(
            tree,
            untracked(() => this.#preferredExplodeNames(levelRows)),
          );
    },
  });

  readonly #unavailableSessionIdsByTab = computed<ReadonlyMap<string, ReadonlySet<number>>>(() => {
    const quantities = this.#quantitiesBySessionId();
    const byTab = new Map<string, ReadonlySet<number>>();

    for (const customTab of this.#store.customTabEntities()) {
      const unavailableSessionIds = new Set<number>();

      for (const tile of customTab.tiles ?? []) {
        for (const session of tile.sessions) {
          const quantity = quantities.get(String(session.id)) ?? 0;

          if (quantity > 0 && quantity >= session.ticketsAllowedPerBooking.maximum) {
            unavailableSessionIds.add(session.id);
          }
        }
      }

      byTab.set(customTab.setupId, unavailableSessionIds);
    }

    return byTab;
  });

  readonly #isResolvingPlan = computed<boolean>(() => {
    const placeholder = this.#planSelectionStore.ticketSelectorPlaceholder();

    return placeholder === 'loading' || (placeholder === 'awaitingSelection' && this.#state.activeOssPlanConfig() !== null);
  });

  readonly #ticketsFrame = computed<FztTicketsSectionFrame>(() => {
    const state = this.#state;

    if (state.activeOnsiteSetup() === null) {
      return this.#onsiteSetupStore.ticketSelectorPlaceholder() === 'loading' ? 'loading' : 'placeholder';
    }

    if (state.activePlan() === null) {
      return this.#isResolvingPlan() ? 'loading' : 'placeholder';
    }

    return state.isLoadingNewSearch() ? 'loading' : 'ready';
  });

  protected readonly isLoadingPlan = computed<boolean>(() => this.#state.activePlan() === null && this.#ticketsFrame() === 'loading');

  protected readonly showPlanSelectorSkeleton = computed<boolean>(() => !this.isMobile() && !this.isTablet() && this.isLoadingPlan());

  readonly #partyFitRules = computed<PosPartyFitRules>(
    () => {
      this.#viewUpdate.viewVersion();
      const state = this.#state;

      return {
        canOverrideCapacity: state.includeOverrideCapacity,
        includeTimeSlotCapacity: state.includeTimeSlotCapacity,
        minutesBeforeToExpire: state.minutesBeforeToExpire ?? 0,
        overrideMaximumTickets: state.overrideMaximumTickets ?? null,
      };
    },
    {
      equal: (left: PosPartyFitRules, right: PosPartyFitRules): boolean =>
        left.canOverrideCapacity === right.canOverrideCapacity &&
        left.includeTimeSlotCapacity === right.includeTimeSlotCapacity &&
        left.minutesBeforeToExpire === right.minutesBeforeToExpire &&
        left.overrideMaximumTickets === right.overrideMaximumTickets,
    },
  );

  readonly #partyFitParams = computed<PartyFitParams>(() => {
    const rules = this.#partyFitRules();

    return {
      canOverrideCapacity: rules.canOverrideCapacity,
      includeTimeSlotCapacity: rules.includeTimeSlotCapacity,
      minutesBeforeToExpire: rules.minutesBeforeToExpire,
      selectedQuantities: toPartySessionQuantities(this.#quantitiesBySessionId()),
      timeZone: this.#store.partyTimeZone(),
    };
  });

  readonly #partyDaySummary = computed<DaySummary | null>(() => {
    const daySummary = this.#store.partyDay()?.daySummary ?? null;

    return daySummary === null ? null : withPartyMaximumOverride(daySummary, this.#partyFitRules().overrideMaximumTickets);
  });

  readonly #partyColumn = computed<FztPartyColumnVm>(() => {
    const daySummary = this.#partyDaySummary();

    return buildPartyColumnVm({
      category: this.#store.partyCategory(),
      daySummary,
      fitParams: this.#partyFitParams(),
      hourFilter: this.#store.partyResolvedHourFilter(),
      isDayLoaded: this.#store.partyDay() !== null,
      party: this.#partyGridQuantities(),
      searchedAt: this.#store.partySearchedAt(),
      showTaxesIncluded: daySummary !== null,
    });
  });

  readonly #isAwaitingPartySetup = computed<boolean>(() => this.#state.activeOnsiteSetup() === null && this.#store.isPartyMembersMode());

  readonly #visibleTabs = computed<readonly PosTabDescriptor[]>(() => {
    const tabs = this.#isAwaitingPartySetup() ? PosTicketSelectorComponent.partyTabs : this.#store.availableTabs();

    return this.#cartLocked() ? tabs.filter((tab: PosTabDescriptor) => tab.kind !== 'seating') : tabs;
  });

  readonly #isTicketGridTheOnlySellingSurface = computed<boolean>(() => {
    const tabs = this.#visibleTabs();

    return !this.#viewFlags().manageAsFreeSeatingMap && tabs.length === 1 && tabs[0].kind === 'tickets';
  });

  readonly #isEverySeatlessSessionTypeLockedForMember = computed<boolean>(() => {
    const lockedSessionTypeIds = this.#memberAccount.lockedSessionTypeIds;
    const sessionTypeIds = this.#store.seatlessSessionTypeIdsAcrossAvailability();

    return sessionTypeIds.size > 0 && [...sessionTypeIds].every((sessionTypeId: number) => lockedSessionTypeIds.has(sessionTypeId));
  });

  protected readonly isCatalogLockedForMember = computed<boolean>(
    () =>
      this.#isTicketGridTheOnlySellingSurface() &&
      this.#catalogBeforeMemberLock().length > 0 &&
      this.#catalog().length === 0 &&
      this.#isEverySeatlessSessionTypeLockedForMember(),
  );

  protected readonly lockedCatalogMessage = computed<string>(() =>
    this.#translate.instant(
      this.#memberAccount.hasIdentification
        ? 'boxOffice.memberAccount.lockedCatalog.identified'
        : 'boxOffice.memberAccount.lockedCatalog.anonymous',
    ),
  );

  protected readonly vm = computed<FztTicketSelectorVm>(() => {
    const activeTab = this.#store.activeTab();
    const flags = this.#viewFlags();
    const tabs = this.#visibleTabs();
    const sections: Record<string, FztTicketsSectionVm> = {};
    const tabVms: FztTabVm[] = [];

    for (const descriptor of tabs) {
      const tabKey = tabKeyOf(descriptor);

      tabVms.push(this.#buildTabVm(descriptor, tabKey, flags));
      sections[tabKey] = this.#buildSectionVm(descriptor, flags);
    }

    return buildTicketSelectorVm({
      hideTabHeader: this.#ticketsFrame() === 'placeholder',
      keepAlive: flags.manageAsFreeSeatingMap,
      sections,
      selectedTabIndex: Math.max(
        0,
        tabs.findIndex((tab: PosTabDescriptor) => tab.kind === activeTab.kind && tab.setupId === activeTab.setupId),
      ),
      tabs: tabVms,
      tabsTourAnchorId: TABS_TOUR_ANCHOR_ID,
    });
  });

  constructor() {
    this.#destroyRef.onDestroy(() => {
      this.#cancelPendingCustomTabNavigation();
    });

    afterRenderEffect(() => {
      const flexible = this.isFlexibleBundle();
      const host = this.#elementRef.nativeElement as HTMLElement;
      const selectorEl = host.querySelector('pos-secondary-attraction-selector');

      if (!selectorEl || !flexible) {
        return;
      }

      const gridEl = host.querySelector('.ticket-selector--tickets .ticket-selector--grid');
      const tileGridEl = gridEl?.querySelector(':scope > .oss-hierarchy-tiles--tickets-tab');

      if (gridEl && tileGridEl && selectorEl.parentElement !== gridEl) {
        gridEl.insertBefore(selectorEl, tileGridEl);
      }
    });
  }

  protected onBreadcrumbNavigated(intent: FztBreadcrumbNavigationIntent): void {
    const descriptor = this.#descriptorFor(intent.tabKey);

    if (descriptor === null || descriptor.kind !== 'custom' || descriptor.setupId === null) {
      return;
    }

    const path = this.#store.customTabPaths()[descriptor.setupId] ?? [];

    if (intent.depth >= path.length) {
      return;
    }

    const breadcrumbs = this.vm().sections[intent.tabKey]?.grid?.breadcrumbs ?? [];

    this.#track.track(
      posBreadcrumbsBreadcrumbTapped({
        breadcrumbType: intent.depth === 0 ? 'home' : 'category',
        category: intent.depth === 0 ? null : (breadcrumbs[intent.depth]?.name ?? null),
      }),
    );
    this.#store.navigateCustomTab(descriptor.setupId, path.slice(0, intent.depth));
  }

  protected onLevelSelected(path: readonly string[]): void {
    this.#lastOpenedExplodePath.set(path);
    this.#explodeLevelPath.set(path);
  }

  protected onPartyCategorySelected(category: string): void {
    this.#track.track(posPartyCategorySelected({ category }));
    this.#store.selectPartyCategory(category);
  }

  protected onPartySelectMembersRequested(): void {
    this.#partyHandheldModal.openPartyMembers();
  }

  /** A tap on a start time the grid fitted for an older party is dropped: the grid catches up by the next paint. */
  protected onPartyStartTimeTapped(intent: FztPartyStartTimeTapIntent): void {
    if (this.#cartLocked() || this.#sessionPickerRef !== null || this.#isPartyGridBehindStore()) {
      return;
    }

    this.#track.track(
      posPartyStartTimeTapped({
        partySize: partyQuantityTotal(this.#store.partyQuantities()),
        startTime: formatTimeslotTimeLabel(intent.fit.startTime, this.#store.partyTimeZone()),
        tileName: intent.leafName,
      }),
    );

    if (!intent.fit.needsSessionChoice) {
      this.#addPartyToCart(intent.fit.startTime, intent.fit.nextQuantitiesBySessionId);

      return;
    }

    this.#openPartySessionPicker(intent, null);
  }

  protected onTabSelected(visibleIndex: number): void {
    const descriptor = this.#visibleTabs()[visibleIndex];

    if (descriptor === undefined) {
      return;
    }

    const storeTabs = this.#store.availableTabs();
    const storeIndex = storeTabs.findIndex((tab: PosTabDescriptor) => tab.kind === descriptor.kind && tab.setupId === descriptor.setupId);

    if (storeIndex === -1) {
      return;
    }

    const previousTab = this.#store.activeTab();

    if (storeIndex !== previousTab.index) {
      this.#track.track(
        posTabSwitched({
          fromTab: this.#tabTrackingName(storeTabs[previousTab.index] ?? null),
          toTab: this.#tabTrackingName(descriptor),
        }),
      );
    }

    if (!this.vm().keepAlive) {
      this.#cancelPendingCustomTabNavigation();
    }

    this.#store.selectTab(storeIndex);

    if ((descriptor.kind === 'tickets' || descriptor.kind === 'party-members') && previousTab.kind === 'custom') {
      this.#ticketSelection.updateTicketTypeFields();
      this.#viewUpdate.markForCheck();
    }
  }

  protected onTileAdd(intent: FztTileAddIntent): void {
    const descriptor = this.#descriptorFor(intent.tabKey);

    if (descriptor === null) {
      return;
    }

    if (descriptor.kind === 'custom') {
      if (this.#cartLocked()) {
        return;
      }

      this.#ticketSelection.addUnitBySessionId(intent.sessionId);

      return;
    }

    const renderedRows = this.#renderedRows(intent.tabKey);
    const row = renderedRows.find((candidate: TicketSelectorCatalogItem) => candidate.sessionId === intent.sessionId);

    if (row === undefined) {
      return;
    }

    const current = this.#quantitiesBySessionId().get(String(intent.sessionId)) ?? 0;
    const next = stepUp(current, Math.max(row.minimum, row.partySizeMinimum), rowEffectiveMax(row), safeStepQuantity(row.stepQuantity));

    if (next === current) {
      return;
    }

    this.#ticketSelection.selectQuantityFromSelector(renderedRows, intent.sessionId, next);
    this.scrollToCartItem.emit(intent.sessionId);
  }

  protected onTileTapped(intent: FztTileTapIntent): void {
    const descriptor = this.#descriptorFor(intent.tabKey);

    if (descriptor === null) {
      return;
    }

    this.#cancelPendingCustomTabNavigation();

    if (descriptor.kind !== 'custom') {
      this.#track.track(posProductTileTapped({ tileType: intent.category === 'addon' ? 'add-on' : 'ticket' }));

      return;
    }

    this.#track.track(posProductTileTapped({ tileType: intent.tileKind === 'parent' ? 'category' : 'product' }));

    const setupId = descriptor.setupId;
    const parentIndex = parentTileIndexOf(intent.tileKey);

    if (intent.tileKind !== 'parent' || setupId === null || parentIndex === null) {
      return;
    }

    const path = this.#store.customTabPaths()[setupId] ?? [];

    this.#pendingCustomTabNavigationId = setTimeout(() => {
      this.#pendingCustomTabNavigationId = null;
      this.#store.navigateCustomTab(setupId, [...path, parentIndex]);
    }, CUSTOM_TAB_NAVIGATION_DELAY_MS);
  }

  #addonsIndependentFromExplodePipe(): boolean {
    return this.#optimizely.isFeatureEnabled(ADDONS_INDEPENDENT_FROM_EXPLODE_PIPE_FEATURE) ?? false;
  }

  #addPartyToCart(startTime: string, nextQuantitiesBySessionId: SessionQuantities): void {
    if (!this.#ticketSelection.selectPartyAtTimeslot(startTime, nextQuantitiesBySessionId)) {
      return;
    }

    const firstSessionId = Object.keys(nextQuantitiesBySessionId).map(Number).at(0);

    if (firstSessionId !== undefined) {
      this.scrollToCartItem.emit(firstSessionId);
    }
  }

  #addPickedSessionsToCart(
    intent: FztPartyStartTimeTapIntent,
    choice: PartySessionChoice,
    openedWith: PartyFitParams,
    { nextQuantitiesBySessionId, selection }: PosPartySessionPickerModalResult,
  ): void {
    const liveTimeslot = this.#partyTimeslotOr(choice.fit.startTime, choice.timeslot);

    if (liveTimeslot === null) {
      this.#openPartySessionPicker(intent, { alert: doesNotFitAlert(), selection }, choice.timeslot);

      return;
    }

    const liveFit = fitPartySessionAllocation(
      liveTimeslot,
      partySessionAdditions(nextQuantitiesBySessionId, openedWith.selectedQuantities),
      this.#partyFitParams(),
    );

    if (liveFit.isSelectable) {
      this.#addPartyToCart(choice.fit.startTime, liveFit.nextQuantitiesBySessionId);

      return;
    }

    this.#openPartySessionPicker(intent, { alert: doesNotFitAlert(liveFit.violationMessage), selection }, choice.timeslot);
  }

  #buildCustomSectionVm(setupId: string, flags: PosTicketSelectorViewFlags): FztTicketsSectionVm {
    const hasTiles = this.#store.customTabHasTiles()[setupId] ?? false;
    const hierarchy = this.#store.customTabHierarchies()[setupId] ?? null;
    const frame: FztTicketsSectionFrame = hasTiles && !this.isCustomTabDateSelectorModalOpen() ? 'ready' : 'loading';

    return buildTicketsSectionVm({
      frame,
      grid:
        frame === 'ready' && hierarchy !== null
          ? buildCustomTabGridVm({
              cartLocked: this.#cartLocked(),
              forceDisableIncrease: flags.forceDisableIncreaseCounter,
              formatPrice: this.#formatPrice(flags.locale),
              hierarchy,
              path: this.#store.customTabPaths()[setupId] ?? [],
              showUnitsAvailable: flags.showUnitsAvailable,
              tileColorBySessionId: this.#tileColorBySessionId(hierarchy),
              unavailableSessionIds: this.#unavailableSessionIdsByTab().get(setupId) ?? new Set<number>(),
            })
          : null,
      kind: 'custom',
      showDateSelectorSlot: false,
    });
  }

  #buildSectionVm(descriptor: PosTabDescriptor, flags: PosTicketSelectorViewFlags): FztTicketsSectionVm {
    if (descriptor.kind === 'custom') {
      return this.#buildCustomSectionVm(descriptor.setupId ?? '', flags);
    }

    const frame: FztTicketsSectionFrame = this.isCatalogLockedForMember() ? 'placeholder' : this.#ticketsFrame();

    if (descriptor.kind === 'party-members') {
      return buildTicketsSectionVm({
        frame,
        grid: null,
        kind: 'party-members',
        party: frame === 'ready' ? this.#partyColumn() : null,
        showDateSelectorSlot: true,
      });
    }

    return buildTicketsSectionVm({
      frame,
      grid: descriptor.kind === 'seating' || frame !== 'ready' ? null : this.#buildTicketGridVm(flags),
      kind: descriptor.kind,
      showDateSelectorSlot: true,
    });
  }

  #buildTabVm(descriptor: PosTabDescriptor, tabKey: string, flags: PosTicketSelectorViewFlags): FztTabVm {
    if (descriptor.kind === 'party-members') {
      return {
        icon: ['fal', 'ticket-alt'],
        key: tabKey,
        kind: 'party-members',
        label: this.#translate.instant(PosTicketSelectorComponent.partyTabLabelKey),
        testId: 'oss-party-members-tab',
      };
    }

    if (descriptor.kind === 'seating') {
      return { icon: ['fal', 'loveseat'], key: tabKey, kind: 'seating', labelKey: 'seating', testId: 'oss-seating-tab' };
    }

    if (descriptor.kind === 'custom') {
      const customTabIndex = this.#customTabIndexOf(descriptor.setupId);

      return {
        icon: this.#ticketSelection.customTabIcons()[customTabIndex] ?? DEFAULT_CUSTOM_TAB_ICON,
        key: tabKey,
        kind: 'custom',
        label: this.#ticketSelection.customTabNames()[customTabIndex] ?? '',
        testId: 'oss-custom-tabs-tab',
      };
    }

    return {
      icon: flags.manageAsFreeSeatingMap ? ['fal', 'cart-plus'] : ['fal', 'ticket-alt'],
      key: tabKey,
      kind: 'tickets',
      labelKey: flags.manageAsFreeSeatingMap ? 'addOns' : 'ticketsAndAddOns',
      testId: 'oss-tickets-tab',
    };
  }

  #buildTicketGridVm(flags: PosTicketSelectorViewFlags): FztTicketSelectorVm['sections'][string]['grid'] {
    const grid = buildTicketGridVm({
      addonsIndependentFromExplodePipe: this.#addonsIndependentFromExplodePipe(),
      addonsInSeparateSection: !flags.manageAsFreeSeatingMap,
      allowMultiSession: flags.allowMultiSession,
      canOverrideCapacities: flags.canOverrideCapacities,
      cartLocked: this.#cartLocked(),
      explodeLevelPath: this.#explodeLevelPath(),
      explodePipeEnabled: flags.explodePipeEnabled,
      firstTileTourAnchorId: flags.manageAsFreeSeatingMap ? '' : FIRST_TILE_TOUR_ANCHOR_ID,
      formatPrice: this.#formatPrice(flags.locale),
      hiddenInSeparateSection: false,
      isLoading: flags.isLoading,
      locale: flags.locale,
      rows: this.#ticketRows(),
      showUnitsAvailable: flags.showUnitsAvailable,
      timeZone: flags.timeZone,
    });

    if (this.isFlexibleBundle()) {
      return { ...grid, levels: [] };
    }

    return grid;
  }

  #cancelPendingCustomTabNavigation(): void {
    if (this.#pendingCustomTabNavigationId === null) {
      return;
    }

    clearTimeout(this.#pendingCustomTabNavigationId);
    this.#pendingCustomTabNavigationId = null;
  }

  #customTabIndexOf(setupId: string | null): number {
    return this.#store.customTabIds().findIndex((customTabId: EntityId) => String(customTabId) === setupId);
  }

  #descriptorFor(tabKey: string): PosTabDescriptor | null {
    return this.#visibleTabs().find((tab: PosTabDescriptor) => tabKeyOf(tab) === tabKey) ?? null;
  }

  #formatPrice(locale: string): (money: Money) => string {
    return (money: Money): string => formatPosPrice(money, locale);
  }

  #openPartySessionPicker(
    intent: FztPartyStartTimeTapIntent,
    reopen: PartySessionPickerReopen | null,
    snapshot: TimeslotSummary | null = null,
  ): void {
    const fitParams = this.#partyFitParams();
    const choice =
      this.#partySessionChoiceAt(this.#partyTimeslotAt(intent.fit.startTime), intent.leafKey, fitParams) ??
      this.#partySessionChoiceAt(snapshot, intent.leafKey, fitParams);

    if (choice === null) {
      return;
    }

    // The store holds no category until the cashier picks a chip, so the subtitle reads the one the view shows.
    const category = this.#partyColumn().categoryChips.find((chip: FztCategoryChipVm) => chip.isSelected)?.category ?? null;
    const sessionPickerRef = this.#dialog.openModal<PosPartySessionPickerModalResult, PosPartySessionPickerModalData>(
      PosPartySessionPickerModalComponent,
      {
        data: {
          choice,
          fitParams,
          locale: this.#viewFlags().locale,
          members: partyMembersInPanelOrder(this.#store.partyMembers()),
          reopen,
          subtitle: partySessionPickerSubtitle(category, intent.leafName, choice.fit.startTime, this.#store.partyTimeZone()),
        },
        size: 'md',
      },
    );

    this.#sessionPickerRef = sessionPickerRef;
    sessionPickerRef.closed$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: PosPartySessionPickerModalResult | undefined) => {
        this.#sessionPickerRef = null;

        if (result !== undefined) {
          this.#addPickedSessionsToCart(intent, choice, fitParams, result);
        }
      });
  }

  #partySessionChoiceAt(timeslot: TimeslotSummary | null, leafKey: string, fitParams: PartyFitParams): PartySessionChoice | null {
    return timeslot === null ? null : partySessionChoiceAt(timeslot, leafKey, this.#store.partyQuantities(), fitParams);
  }

  #partyTimeslotAt(startTime: string): TimeslotSummary | null {
    return this.#partyDaySummary()?.timeslots.find((timeslot: TimeslotSummary) => timeslot.datetime === startTime) ?? null;
  }

  // While the day reloads there is no live timeslot yet, so the snapshot stands in; the cart stays live either way.
  #partyTimeslotOr(startTime: string, snapshot: TimeslotSummary | null): TimeslotSummary | null {
    return this.#store.partyDay() === null ? snapshot : this.#partyTimeslotAt(startTime);
  }

  // Sampled on every view-model recompute and coalesced like the add-ons flag: `null` (SDK not ready) paints nothing.
  #hasSessionTypeColors(): boolean {
    return sessionTypeColorsAnswer(this.#optimizely) ?? false;
  }

  #preferredExplodeNames(rows: readonly TicketSelectorCatalogItem[]): readonly string[] {
    const quantities = this.#quantitiesBySessionType();

    return rows
      .filter((row: TicketSelectorCatalogItem) => (quantities.get(row.name) ?? 0) > 0)
      .map((row: TicketSelectorCatalogItem) => row.name);
  }

  #renderedRows(tabKey: string): readonly TicketSelectorCatalogItem[] {
    const grid = this.vm().sections[tabKey]?.grid ?? null;

    if (grid === null) {
      return [];
    }

    const renderedKeys = new Set(grid.sections.flatMap(section => section.tiles.map(tile => tile.key)));

    return this.#catalog().filter((row: TicketSelectorCatalogItem) => renderedKeys.has(row.key));
  }

  #tabTrackingName(descriptor: PosTabDescriptor | null): string {
    if (descriptor === null) {
      return '';
    }

    if (descriptor.kind === 'party-members') {
      return PosTicketSelectorComponent.partyTabTrackingName;
    }

    if (descriptor.kind !== 'custom') {
      return toOssTab(descriptor.kind);
    }

    return this.#ticketSelection.customTabNames()[this.#customTabIndexOf(descriptor.setupId)] ?? OssTab.CUSTOM_TABS;
  }

  #tileColorBySessionId(hierarchy: CustomTabHierarchyLevel): ReadonlyMap<number, string> {
    if (!this.#hasSessionTypeColors()) {
      return new Map<number, string>();
    }

    return new Map(
      hierarchy.sessions.flatMap((session: Session): [number, string][] => {
        const color = sessionTypeTileColor(session.sessionType?.color);

        return color === null ? [] : [[session.id, color]];
      }),
    );
  }
}

function catalogRowsEqualBySessionId(left: readonly TicketSelectorCatalogItem[], right: readonly TicketSelectorCatalogItem[]): boolean {
  return (
    left.length === right.length &&
    left.every((row: TicketSelectorCatalogItem) =>
      right.some((candidate: TicketSelectorCatalogItem) => catalogRowEqualsBySessionId(row, candidate)),
    )
  );
}

function catalogRowEqualsBySessionId(left: TicketSelectorCatalogItem, right: TicketSelectorCatalogItem): boolean {
  return (
    left.name === right.name &&
    left.sessionId === right.sessionId &&
    left.maximum === right.maximum &&
    left.minimum === right.minimum &&
    left.availableTickets === right.availableTickets &&
    left.isHidden === right.isHidden &&
    left.isOngoing === right.isOngoing &&
    left.isPurchasable === right.isPurchasable &&
    left.price?.amount === right.price?.amount &&
    left.price?.currency === right.price?.currency &&
    left.stepQuantity === right.stepQuantity
  );
}

function isLockedForMember(row: DerivedTicketSelectorRow, lockedSessionTypeIds: ReadonlySet<number>): boolean {
  return !row.hasSeating && row.sessionTypeId !== null && lockedSessionTypeIds.has(row.sessionTypeId);
}

function parentTileIndexOf(tileKey: string): number | null {
  if (!tileKey.startsWith(PARENT_TILE_KEY_PREFIX)) {
    return null;
  }

  const index = Number(tileKey.slice(PARENT_TILE_KEY_PREFIX.length));

  return Number.isInteger(index) ? index : null;
}

function tabKeyOf(descriptor: PosTabDescriptor): string {
  return descriptor.kind === 'custom' ? `${CUSTOM_TAB_KEY_PREFIX}${descriptor.setupId ?? ''}` : descriptor.kind;
}

function toLibMoney(price: TicketSelectorCatalogPrice | null): Money | null {
  return price === null ? null : { amount: String(price.amount), currency: price.currency };
}
