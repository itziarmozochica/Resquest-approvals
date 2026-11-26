import type { PartyFit } from '@fz/ticketing';

export interface FztPartyStartTimeVm {
  readonly fit: PartyFit;
  readonly isDisabled: boolean;
  readonly key: string;
  readonly timeLabel: string;
  readonly unitsAvailable: number | null;
}

export interface FztPartyTileVm {
  readonly key: string;
  readonly name: string;
  readonly startTimes: readonly FztPartyStartTimeVm[];
}

export type FztPartyTileGridState = 'awaiting-party' | 'no-activities' | 'skeleton' | 'tiles';

export interface FztPartyTileGridVm {
  readonly navigationKey: string;
  readonly state: FztPartyTileGridState;
  readonly tiles: readonly FztPartyTileVm[];
}

export interface FztCategoryChipVm {
  readonly category: string;
  readonly isDisabled: boolean;
  readonly isSelected: boolean;
  readonly key: string;
}

export interface FztPartyColumnVm {
  readonly categoryChips: readonly FztCategoryChipVm[];
  readonly grid: FztPartyTileGridVm;
  readonly showTaxesIncluded: boolean;
}

export interface FztPartyStartTimeTapIntent {
  readonly fit: PartyFit;
  readonly leafKey: string;
  readonly leafName: string;
}
