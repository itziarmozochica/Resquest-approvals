import type { FztDayPartHoursCaptionKey } from './date-selector-translations.model';
import type { FztTimeRangeSection } from './time-range-section.model';

export interface FztDatePillVm {
  readonly dateKey: string;
  readonly dayLabel: string;
  readonly isDisabled: boolean;
  readonly isSelected: boolean;
  readonly weekdayLabel: string;
}

export interface FztTimeslotVm {
  readonly capacity: number | null;
  readonly datetimeKey: string;
  readonly isDisabled: boolean;
  readonly isSelected: boolean;
  readonly showCapacity: boolean;
  readonly timeLabel: string;
}

export interface FztDayPartVm {
  readonly containsSelection: boolean;
  readonly hoursCaption: FztDayPartHoursCaptionKey | null;
  readonly section: FztTimeRangeSection;
  readonly timeslots: readonly FztTimeslotVm[];
}

export interface FztFromDateRowVm {
  readonly startDate: string | null;
  readonly timezone: string;
  readonly visible: boolean;
}

export interface FztLoadMoreVm {
  readonly isLoading: boolean;
  readonly isVisible: boolean;
}

/** Hours the host is still loading around the ones already rendered, shown as skeleton tiles on that side. */
export interface FztLoadingHoursVm {
  readonly after: boolean;
  readonly before: boolean;
}

export interface FztDateSelectorSkeletonVm {
  readonly availability: boolean;
  readonly dates: boolean;
  readonly sessions: boolean;
}

export interface FztDateSelectorVm {
  readonly datePills: readonly FztDatePillVm[];
  readonly dayParts: readonly FztDayPartVm[];
  readonly fromDateRow: FztFromDateRowVm;
  readonly loadingHours: FztLoadingHoursVm;
  readonly loadMore: FztLoadMoreVm;
  readonly selectedDatetimeKey: string | null;
  readonly showDatesRow: boolean;
  readonly showEmptyState: boolean;
  readonly showHoursSection: boolean;
  readonly skeleton: FztDateSelectorSkeletonVm;
}

export type FztDatePillsRowVm = Pick<FztDateSelectorVm, 'datePills' | 'loadMore' | 'showDatesRow'>;

export interface FztSectionToggle {
  readonly open: boolean;
  readonly section: FztTimeRangeSection;
}
