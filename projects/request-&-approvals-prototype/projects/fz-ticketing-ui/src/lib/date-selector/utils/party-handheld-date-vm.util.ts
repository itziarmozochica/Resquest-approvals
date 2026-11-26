import { calendarDayToUtcMs, toCalendarDay, type CalendarDay, type DateAvailability, type DaySummary } from '@fz/ticketing';

import type {
  FztPartyHandheldDateChipKey,
  FztPartyHandheldDateChipVm,
  FztPartyHandheldDateSectionVm,
  FztPartyHandheldSellingForVm,
} from '../models/party-handheld-date-vm.model';
import { formatDatePillDayLabel } from './date-selector-labels.util';
import { buildPartyHourPillsVm, venueTodayAsLocalDate } from './party-date-panel-vm.util';

export interface FztPartyHandheldDateVmParams {
  readonly dates: readonly DateAvailability[];
  readonly daySummary: DaySummary | null;
  readonly fromDate: string | null;
  readonly hasFetchSettled: boolean;
  readonly hourFilter: string | null;
  readonly isLoadingDates: boolean;
  readonly isLoadingSessions: boolean;
  readonly locale: string;
  readonly searchedAt: number;
  readonly selectedDate: string | null;
  readonly timeZone: string;
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length;

export function buildPartyHandheldDateVm(params: FztPartyHandheldDateVmParams): FztPartyHandheldDateSectionVm {
  const today = toCalendarDay(params.searchedAt, params.timeZone);
  const todayIso = today === null ? null : calendarDayToIso(today);
  const tomorrowIso = today === null ? null : calendarDayToIso(addCalendarDays(today, 1));
  const awaitingFetch = !params.hasFetchSettled;
  const isTodaySelected = todayIso !== null && params.selectedDate === todayIso;
  const isTomorrowSelected = tomorrowIso !== null && params.selectedDate === tomorrowIso;

  return {
    chips: [
      buildDayChip('today', todayIso, isTodaySelected, params),
      buildDayChip('tomorrow', tomorrowIso, isTomorrowSelected, params),
      {
        dateIso: null,
        isBeforeWindow: false,
        isEnabled: true,
        isSelected: params.selectedDate !== null && !isTodaySelected && !isTomorrowSelected,
        key: 'selectADate',
      },
    ],
    datePicker: {
      minDate: venueTodayAsLocalDate(params.searchedAt, params.timeZone),
      startDate: params.fromDate,
      timezone: params.timeZone,
    },
    hourTiles: buildPartyHourPillsVm(params),
    sellingFor: buildSellingForVm(isTodaySelected, isTomorrowSelected, params),
    skeleton: {
      dates: params.isLoadingDates || awaitingFetch,
      sessions: params.isLoadingSessions || awaitingFetch,
    },
  };
}

function buildDayChip(
  key: FztPartyHandheldDateChipKey,
  dateIso: string | null,
  isSelected: boolean,
  params: FztPartyHandheldDateVmParams,
): FztPartyHandheldDateChipVm {
  if (dateIso === null) {
    return { dateIso, isBeforeWindow: false, isEnabled: false, isSelected, key };
  }

  const isBeforeWindow = isDayBeforeWindow(dateIso, params);

  return { dateIso, isBeforeWindow, isEnabled: isBeforeWindow || isDayOffered(dateIso, params), isSelected, key };
}

/**
 * The picker moved the dates calendar past this day, so the calendar cannot say whether it sells.
 * The from-date may carry a wall-clock time, so only its calendar day is compared.
 */
function isDayBeforeWindow(dateIso: string, params: FztPartyHandheldDateVmParams): boolean {
  return params.fromDate !== null && dateIso < params.fromDate.slice(0, ISO_DATE_LENGTH);
}

/** The calendar leg decides when it has dates; before it answers, the fetched day is the only day known. */
function isDayOffered(dateIso: string, params: FztPartyHandheldDateVmParams): boolean {
  if (params.dates.length > 0) {
    return params.dates.some((date: DateAvailability) => date.date === dateIso && date.isPurchasable);
  }

  return params.daySummary?.date === dateIso;
}

function buildSellingForVm(
  isTodaySelected: boolean,
  isTomorrowSelected: boolean,
  params: FztPartyHandheldDateVmParams,
): FztPartyHandheldSellingForVm {
  if (isTodaySelected) {
    return { dateLabel: '', kind: 'today' };
  }

  if (isTomorrowSelected) {
    return { dateLabel: '', kind: 'tomorrow' };
  }

  return {
    dateLabel: params.selectedDate === null ? '' : formatDatePillDayLabel(params.selectedDate, params.locale, params.timeZone),
    kind: 'date',
  };
}

function addCalendarDays(day: CalendarDay, days: number): CalendarDay {
  const shifted = new Date(calendarDayToUtcMs(day) + days * MILLISECONDS_PER_DAY);

  return { day: shifted.getUTCDate(), month: shifted.getUTCMonth() + 1, year: shifted.getUTCFullYear() };
}

function calendarDayToIso(day: CalendarDay): string {
  return `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
}
