import type { IconProp } from '@fortawesome/fontawesome-svg-core';

import type { FztPartyColumnVm } from './party-ticket-column-vm.model';
import type { FztTabLabelKey } from './ticket-selector-translations.model';

export type FztTabKind = 'custom' | 'party-members' | 'seating' | 'tickets';

export type FztTicketsSectionFrame = 'loading' | 'placeholder' | 'ready';

export type FztTileCategory = 'addon' | 'food_and_beverage' | 'membership' | 'product' | 'session';

export type FztTileKind = 'leaf' | 'parent';

export type FztTileSectionKind = 'addons' | 'hidden' | 'tickets';

export type FztTileVariant = 'default' | 'large';

export type FztTileGridTestId = 'oss-ticket-selector' | null;

export interface FztMultiDayRange {
  readonly endsAt: string;
  readonly locale: string;
  readonly startsAt: string;
  readonly timeZone: string;
}

export interface FztTileVm {
  readonly category: FztTileCategory;
  readonly customColor: string | null;
  readonly isHidden: boolean;
  readonly isMultiDay: boolean;
  readonly isOngoing: boolean;
  readonly isOutOfStock: boolean;
  readonly isUnavailable: boolean;
  readonly key: string;
  readonly kind: FztTileKind;
  readonly multiDayRange: FztMultiDayRange | null;
  readonly name: string;
  readonly priceLabel: string | null;
  readonly priceWithDiscountLabel: string | null;
  readonly renderKey: string;
  readonly sessionId: number | null;
  readonly showWarning: boolean;
  readonly unitsAvailable: number | null;
  readonly variant: FztTileVariant;
}

export interface FztTileSectionVm {
  readonly kind: FztTileSectionKind;
  readonly tiles: readonly FztTileVm[];
}

export interface FztExplodeLevelItemVm {
  readonly isDisabled: boolean;
  readonly isSelected: boolean;
  readonly key: string;
  readonly name: string;
  readonly path: readonly string[];
}

export interface FztExplodeLevelRowVm {
  readonly items: readonly FztExplodeLevelItemVm[];
  readonly key: string;
}

export interface FztBreadcrumbVm {
  readonly depth: number;
  readonly isCurrentLevel: boolean;
  readonly name: string;
}

export interface FztTileGridVm {
  readonly breadcrumbs: readonly FztBreadcrumbVm[];
  readonly firstTileTourAnchorId: string;
  readonly levels: readonly FztExplodeLevelRowVm[];
  readonly navigationKey: string;
  readonly sections: readonly FztTileSectionVm[];
  readonly showTaxesIncluded: boolean;
  readonly skeleton: boolean;
  readonly testId: FztTileGridTestId;
}

export type FztPagedTileGridChild =
  | { readonly key: string; readonly kind: 'hidden'; readonly tiles: readonly FztTileVm[] }
  | { readonly key: string; readonly kind: 'tile'; readonly tile: FztTileVm };

export interface FztTicketsSectionVm {
  readonly frame: FztTicketsSectionFrame;
  readonly grid: FztTileGridVm | null;
  readonly kind: FztTabKind;
  readonly party: FztPartyColumnVm | null;
  readonly showDateSelectorSlot: boolean;
}

export interface FztTabVm {
  readonly icon: IconProp;
  readonly key: string;
  readonly kind: FztTabKind;
  readonly testId: string;
  readonly customTabSetupId?: number;
  readonly label?: string;
  readonly labelKey?: FztTabLabelKey;
}

export interface FztTicketSelectorVm {
  readonly hideTabHeader: boolean;
  readonly keepAlive: boolean;
  readonly sections: Readonly<Record<string, FztTicketsSectionVm>>;
  readonly selectedTabIndex: number;
  readonly tabs: readonly FztTabVm[];
  readonly tabsTourAnchorId: string;
}

export interface FztTileAddIntent {
  readonly sessionId: number;
  readonly tabKey: string;
}

export interface FztBreadcrumbNavigationIntent {
  readonly depth: number;
  readonly tabKey: string;
}

export interface FztTileTapPayload {
  readonly category: FztTileCategory;
  readonly tileKey: string;
  readonly tileKind: FztTileKind;
}

export interface FztTileTapIntent extends FztTileTapPayload {
  readonly tabKey: string;
}
