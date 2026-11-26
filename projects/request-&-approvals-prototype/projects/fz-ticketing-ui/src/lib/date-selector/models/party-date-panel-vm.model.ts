import type { FztDatePillsRowVm, FztDateSelectorSkeletonVm } from './date-selector-vm.model';

export interface FztPartyDatePickerVm {
  readonly minDate: Date | null;
  readonly startDate: string | null;
  readonly timezone: string;
}

export interface FztPartyStartTimePillVm {
  readonly datetimeKey: string;
  readonly isSelected: boolean;
  readonly timeLabel: string;
}

export type FztTimePillsRowLayout = 'grid' | 'row';

export interface FztPartyHourPillsVm {
  readonly isNowSelected: boolean;
  readonly showNow: boolean;
  readonly startTimes: readonly FztPartyStartTimePillVm[];
}

export interface FztPartyMemberCounterVm {
  readonly canDecrease: boolean;
  readonly key: string;
  readonly name: string;
  readonly quantity: number;
}

export interface FztPartyMemberQuantityChange {
  readonly memberKey: string;
  readonly quantity: number;
}

export interface FztPartyDatePanelSkeletonVm extends FztDateSelectorSkeletonVm {
  readonly members: boolean;
}

export interface FztPartyDatePanelVm extends FztDatePillsRowVm {
  readonly datePicker: FztPartyDatePickerVm;
  readonly hourPills: FztPartyHourPillsVm;
  readonly members: readonly FztPartyMemberCounterVm[];
  readonly skeleton: FztPartyDatePanelSkeletonVm;
}
