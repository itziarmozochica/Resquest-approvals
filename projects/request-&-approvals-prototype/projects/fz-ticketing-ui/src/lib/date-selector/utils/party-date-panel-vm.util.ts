import {
  canDecreasePartyMember,
  derivePartyStartTimes,
  isPartyDayAfterSearch,
  toCalendarDay,
  type DaySummary,
  type PartyMember,
  type PartyQuantities,
} from '@fz/ticketing';

import type {
  FztPartyDatePanelVm,
  FztPartyHourPillsVm,
  FztPartyMemberCounterVm,
  FztPartyStartTimePillVm,
} from '../models/party-date-panel-vm.model';
import { formatTimeslotHourLabel } from './date-selector-labels.util';
import { buildDatePillsVm, type FztDatePillsVmParams } from './date-selector-vm.util';

export interface FztPartyDatePanelVmParams extends FztDatePillsVmParams {
  readonly daySummary: DaySummary | null;
  readonly fromDate: string | null;
  readonly hasFetchSettled: boolean;
  readonly hourFilter: string | null;
  readonly isLoadingDates: boolean;
  readonly isLoadingSessions: boolean;
  readonly members: readonly PartyMember[];
  readonly quantities: PartyQuantities;
  readonly searchedAt: number;
  readonly showLoadMore: boolean;
}

export function buildPartyDatePanelVm(params: FztPartyDatePanelVmParams): FztPartyDatePanelVm {
  const datePills = buildDatePillsVm(params);
  const awaitingFetch = !params.hasFetchSettled;

  return {
    datePicker: {
      minDate: venueTodayAsLocalDate(params.searchedAt, params.timeZone),
      startDate: params.fromDate,
      timezone: params.timeZone,
    },
    datePills,
    hourPills: buildPartyHourPillsVm(params),
    loadMore: { isLoading: params.isLoadingDates, isVisible: params.showLoadMore },
    members: partyMembersInPanelOrder(params.members).map((member: PartyMember) => buildMemberCounterVm(member, params.quantities)),
    showDatesRow: datePills.length > 0,
    skeleton: {
      availability: params.isLoadingDates || awaitingFetch,
      dates: params.isLoadingDates || params.isLoadingSessions || awaitingFetch,
      members: params.members.length === 0 && (params.isLoadingSessions || awaitingFetch),
      sessions: params.isLoadingSessions || awaitingFetch,
    },
  };
}

export function partyMembersInPanelOrder(members: readonly PartyMember[]): readonly PartyMember[] {
  return [...members].sort((first: PartyMember, second: PartyMember) =>
    first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }),
  );
}

export type FztPartyHourPillsVmParams = Pick<FztPartyDatePanelVmParams, 'daySummary' | 'hourFilter' | 'searchedAt' | 'timeZone'>;

export function buildPartyHourPillsVm(params: FztPartyHourPillsVmParams): FztPartyHourPillsVm {
  const startTimes = params.daySummary === null ? [] : derivePartyStartTimes(params.daySummary, params.timeZone, params.searchedAt);
  const showNow = params.daySummary === null || !isPartyDayAfterSearch(params.daySummary, params.timeZone, params.searchedAt);

  return {
    isNowSelected: showNow && params.hourFilter === null,
    showNow,
    startTimes: startTimes.map(
      (startTime: string): FztPartyStartTimePillVm => ({
        datetimeKey: startTime,
        isSelected: startTime === params.hourFilter,
        timeLabel: formatTimeslotHourLabel(startTime, params.timeZone),
      }),
    ),
  };
}

function buildMemberCounterVm(member: PartyMember, quantities: PartyQuantities): FztPartyMemberCounterVm {
  return {
    canDecrease: canDecreasePartyMember(quantities, member.key),
    key: member.key,
    name: member.name,
    quantity: quantities[member.key] ?? 0,
  };
}

export function venueTodayAsLocalDate(searchedAt: number, timeZone: string): Date | null {
  const today = toCalendarDay(searchedAt, timeZone);

  return today === null ? null : new Date(today.year, today.month - 1, today.day);
}
