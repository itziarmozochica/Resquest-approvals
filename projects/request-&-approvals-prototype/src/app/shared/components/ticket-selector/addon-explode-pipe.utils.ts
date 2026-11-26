/**
 * TEMPORARY WORKAROUND - PARK-1407.
 *
 * These utilities support the provisional behaviour where add-ons that are
 * independent of explode-pipe levels (no '|' in their name) are shown across
 * all levels, preserving their counter values when the user switches level.
 *
 * Controlled by the Optimizely FF `addons_independent_from_explode_pipe`.
 */
import { AbstractControl } from '@angular/forms';

import { RegularSessionAvailabilitySummaryByDate } from '../../models/session-availability/regular-session-availability-summary-by-date.model';
import { TicketType } from '../../models/ticket-type/ticket-type.model';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyFeatureKeyDef } from '../../optimizely/optimizely-feature-key';

export const ADDONS_INDEPENDENT_FROM_EXPLODE_PIPE_FEATURE: OptimizelyFeatureKeyDef = {
  optimizelyFeatureKey: FeatureFlags.ADDONS_INDEPENDENT_FROM_EXPLODE_PIPE,
  team: 'parks',
};

export function isIndependentAddon(ticketType: TicketType): boolean {
  return ticketType.isAddon && !ticketType.name.includes('|');
}

export function separateIndependentAddons(ticketTypes: TicketType[]): TicketType[] {
  return ticketTypes.filter(isIndependentAddon);
}

export function filterTicketTypesForLevel(ticketTypes: TicketType[]): TicketType[] {
  return ticketTypes.filter(ticketType => !isIndependentAddon(ticketType));
}

function isGlobalAddonOnlyTicketTypes(ticketTypes: TicketType[]): boolean {
  return ticketTypes.length > 0 && ticketTypes.every(isIndependentAddon);
}

function isIndependentAddonSession(session: { name: string; sessionType?: { isAddOn?: boolean } }): boolean {
  return !!session.sessionType?.isAddOn && !session.name.includes('|');
}

function isAvailabilityDateSummary(value: unknown): value is RegularSessionAvailabilitySummaryByDate {
  return value instanceof RegularSessionAvailabilitySummaryByDate;
}

function filterGlobalAddonOnlyAvailabilityDates(
  dates: RegularSessionAvailabilitySummaryByDate[],
): RegularSessionAvailabilitySummaryByDate[] {
  return dates
    .map(dateSummary => {
      const filteredDatetimes = dateSummary.sessionAvailabilityByDatetimeList.filter(datetimeSummary =>
        datetimeSummary.sessionAvailabilityList.some(session => !isIndependentAddonSession(session)),
      );
      if (filteredDatetimes.length === 0) {
        return null;
      }
      if (filteredDatetimes.length === dateSummary.sessionAvailabilityByDatetimeList.length) {
        return dateSummary;
      }
      return new RegularSessionAvailabilitySummaryByDate(
        dateSummary.date,
        dateSummary.timezone,
        filteredDatetimes,
        dateSummary.venueId,
        dateSummary.groupingMode,
      );
    })
    .filter((date): date is RegularSessionAvailabilitySummaryByDate => date !== null);
}

export function filterOutGlobalAddonOnlySessions(ticketTypes: TicketType[]): TicketType[];
export function filterOutGlobalAddonOnlySessions(
  dates: RegularSessionAvailabilitySummaryByDate[],
): RegularSessionAvailabilitySummaryByDate[];
export function filterOutGlobalAddonOnlySessions(
  input: TicketType[] | RegularSessionAvailabilitySummaryByDate[],
): TicketType[] | RegularSessionAvailabilitySummaryByDate[] {
  if (input.length === 0) {
    return input;
  }

  if (isAvailabilityDateSummary(input[0])) {
    return filterGlobalAddonOnlyAvailabilityDates(input as RegularSessionAvailabilitySummaryByDate[]);
  }

  const ticketTypes = input as TicketType[];
  return isGlobalAddonOnlyTicketTypes(ticketTypes) ? [] : ticketTypes;
}

export function getAddonCounterValues(
  addonTicketTypes: TicketType[],
  getControl: (name: string) => AbstractControl | null,
): Map<string, string> {
  const values = new Map<string, string>();
  addonTicketTypes.forEach(addon => {
    const sessionId = addon.sessionId?.toString() ?? '';
    if (sessionId === '') {
      return;
    }
    const control = getControl(sessionId);
    if (control?.value) {
      values.set(sessionId, control.value);
    }
  });
  return values;
}

export function restoreAddonCounterValues(values: Map<string, string>, getControl: (name: string) => AbstractControl | null): void {
  values.forEach((value, sessionId) => {
    const control = getControl(sessionId);
    if (control) {
      control.setValue(value, { emitEvent: false });
    }
  });
}
