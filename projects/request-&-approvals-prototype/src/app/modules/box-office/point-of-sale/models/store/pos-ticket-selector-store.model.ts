import type { EntityId } from '@ngrx/signals/entities';

import { OssTab } from '../../../one-stop-shop/models';

export type PosTabKind = 'custom' | 'party-members' | 'seating' | 'tickets';

export interface PosTabDescriptor {
  kind: PosTabKind;
  setupId: string | null;
}

export interface PosActiveTab {
  index: number;
  kind: PosTabKind;
  setupId: string | null;
}

export type PosCustomTabPaths = Readonly<Record<string, readonly number[]>>;

export interface PosTicketSelectorStoreState {
  availableTabs: readonly PosTabDescriptor[];
  seatingTabAutoNavigated: boolean;
}

export const initialState: PosTicketSelectorStoreState = {
  availableTabs: [{ kind: 'tickets', setupId: null }],
  seatingTabAutoNavigated: false,
};

export function toOssTab(kind: PosTabKind): OssTab {
  switch (kind) {
    case 'custom':
      return OssTab.CUSTOM_TABS;
    case 'seating':
      return OssTab.SEATING;
    default:
      return OssTab.TICKETS_AND_ADDONS;
  }
}

export function toPosTabKind(tab: OssTab): PosTabKind {
  switch (tab) {
    case OssTab.CUSTOM_TABS:
      return 'custom';
    case OssTab.SEATING:
      return 'seating';
    default:
      return 'tickets';
  }
}

export function areTabDescriptorsEqual(first: readonly PosTabDescriptor[], second: readonly PosTabDescriptor[]): boolean {
  return (
    first.length === second.length &&
    first.every((tab: PosTabDescriptor, index: number) => tab.kind === second[index].kind && tab.setupId === second[index].setupId)
  );
}

export function toActiveTab(tabs: readonly PosTabDescriptor[], index: number): PosActiveTab {
  const tab = tabs[index];

  if (tab === undefined) {
    return { index: 0, kind: tabs[0]?.kind ?? 'tickets', setupId: tabs[0]?.setupId ?? null };
  }

  return { index, kind: tab.kind, setupId: tab.setupId };
}

export function customTabIndexOf(customTabIds: readonly EntityId[], activeTab: PosActiveTab): number {
  const position = customTabIds.findIndex((setupId: EntityId) => String(setupId) === activeTab.setupId);

  return position === -1 ? 0 : position;
}

export function keepActiveTab(tabs: readonly PosTabDescriptor[], previous: { value: PosActiveTab } | undefined): PosActiveTab {
  const index = previous === undefined ? -1 : tabs.findIndex((tab: PosTabDescriptor) => tab.kind === previous.value.kind);

  return toActiveTab(tabs, index === -1 ? 0 : index);
}

export interface PosCustomTabPathsSource {
  tabs: Readonly<Record<string, { tiles: unknown }>>;
}

export function keepPathsForUnchangedTiles(
  source: PosCustomTabPathsSource,
  previous: { source: PosCustomTabPathsSource; value: PosCustomTabPaths } | undefined,
): PosCustomTabPaths {
  return Object.fromEntries(
    Object.keys(source.tabs).map((setupId: string): [string, readonly number[]] => {
      const hasSameTiles = previous?.source.tabs[setupId]?.tiles === source.tabs[setupId].tiles;

      return [setupId, hasSameTiles ? (previous?.value[setupId] ?? []) : []];
    }),
  );
}

export interface PosVisitedCustomTabsSource {
  activeTab: PosActiveTab;
  customTabIds: readonly EntityId[];
}

export function rememberVisitedCustomTabs(
  source: PosVisitedCustomTabsSource,
  previous: { value: readonly string[] } | undefined,
): readonly string[] {
  if (source.customTabIds.length === 0) {
    return [];
  }

  const known = new Set(source.customTabIds.map((setupId: EntityId) => String(setupId)));
  const visited = (previous?.value ?? []).filter((setupId: string) => known.has(setupId));
  const activeSetupId = source.activeTab.kind === 'custom' ? source.activeTab.setupId : null;

  if (activeSetupId === null || visited.includes(activeSetupId)) {
    return visited;
  }

  return [...visited, activeSetupId];
}
