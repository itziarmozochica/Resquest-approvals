import { computed, inject } from '@angular/core';

import { patchState, signalStoreFeature, withComputed, withMethods, withProps, type PartialStateUpdater } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, updateAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, mergeMap, pipe, tap } from 'rxjs';

import type { CustomTabHierarchyLevel } from '../../models/custom-tabs/custom-tab-hierarchy.model';
import type { CustomTabForDateQuery } from '../../models/custom-tabs/custom-tabs-query.model';
import type { CustomTile } from '../../models/custom-tabs/custom-tile.model';
import { customTabConfig, type CustomTabsStoreState, type CustomTabState } from '../../models/custom-tabs/store/custom-tabs-store.model';
import { TicketingCustomTabsService } from '../../services/custom-tabs/custom-tabs.service';
import { buildCustomTabHierarchy } from '../../utils/custom-tabs/build-custom-tab-hierarchy.util';

export interface CustomTabSetup {
  datetime: string;
  setupId: string;
}

export interface FetchCustomTabParams {
  query: CustomTabForDateQuery;
  setupId: string;
}

type CustomTabRequestState = Pick<CustomTabState, 'error' | 'isLoading' | 'tiles'>;

function setCustomTabPending(): CustomTabRequestState {
  return { error: null, isLoading: true, tiles: null };
}

function setCustomTabSuccess(tiles: readonly CustomTile[]): CustomTabRequestState {
  return { error: null, isLoading: false, tiles };
}

function setCustomTabError(error: unknown): CustomTabRequestState {
  return { error, isLoading: false, tiles: null };
}

function updateCustomTab(setupId: string, changes: Partial<CustomTabState>): PartialStateUpdater<CustomTabsStoreState> {
  return updateEntity<'customTab', CustomTabsStoreState>({ changes, id: setupId }, customTabConfig);
}

function updateAllCustomTabs(changes: Partial<CustomTabState>): PartialStateUpdater<CustomTabsStoreState> {
  return updateAllEntities<'customTab', CustomTabsStoreState>(changes, customTabConfig);
}

const customTabsFeature = signalStoreFeature(
  withEntities(customTabConfig),
  withProps(() => ({
    customTabGenerations: new Map<string, number>(),
    customTabHierarchyCache: new WeakMap<readonly CustomTile[], CustomTabHierarchyLevel>(),
  })),
  withComputed(({ customTabEntities, customTabHierarchyCache }) => ({
    customTabHasTiles: computed<Record<string, boolean>>(() =>
      Object.fromEntries(customTabEntities().map(customTab => [customTab.setupId, customTab.tiles !== null])),
    ),
    customTabHierarchies: computed<Record<string, CustomTabHierarchyLevel | null>>(() =>
      Object.fromEntries(
        customTabEntities().map(customTab => [customTab.setupId, memoizedHierarchy(customTabHierarchyCache, customTab.tiles)]),
      ),
    ),
  })),
  withMethods((store, customTabsService = inject(TicketingCustomTabsService)) => {
    const generations = store.customTabGenerations;

    function startGeneration(setupId: string): number {
      const generation = (generations.get(setupId) ?? 0) + 1;
      generations.set(setupId, generation);

      return generation;
    }

    function isStale(setupId: string, startedAt: number): boolean {
      return generations.get(setupId) !== startedAt;
    }

    function disownInFlight(setupId: string | null): void {
      if (setupId !== null) {
        startGeneration(setupId);

        return;
      }

      for (const [inFlightSetupId] of generations) {
        startGeneration(inFlightSetupId);
      }
    }

    return {
      clearCustomTabs(): void {
        disownInFlight(null);
        patchState(store, removeAllEntities(customTabConfig));
      },
      fetchCustomTab: rxMethod<FetchCustomTabParams>(
        pipe(
          mergeMap(({ query, setupId }: FetchCustomTabParams) => {
            const startedAt = startGeneration(setupId);

            patchState(store, updateCustomTab(setupId, setCustomTabPending()));

            return customTabsService.getCustomTabForDate(query).pipe(
              tap((tiles: readonly CustomTile[]) => {
                if (isStale(setupId, startedAt)) {
                  return;
                }

                patchState(store, updateCustomTab(setupId, setCustomTabSuccess(tiles)));
              }),
              catchError((error: unknown) => {
                if (!isStale(setupId, startedAt)) {
                  patchState(store, updateCustomTab(setupId, setCustomTabError(error)));
                }

                return EMPTY;
              }),
            );
          }),
        ),
      ),
      initCustomTabs(setups: readonly CustomTabSetup[]): void {
        disownInFlight(null);
        patchState(
          store,
          setAllEntities(
            setups.map(setup => ({ datetimeSelected: setup.datetime, setupId: setup.setupId, ...setCustomTabPending() })),
            customTabConfig,
          ),
        );
      },
      setCustomTabDatetime(setupId: string | null, datetime: string): void {
        disownInFlight(setupId);

        if (setupId === null) {
          patchState(store, updateAllCustomTabs({ datetimeSelected: datetime, ...setCustomTabPending() }));

          return;
        }

        patchState(store, updateCustomTab(setupId, { datetimeSelected: datetime, ...setCustomTabPending() }));
      },
    };
  }),
);

function memoizedHierarchy(
  cache: WeakMap<readonly CustomTile[], CustomTabHierarchyLevel>,
  tiles: readonly CustomTile[] | null,
): CustomTabHierarchyLevel | null {
  if (tiles === null) {
    return null;
  }

  const cached = cache.get(tiles);
  if (cached !== undefined) {
    return cached;
  }

  const hierarchy = buildCustomTabHierarchy(tiles);
  if (hierarchy === null) {
    return null;
  }

  cache.set(tiles, hierarchy);

  return hierarchy;
}

export type WithCustomTabsStoreFeature = typeof customTabsFeature;

export function withCustomTabsStoreFeature(): WithCustomTabsStoreFeature {
  return customTabsFeature;
}
