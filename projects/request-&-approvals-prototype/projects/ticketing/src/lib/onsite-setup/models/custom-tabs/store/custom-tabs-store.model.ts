import { type } from '@ngrx/signals';
import { entityConfig, type NamedEntityState } from '@ngrx/signals/entities';

import type { CustomTile } from '../custom-tile.model';

export interface CustomTabState {
  datetimeSelected: string;
  error: unknown;
  isLoading: boolean;
  setupId: string;
  tiles: readonly CustomTile[] | null;
}

export const customTabConfig = entityConfig({
  collection: 'customTab',
  entity: type<CustomTabState>(),
  selectId: (customTab: CustomTabState): string => customTab.setupId,
});

export type CustomTabsStoreState = NamedEntityState<CustomTabState, 'customTab'>;
