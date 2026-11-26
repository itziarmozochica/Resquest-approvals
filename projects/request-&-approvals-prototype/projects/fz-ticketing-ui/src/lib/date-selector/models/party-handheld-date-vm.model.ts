import type { FztDateSelectorSkeletonVm } from './date-selector-vm.model';
import type { FztPartyDatePickerVm, FztPartyHourPillsVm } from './party-date-panel-vm.model';

export type FztPartyHandheldDateChipKey = 'selectADate' | 'today' | 'tomorrow';

export type FztPartyHandheldSellingForKind = 'date' | 'today' | 'tomorrow';

export interface FztPartyHandheldDateChipVm {
  readonly dateIso: string | null;
  /** The dates calendar starts after this day: a tap resets the window instead of picking in it. */
  readonly isBeforeWindow: boolean;
  readonly isEnabled: boolean;
  readonly isSelected: boolean;
  readonly key: FztPartyHandheldDateChipKey;
}

export interface FztPartyHandheldSellingForVm {
  readonly dateLabel: string;
  readonly kind: FztPartyHandheldSellingForKind;
}

export type FztPartyHandheldDateSkeletonVm = Pick<FztDateSelectorSkeletonVm, 'dates' | 'sessions'>;

export interface FztPartyHandheldDateSectionVm {
  readonly chips: readonly FztPartyHandheldDateChipVm[];
  readonly datePicker: FztPartyDatePickerVm;
  readonly hourTiles: FztPartyHourPillsVm;
  readonly sellingFor: FztPartyHandheldSellingForVm;
  readonly skeleton: FztPartyHandheldDateSkeletonVm;
}
