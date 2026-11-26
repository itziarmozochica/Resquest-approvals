import { computed, inject, Injector, linkedSignal, untracked } from '@angular/core';

import { withCustomTabsStoreFeature, type CustomTabState, type CustomTile, type Session } from '@fz/ticketing';
import { patchState, signalStore, withComputed, withLinkedState, withMethods, withState } from '@ngrx/signals';

import {
  areTabDescriptorsEqual,
  initialState,
  keepActiveTab,
  keepPathsForUnchangedTiles,
  rememberVisitedCustomTabs,
  toActiveTab,
  type PosActiveTab,
  type PosCustomTabPaths,
  type PosCustomTabPathsSource,
  type PosTabDescriptor,
  type PosTicketSelectorStoreState,
  type PosVisitedCustomTabsSource,
} from '../models/store/pos-ticket-selector-store.model';
import { type DerivedTicketSelectorRow } from '../models/ticket-selector-catalog-item.model';
import { POS_TICKET_SELECTOR_CATALOG_SOURCE } from '../tokens/pos-ticket-selector-catalog-source.token';
import { deriveSeatlessSessionTypeIds, deriveTicketSelectorCatalog } from '../utils/derive-ticket-selector-catalog.util';
import { applyFlexibleBundleCatalogOverlay } from '../utils/flexible-bundle-session-prices.util';
import { withPosPartyMembersFeature } from './pos-party-members.feature';

export const PosTicketSelectorStore = signalStore(
  // FIRST on purpose: the feature's `customTab` entity collection flattens onto the store, and the
  // linked state below derives from `customTabEntityMap`.
  withCustomTabsStoreFeature(),
  withState<PosTicketSelectorStoreState>(initialState),
  withLinkedState(({ availableTabs, customTabEntityMap, customTabIds }) => {
    const activeTab = linkedSignal<readonly PosTabDescriptor[], PosActiveTab>({
      computation: keepActiveTab,
      source: availableTabs,
    });

    return {
      activeTab,
      // A tab keeps its breadcrumb path across tab switches, as the legacy hierarchy did; only a
      // tiles reload sends it back to the root.
      customTabPaths: linkedSignal<PosCustomTabPathsSource, PosCustomTabPaths>({
        computation: keepPathsForUnchangedTiles,
        source: computed(() => ({ tabs: customTabEntityMap() })),
      }),
      // Legacy folded a custom tab's sessions into the ticket rows the first time that tab was open,
      // so the derived catalog remembers which tabs have been opened; an empty collection forgets them.
      visitedCustomTabIds: linkedSignal<PosVisitedCustomTabsSource, readonly string[]>({
        computation: rememberVisitedCustomTabs,
        source: computed(() => ({ activeTab: activeTab(), customTabIds: customTabIds() })),
      }),
    };
  }),
  withComputed(({ activeTab, customTabEntities, visitedCustomTabIds }) => {
    // Resolved on first read, not at construction: the source is provided beside the store and reads
    // legacy state that itself injects this store.
    const injector = inject(Injector);
    const catalog = computed<readonly DerivedTicketSelectorRow[]>(() => {
      const source = injector.get(POS_TICKET_SELECTOR_CATALOG_SOURCE)();
      const derived = deriveTicketSelectorCatalog({
        ...source,
        customTileSessions: customTabEntities()
          .filter((customTab: CustomTabState) => visitedCustomTabIds().includes(customTab.setupId))
          .flatMap((customTab: CustomTabState) => (customTab.tiles ?? []).flatMap((tile: CustomTile): readonly Session[] => tile.sessions)),
      });

      return applyFlexibleBundleCatalogOverlay(derived, source.flexibleBundlePricing);
    });

    return {
      activeCustomTabSetupId: computed<string | null>(() => (activeTab().kind === 'custom' ? activeTab().setupId : null)),
      activeTabIndex: computed<number>(() => activeTab().index),
      // The add-ons tab of a free seating map: add-ons and seatless sessions; ongoing rows are not
      // filtered, exactly as the legacy ongoing groups bypassed `getTicketTypesForAddonsTab`.
      addonsTabCatalog: computed<readonly DerivedTicketSelectorRow[]>(() =>
        catalog().filter((row: DerivedTicketSelectorRow) => row.isOngoing || row.isAddon || !row.hasSeating),
      ),
      catalog,
      seatlessSessionTypeIdsAcrossAvailability: computed<ReadonlySet<number>>(() =>
        deriveSeatlessSessionTypeIds(injector.get(POS_TICKET_SELECTOR_CATALOG_SOURCE)().orderedDaySummaries),
      ),
    };
  }),
  withMethods(store => ({
    activateSeatingTabIfAvailable(): void {
      const tabs = untracked(store.availableTabs);
      const seatingTabIndex = tabs.findIndex((tab: PosTabDescriptor) => tab.kind === 'seating');

      if (seatingTabIndex === -1 || untracked(store.seatingTabAutoNavigated)) {
        return;
      }

      patchState(store, {
        activeTab: toActiveTab(tabs, seatingTabIndex),
        seatingTabAutoNavigated: true,
      });
    },
    activatePartyMembersTabIfAvailable(): void {
      const tabs = untracked(store.availableTabs);
      const partyTabIndex = tabs.findIndex((tab: PosTabDescriptor) => tab.kind === 'party-members');
      const activeKind = untracked(store.activeTab).kind;
      const isActiveTabListed = tabs.some((tab: PosTabDescriptor) => tab.kind === activeKind);

      if (partyTabIndex === -1 || (untracked(store.seatingTabAutoNavigated) && isActiveTabListed)) {
        return;
      }

      patchState(store, {
        activeTab: toActiveTab(tabs, partyTabIndex),
        seatingTabAutoNavigated: true,
      });
    },
    navigateCustomTab(setupId: string, path: readonly number[]): void {
      patchState(store, { customTabPaths: { ...untracked(store.customTabPaths), [setupId]: path } });
    },
    resetActiveTab(): void {
      patchState(store, { activeTab: { index: 0, kind: 'tickets', setupId: null } });
    },
    resetSeatingTabAutoNavigation(): void {
      patchState(store, { seatingTabAutoNavigated: false });
    },
    selectTab(index: number): void {
      patchState(store, { activeTab: toActiveTab(untracked(store.availableTabs), index) });
    },
    setAvailableTabs(tabs: readonly PosTabDescriptor[]): void {
      // A structurally equal list must not reach the `activeTab` source: `updateTicketTypeFields()`
      // recomputes the tab rule on every counter change, and the first-of-kind re-index would then
      // snap a second custom tab back to the first one.
      if (areTabDescriptorsEqual(untracked(store.availableTabs), tabs)) {
        return;
      }

      patchState(store, { availableTabs: tabs });
    },
  })),
  withPosPartyMembersFeature(),
);
