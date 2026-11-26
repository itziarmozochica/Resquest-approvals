import { SessionSelectorType, type DateAvailability, type DaySummary, type TimeslotSummary } from '@fz/ticketing';

import type { FztDayPartHoursCaptionKey } from '../models/date-selector-translations.model';
import type { FztDatePillVm, FztDateSelectorVm, FztDayPartVm, FztLoadingHoursVm, FztTimeslotVm } from '../models/date-selector-vm.model';
import type { FztTimeRangeGroupingMode, FztTimeRangeSection } from '../models/time-range-section.model';
import { formatDatePillDayLabel, formatDatePillWeekdayLabel, formatTimeslotTimeLabel } from './date-selector-labels.util';
import { bucketizeTimeslots } from './time-range-section.util';
import { isDaySummaryAvailable, isTimeslotExpired, isTimeslotSelectable, type FztAvailabilityParams } from './timeslot-availability.util';

const HOURS_CAPTION_BY_SECTION: Readonly<Record<FztTimeRangeSection, FztDayPartHoursCaptionKey>> = {
  afternoon: 'afternoonHours',
  evening: 'eveningHours',
  morning: 'morningHours',
  night: 'nightHours',
};

export interface FztDatePillsVmParams {
  readonly availability: FztAvailabilityParams;
  readonly dates: readonly DateAvailability[];
  readonly daySummaries: readonly DaySummary[];
  readonly locale: string;
  readonly selectedDate: string | null;
  readonly timeZone: string;
}

export interface FztDayPartsVmParams {
  readonly availability: FztAvailabilityParams;
  readonly daySummary: DaySummary | null;
  readonly groupingMode: FztTimeRangeGroupingMode;
  readonly includeCapacity: boolean;
  readonly selectedDatetime: string | null;
  readonly timeZone: string;
}

export interface FztDateSelectorVmParams extends FztDatePillsVmParams {
  readonly daySummary: DaySummary | null;
  readonly fromDate: string | null;
  readonly groupingMode: FztTimeRangeGroupingMode;
  /** False until the host's fetch settles (success, empty or error) — skeletons stay up, never the empty state. */
  readonly hasFetchSettled: boolean;
  readonly includeCapacity: boolean;
  readonly isLoadingDates: boolean;
  readonly isLoadingSessions: boolean;
  readonly loadingHours: FztLoadingHoursVm;
  readonly selectedDatetime: string | null;
  readonly sessionSelectorType: SessionSelectorType | null;
  readonly showFromDateRow: boolean;
  readonly showLoadMore: boolean;
}

/** Date pills come from the calendar leg when it has dates, and fall back to the fetched day summaries. */
export function buildDatePillsVm(params: FztDatePillsVmParams): readonly FztDatePillVm[] {
  if (params.dates.length > 0) {
    return params.dates.map(date => buildDatePillVm(date.date, !date.isPurchasable, params));
  }

  return params.daySummaries.map(daySummary =>
    buildDatePillVm(daySummary.date, !isDaySummaryAvailable(daySummary, params.availability), params),
  );
}

export function buildDayPartsVm(params: FztDayPartsVmParams): readonly FztDayPartVm[] {
  const daySummary = params.daySummary;

  if (daySummary === null) {
    return [];
  }

  // An open selector outlives the fetch, so slots that expired since then are dropped like the backend would.
  const purchasableTimeslots = daySummary.timeslots.filter(timeslot => !isTimeslotExpired(timeslot, params.availability));
  const buckets = bucketizeTimeslots(purchasableTimeslots, params.timeZone, params.groupingMode);

  return [...buckets].map(([section, timeslots]) => ({
    containsSelection: containsSelection(timeslots, params.selectedDatetime),
    hoursCaption: params.groupingMode === 'operatingDay' ? null : HOURS_CAPTION_BY_SECTION[section],
    section,
    timeslots: timeslots.map(timeslot => buildTimeslotVm(timeslot, params)),
  }));
}

export function buildDateSelectorVm(params: FztDateSelectorVmParams): FztDateSelectorVm {
  const datePills = buildDatePillsVm(params);
  const dayParts = buildDayPartsVm(params);
  // An unsettled fetch keeps the skeletons up: the data slices clear before the loading flags flip
  // (and before the very first fetch even starts), and that in-between frame must never read as
  // "no sessions available".
  const awaitingFetch = !params.hasFetchSettled;

  return {
    datePills,
    dayParts,
    fromDateRow: { startDate: params.fromDate, timezone: params.timeZone, visible: params.showFromDateRow },
    loadingHours: params.loadingHours,
    loadMore: { isLoading: params.isLoadingDates, isVisible: params.showLoadMore },
    selectedDatetimeKey: params.selectedDatetime,
    showDatesRow: datePills.length > 0,
    // A selected day whose fetched summary carries zero timeslots must land on the empty state too,
    // not on a blank hours region — so the hours section stays off when there are no day parts to render.
    showEmptyState: params.hasFetchSettled && (params.daySummary === null ? params.daySummaries.length === 0 : dayParts.length === 0),
    showHoursSection: dayParts.length > 0 && params.sessionSelectorType !== SessionSelectorType.Session,
    skeleton: {
      availability: params.isLoadingDates || awaitingFetch,
      dates: params.isLoadingDates || params.isLoadingSessions || awaitingFetch,
      sessions: params.isLoadingSessions || awaitingFetch,
    },
  };
}

function buildDatePillVm(date: string, isDisabled: boolean, params: FztDatePillsVmParams): FztDatePillVm {
  return {
    dateKey: date,
    dayLabel: formatDatePillDayLabel(date, params.locale, params.timeZone),
    isDisabled,
    isSelected: date === params.selectedDate,
    weekdayLabel: formatDatePillWeekdayLabel(date, params.locale, params.timeZone),
  };
}

function buildTimeslotVm(timeslot: TimeslotSummary, params: FztDayPartsVmParams): FztTimeslotVm {
  const isSelectable = isTimeslotSelectable(timeslot, params.availability);

  return {
    capacity: timeslot.capacity,
    datetimeKey: timeslot.datetime,
    isDisabled: !isSelectable,
    isSelected: isSelectable && timeslot.datetime === params.selectedDatetime,
    // A null capacity keeps the caption (bare ticket icon): legacy coerces null to undefined before
    // its `!== null` template check, so the caption shows whenever the host includes capacity. See AGENTS.md.
    showCapacity: params.includeCapacity,
    timeLabel: formatTimeslotTimeLabel(timeslot.datetime, params.timeZone),
  };
}

function containsSelection(timeslots: readonly TimeslotSummary[], selectedDatetime: string | null): boolean {
  return selectedDatetime !== null && timeslots.some(timeslot => timeslot.datetime === selectedDatetime);
}
