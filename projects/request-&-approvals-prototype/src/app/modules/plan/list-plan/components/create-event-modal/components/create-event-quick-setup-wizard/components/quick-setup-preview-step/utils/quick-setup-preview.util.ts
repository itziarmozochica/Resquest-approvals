import { formatDate } from '@angular/common';

import { ValidationMethod } from '@fz-original/app/modules/event-settings/models/validation-section.enum';
import {
  CalendarDateFrequency,
  CalendarTimeSlotFrequency,
} from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import { sortDateRanges } from '@fz-original/app/modules/inventory/inventory-schedule/utils/schedule-calendar-date-range.util';
import { resolveFilledQuickSetupDateRanges } from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/components/create-event-quick-setup-wizard/components/quick-setup-schedule-step/utils/quick-setup-schedule-date-range.util';
import { QuickSetupInventoryItem } from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-inventory.model';
import {
  QuickSetupPreviewData,
  QuickSetupPreviewInventoryFigures,
  QuickSetupPreviewInventoryGroup,
  QuickSetupPreviewInventoryRow,
  QuickSetupPreviewInventorySource,
  QuickSetupPreviewScheduleSummary,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-preview.model';
import {
  QuickSetupScheduleFormValue,
  QuickSetupScheduleStepFormValue,
  quickSetupWeekdays,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';
import { resolveQuickSetupInventoryItemPrice } from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/utils/resolve-quick-setup-inventory-item-price.util';
import languageCodes from '@fz-original/app/shared/components/language-selector/language-codes';
import { MediaListItem } from '@fz-original/app/shared/models/media/media.model';
import { Venue } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { SessionType } from '@fz-original/app/shared/services/sessions/session-type.model';

export interface QuickSetupPreviewTranslateFn {
  (key: string, params?: Record<string, string | number>): string;
}

export interface BuildQuickSetupPreviewDataParams {
  coverImageUrl?: string | null;
  currency?: string;
  eventName: string;
  inventorySource: QuickSetupPreviewInventorySource;
  locale: string;
  planBaseLocale: string | undefined;
  scheduleFormValue: QuickSetupScheduleStepFormValue;
  translate: QuickSetupPreviewTranslateFn;
  venue: Venue | null;
}

export const formatVenueLabel = (venue: Venue | null): string => {
  if (!venue) {
    return '';
  }

  const locationParts = [venue.address, venue.zipCode, venue.cityName].filter(Boolean);

  if (locationParts.length === 0) {
    return venue.name;
  }

  const locationSuffix = locationParts.join(', ');

  return `${venue.name}, ${locationSuffix}`;
};

export const resolveQuickSetupPreviewCoverUrl = (media: MediaListItem[]): string | null => {
  const cover = media[0];

  if (!cover) {
    return null;
  }

  if (cover.media_type === 'video') {
    return cover.poster ?? null;
  }

  return cover.url || null;
};

export const formatPreviewDate = (isoDate: string, locale: string): string => {
  if (!isoDate) {
    return '';
  }

  const date = new Date(`${isoDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return formatDate(date, 'd MMM yyyy', locale);
};

export const formatPreviewTime = (time: string, locale: string): string => {
  if (!time) {
    return '';
  }

  const [hoursPart, minutesPart] = time.split(':');
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return formatDate(date, 'shortTime', locale);
};

export const formatPrice = (amount: number, currency: string | undefined, locale: string): string => {
  if (!currency) {
    return '';
  }

  return new Intl.NumberFormat(locale, { currency, style: 'currency' }).format(amount);
};

export const resolvePlanLanguageLabel = (baseLocale: string | undefined): string => {
  if (!baseLocale) {
    return '';
  }

  return languageCodes[baseLocale] ?? languageCodes[baseLocale.split('-')[0]] ?? baseLocale;
};

const VALIDATION_METHOD_TRANSLATION_KEYS: Record<ValidationMethod, string> = {
  [ValidationMethod.IN_APP]: 'createEvent.quickSetupWizard.step4.defaultSettings.methodInApp',
  [ValidationMethod.NO_VALIDATION]: 'createEvent.quickSetupWizard.step4.defaultSettings.methodNoValidation',
  [ValidationMethod.PARTNERS_APP]: 'createEvent.quickSetupWizard.step4.defaultSettings.methodPartnersApp',
  [ValidationMethod.THIRD_PARTY]: 'createEvent.quickSetupWizard.step4.defaultSettings.methodThirdParty',
};

export const resolveValidationMethodLabel = (
  validationMethod: ValidationMethod | undefined,
  translate: QuickSetupPreviewTranslateFn,
): string => {
  if (!validationMethod) {
    return '';
  }

  const translationKey = VALIDATION_METHOD_TRANSLATION_KEYS[validationMethod];

  return translationKey ? translate(translationKey) : validationMethod;
};

export const formatExcludedDatesLabel = (dates: string[], locale: string): string | null => {
  const formattedDates = dates.map(date => formatPreviewDate(date, locale)).filter(Boolean);

  if (formattedDates.length === 0) {
    return null;
  }

  return formattedDates.join(' / ');
};

export const formatScheduleDatesLabel = (
  formValue: QuickSetupScheduleFormValue,
  locale: string,
  translate: QuickSetupPreviewTranslateFn,
): string => {
  if (formValue.dateFrequency === CalendarDateFrequency.SingleDates) {
    const dates = formValue.specificDates.map(date => formatPreviewDate(date, locale)).filter(Boolean);

    return dates.join(' / ');
  }

  const dateRangeLabel = sortDateRanges(resolveFilledQuickSetupDateRanges(formValue.dateRanges))
    .map(range => `${formatPreviewDate(range.startDate, locale)} - ${formatPreviewDate(range.endDate, locale)}`)
    .join(' / ');
  const weekdays = formValue.selectedWeekdays
    .slice()
    .sort((left, right) => quickSetupWeekdays.indexOf(left) - quickSetupWeekdays.indexOf(right))
    .map(weekday => translate(`createEvent.quickSetupWizard.step3.weekdays.${weekday}`))
    .join(' / ');

  if (!weekdays) {
    return dateRangeLabel;
  }

  return `${dateRangeLabel} · ${weekdays}`;
};

const formatScheduleDurationLabel = (durationInMinutes: number, translate: QuickSetupPreviewTranslateFn): string => {
  if (!Number.isFinite(durationInMinutes) || durationInMinutes <= 0) {
    return '';
  }

  return translate('createEvent.quickSetupWizard.step4.scheduleTimes.duration', {
    minutes: durationInMinutes,
  });
};

const appendScheduleDurationLabel = (timesLabel: string, durationLabel: string): string => {
  if (!durationLabel) {
    return timesLabel;
  }

  if (!timesLabel) {
    return durationLabel;
  }

  return `${timesLabel} ${durationLabel}`;
};

export const formatScheduleTimesLabel = (
  formValue: QuickSetupScheduleFormValue,
  locale: string,
  translate: QuickSetupPreviewTranslateFn,
): string => {
  const durationLabel = formatScheduleDurationLabel(formValue.durationInMinutes, translate);

  if (formValue.timeSlotFrequency === CalendarTimeSlotFrequency.SingleTimeSlots) {
    const slots = formValue.singleTimeSlots
      .map(slot => formatPreviewTime(slot.startTime, locale))
      .filter(Boolean)
      .join(' / ');

    return appendScheduleDurationLabel(slots, durationLabel);
  }

  const ranges = formValue.recurringRanges
    .map(range => {
      const firstTime = formatPreviewTime(range.firstTime, locale);
      const lastTime = formatPreviewTime(range.lastTime, locale);

      if (!firstTime || !lastTime) {
        return '';
      }

      return translate('createEvent.quickSetupWizard.step4.scheduleTimes.recurringRange', {
        from: firstTime,
        to: lastTime,
      });
    })
    .filter(Boolean);

  const rangesLabel = ranges.join(' / ');

  if (formValue.repeatsEveryMinutes) {
    const repeatsEveryLabel = translate('createEvent.quickSetupWizard.step4.scheduleTimes.repeatsEvery', {
      minutes: formValue.repeatsEveryMinutes,
    });
    const timesLabel = rangesLabel ? `${rangesLabel} ${repeatsEveryLabel}` : repeatsEveryLabel;

    return appendScheduleDurationLabel(timesLabel, durationLabel);
  }

  return appendScheduleDurationLabel(rangesLabel, durationLabel);
};

export const applyPlanCurrencyToPreviewData = (
  preview: QuickSetupPreviewData,
  inventorySource: QuickSetupPreviewInventorySource,
  currency: string | undefined,
  locale: string,
): QuickSetupPreviewData => {
  const { addOns, groups, ungroupedTickets } = buildQuickSetupPreviewInventoryFigures(inventorySource, currency, locale);

  return {
    ...preview,
    addOns,
    groups,
    ungroupedTickets,
  };
};

const mapInventoryRows = (
  items: QuickSetupInventoryItem[],
  currency: string | undefined,
  locale: string,
  idPrefix: string,
): QuickSetupPreviewInventoryRow[] =>
  items.map((item, index) => ({
    id: `${idPrefix}-${index}`,
    maxCapacity: item.max_capacity,
    name: item.name,
    price: formatPrice(resolveQuickSetupInventoryItemPrice(item), currency, locale),
  }));

/**
 * Rows for a resumed plan whose inventory was configured before the wizard was reopened.
 * The session-types inventory carries no per-row capacity and may carry no price, so both degrade
 * on their own instead of being coerced to `0`.
 */
const mapSessionTypeRows = (
  sessionTypes: SessionType[],
  currency: string | undefined,
  locale: string,
  idPrefix: string,
): QuickSetupPreviewInventoryRow[] =>
  sessionTypes.map(sessionType => ({
    id: `${idPrefix}-${sessionType.id}`,
    maxCapacity: sessionType.defaultCapacity ?? null,
    name: sessionType.label,
    price: sessionType.basePrice == null ? '' : formatPrice(sessionType.basePrice, currency, locale),
  }));

export const buildQuickSetupPreviewInventoryFigures = (
  inventorySource: QuickSetupPreviewInventorySource,
  currency: string | undefined,
  locale: string,
): QuickSetupPreviewInventoryFigures => {
  if (inventorySource.kind === 'inventoryPayload') {
    const { payload } = inventorySource;

    return {
      addOns: mapInventoryRows(payload.add_ons, currency, locale, 'addon'),
      groups: payload.capacity_groups.map(
        (group, index): QuickSetupPreviewInventoryGroup => ({
          id: `group-${index}`,
          maxCapacity: group.max_capacity,
          name: group.name,
          tickets: mapInventoryRows(group.tickets, currency, locale, `ticket-${index}`),
        }),
      ),
      ungroupedTickets: mapInventoryRows(payload.ungrouped_tickets, currency, locale, 'ungrouped-ticket'),
    };
  }

  const { inventory } = inventorySource;
  const addOnSessionTypes = inventory.sessionTypes.filter(sessionType => sessionType.isAddOn);
  const ticketSessionTypes = inventory.sessionTypes.filter(sessionType => !sessionType.isAddOn);

  return {
    addOns: mapSessionTypeRows(addOnSessionTypes, currency, locale, 'addon'),
    groups: inventory.sessionTypeGroups.map(
      (group): QuickSetupPreviewInventoryGroup => ({
        id: `group-${group.id}`,
        maxCapacity: group.defaultCapacity ?? null,
        name: group.name,
        tickets: mapSessionTypeRows(
          ticketSessionTypes.filter(sessionType => sessionType.groups.some(ticketGroup => ticketGroup.id === group.id)),
          currency,
          locale,
          'ticket',
        ),
      }),
    ),
    ungroupedTickets: mapSessionTypeRows(
      ticketSessionTypes.filter(sessionType => sessionType.groups.length === 0),
      currency,
      locale,
      'ticket',
    ),
  };
};

export const buildQuickSetupPreviewScheduleSummary = (
  scheduleFormValue: QuickSetupScheduleFormValue,
  locale: string,
  translate: QuickSetupPreviewTranslateFn,
): QuickSetupPreviewScheduleSummary => ({
  datesLabel: formatScheduleDatesLabel(scheduleFormValue, locale, translate),
  excludedDatesLabel: formatExcludedDatesLabel(scheduleFormValue.excludedDates, locale),
  name: scheduleFormValue.name,
  timesLabel: formatScheduleTimesLabel(scheduleFormValue, locale, translate),
});

export const buildQuickSetupPreviewData = (params: BuildQuickSetupPreviewDataParams): QuickSetupPreviewData => ({
  ...buildQuickSetupPreviewInventoryFigures(params.inventorySource, params.currency, params.locale),
  coverImageUrl: params.coverImageUrl ?? null,
  eventName: params.eventName,
  planLanguageLabel: resolvePlanLanguageLabel(params.planBaseLocale),
  schedules: params.scheduleFormValue.schedules.map(schedule =>
    buildQuickSetupPreviewScheduleSummary(schedule, params.locale, params.translate),
  ),
  validationMethodLabel: '',
  venueLabel: formatVenueLabel(params.venue),
});
