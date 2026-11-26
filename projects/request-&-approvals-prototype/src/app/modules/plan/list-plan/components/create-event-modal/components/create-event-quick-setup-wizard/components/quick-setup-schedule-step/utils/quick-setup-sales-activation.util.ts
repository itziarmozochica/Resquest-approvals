import {
  CalendarSalesActivationConfig,
  CalendarSalesActivationType,
} from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';
import {
  QUICK_SETUP_SALES_ACTIVATION_DATE_TIME_FORMAT,
  QuickSetupSalesActivationFormValue,
  QuickSetupSalesWindowFormValue,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';
import moment, { Moment } from 'moment-timezone';

export const parseQuickSetupNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

export const parseQuickSetupSalesActivationDateTime = (value: string, timezone: string): Moment | null => {
  if (!value) {
    return null;
  }

  const parsed = moment.tz(value, QUICK_SETUP_SALES_ACTIVATION_DATE_TIME_FORMAT, true, timezone);

  return parsed.isValid() ? parsed : null;
};

export const formatQuickSetupSalesActivationNow = (timezone: string): string =>
  moment.tz(timezone).format(QUICK_SETUP_SALES_ACTIVATION_DATE_TIME_FORMAT);

const toUtcIso = (window: QuickSetupSalesWindowFormValue, timezone: string): string | null => {
  if (window.type !== CalendarSalesActivationType.FixedDate) {
    return null;
  }

  return parseQuickSetupSalesActivationDateTime(window.fixedDateTime, timezone)?.utc().toISOString() ?? null;
};

const isRelative = (window: QuickSetupSalesWindowFormValue): boolean => window.type === CalendarSalesActivationType.RelativeTo;

export const toQuickSetupSalesActivationConfig = (
  { end, start }: QuickSetupSalesActivationFormValue,
  timezone: string,
): CalendarSalesActivationConfig => ({
  deltaEnd: isRelative(end) ? end.delta : null,
  deltaEndReference: isRelative(end) ? end.deltaReference : null,
  deltaEndTimeUnit: isRelative(end) ? end.deltaTimeUnit : null,
  deltaStart: isRelative(start) ? start.delta : null,
  deltaStartReference: isRelative(start) ? start.deltaReference : null,
  deltaStartTimeUnit: isRelative(start) ? start.deltaTimeUnit : null,
  endDatetime: toUtcIso(end, timezone),
  salesActivationEndType: end.type,
  salesActivationStartType: start.type,
  startDatetime: toUtcIso(start, timezone),
});
