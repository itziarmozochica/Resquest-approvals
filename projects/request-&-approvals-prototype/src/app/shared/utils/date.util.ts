import { formatDate } from '@angular/common';

import moment, { type MomentFormatSpecification } from 'moment-timezone';

import { FilterDateRange } from '../layout/filters/date-range/date-range.interface';

const dateTimeStringFormats = {
  dateOnly: 'YYYY-MM-DD',
  hourMinute: 'YYYY-MM-DDTHH:mm',
  hourMinuteSecond: 'YYYY-MM-DDTHH:mm:ss',
} as const;

const timezoneUTC = 'UTC';

// `datetime-local` / ISO shapes browsers may produce (padding, seconds, etc. vary by engine).
const datetimeLocalInputFormats: MomentFormatSpecification = [
  moment.ISO_8601,
  'YYYY-MM-DDTHH:mm:ss.SSS',
  dateTimeStringFormats.hourMinuteSecond,
  dateTimeStringFormats.hourMinute,
  'YYYY-M-DTH:mm:ss.SSS',
  'YYYY-M-DTH:mm:ss',
  'YYYY-M-DTH:mm',
];

export class DateUtil {
  static calculateDateHoursDifference(from: Date, to: Date): number {
    const fromDate = new Date(from.getFullYear(), from.getMonth(), from.getDate(), from.getHours(), from.getMinutes());
    const toDate = new Date(to.getFullYear(), to.getMonth(), to.getDate(), to.getHours(), to.getMinutes());
    const diffInMilliseconds = toDate.getTime() - fromDate.getTime();
    return Math.floor(diffInMilliseconds / (1000 * 60 * 60));
  }

  static dateTimeLocalToUtcIso(localDateTime: string): string {
    const parsedDateTime = moment.tz(localDateTime.trim(), datetimeLocalInputFormats, true, timezoneUTC);
    if (!parsedDateTime.isValid()) {
      throw new RangeError(`Invalid date: ${localDateTime}`);
    }
    return parsedDateTime.utc().toISOString();
  }

  static formatDate(
    date: string | Date,
    dateStyle: 'full' | 'long' | 'medium' | 'short' | undefined = undefined,
    timeStyle: 'full' | 'long' | 'medium' | 'short' | undefined = undefined,
  ): string {
    return new Date(date).toLocaleString('en', {
      dateStyle,
      timeStyle,
    });
  }

  static formatFromISO(date: string, locale: string, format: string): string {
    return formatDate(date, format, locale, this.timezoneFromDate(date));
  }

  static formatInTimezone(date: string | Date, format: string, locale: string, timezone: string): string {
    return formatDate(date, format, locale, moment.tz(date, timezone).format('ZZ'));
  }

  static fromDateTimeInputs(date: string | null, time: string | null): Date | null {
    if (!date || !time) {
      return null;
    }
    const parsed = moment(`${date}T${time}`, dateTimeStringFormats.hourMinute, true);
    return parsed.isValid() ? parsed.toDate() : null;
  }

  static getIntervalOfDays(startsFrom: string | Date, amountOfDays: number, timezone?: string): FilterDateRange {
    const startDateTimeZone = timezone ? moment(startsFrom).tz(timezone) : moment(startsFrom);
    const startDate = startDateTimeZone.clone().format(dateTimeStringFormats.dateOnly);
    const endDate = startDateTimeZone
      .clone()
      .add(amountOfDays - 1, 'day')
      .format(dateTimeStringFormats.dateOnly);
    return { startDate: new Date(startDate), endDate: new Date(endDate) };
  }

  static getIntervalOfDaysWithTimezone(startsFrom: string | Date, amountOfDays: number, cityTimezone: string): FilterDateRange {
    const startDateUTCOffset = moment(startsFrom).utcOffset();
    const startDateUTCOffsetCity = moment(startsFrom).clone().tz(cityTimezone).utcOffset();
    const startFromWithOffset = moment(startsFrom).add(-startDateUTCOffset, 'minute').add(-startDateUTCOffsetCity, 'minute');

    const startsTo = moment(startsFrom).clone();
    const endDateUTCOffset = moment(startsTo).utcOffset();
    const endDateUTCOffsetCity = moment(startsTo).clone().tz(cityTimezone).utcOffset();
    const startsToAtEndOfDay = moment(startsTo)
      .add(-endDateUTCOffset, 'minute')
      .add(-endDateUTCOffsetCity, 'minute')
      .add(amountOfDays, 'day')
      .add(-1, 's');

    return { startDate: startFromWithOffset.toDate(), endDate: startsToAtEndOfDay.toDate() };
  }

  static getNextDays(startsFrom: string, timezone: string): FilterDateRange {
    return this.getIntervalOfDays(startsFrom, 3, timezone);
  }

  static getPreviousDays(endsTo: string, timezone: string): FilterDateRange {
    const startDate = moment(endsTo).tz(timezone).add(-2, 'day').format(dateTimeStringFormats.dateOnly);
    const endDate = moment(endsTo).tz(timezone).format(dateTimeStringFormats.dateOnly);
    return { startDate: new Date(startDate), endDate: new Date(endDate) };
  }

  static isFormatUTC = (date: string) => {
    const format = 'YYYY-MM-DDTHH:mm:ss.000';
    return moment(date, format, true).isValid();
  };

  /**
   * ISO → `YYYY-MM-DDTHH:mm` (no `Z`/offset).
   * `parseZone`: clock in the ISO zone, not browser local.
   */
  static isoToDateTimeLocalString(iso: string): string | null {
    const trimmedIso = iso.trim();
    if (!trimmedIso) {
      return null;
    }
    if (!moment(trimmedIso, moment.ISO_8601, true).isValid()) {
      return null;
    }
    return moment.parseZone(trimmedIso).format(dateTimeStringFormats.hourMinute);
  }

  static prepareDate(date: string, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone): Date {
    let result = new Date(date);
    if (timezone) {
      result = DateUtil.applyTimeZone(result, timezone);
    }
    return result;
  }

  static prepareDateRangeForApiCall(
    startsFrom: Date | null,
    startsTo: Date | null,
    cityTimezone: string,
  ): { startDate: string; endDate: string } {
    const startDateUTCOffset = moment(startsFrom).utcOffset();
    const endDateUTCOffset = moment(startsTo).utcOffset();
    const startDateUTCOffsetCity = moment(startsFrom).clone().tz(cityTimezone).utcOffset();
    const endDateUTCOffsetCity = moment(startsTo).clone().tz(cityTimezone).utcOffset();
    const startFromWithOffset = moment(startsFrom).add(-startDateUTCOffset, 'minute').add(-startDateUTCOffsetCity, 'minute');
    const startsToAtEndOfDay = moment(startsTo)
      .add(-endDateUTCOffset, 'minute')
      .add(-endDateUTCOffsetCity, 'minute')
      .add(1, 'day')
      .add(-1, 's');

    return {
      startDate: startFromWithOffset.format(dateTimeStringFormats.hourMinuteSecond),
      endDate: startsToAtEndOfDay.format(dateTimeStringFormats.hourMinuteSecond),
    };
  }

  static prepareDateRangeForSave(startsFrom: Date, startsTo: Date): { startDate: string; endDate: string } {
    const startDateUTCOffset = moment(startsFrom).utcOffset();
    const endDateUTCOffset = moment(startsTo).utcOffset();

    const startFromWithOffset = moment(startsFrom).add(-startDateUTCOffset, 'minute');

    const startsToAtEndOfDay = moment(startsTo).add(-endDateUTCOffset, 'minute').add(1, 'day').add(-1, 's');

    return {
      startDate: startFromWithOffset.format(dateTimeStringFormats.hourMinuteSecond),
      endDate: startsToAtEndOfDay.format(dateTimeStringFormats.hourMinuteSecond),
    };
  }

  static prepareEndDate(date: string, timezone?: string): Date {
    return DateUtil.getEndOfDay(DateUtil.prepareDate(date, timezone));
  }

  private static getEndOfDay(date: Date): Date {
    return moment(date).add(1, 'day').add(-1, 'milliseconds').toDate();
  }

  private static applyTimeZone(date: Date, timezone: string): Date {
    const timezoneOffset = moment(date).tz(timezone).utcOffset();
    return moment(date).add(-timezoneOffset, 'minute').toDate();
  }

  private static timezoneFromDate(date: string): string {
    const isoUTCIdentifier = 'Z';
    const offsetLookup = date.match(/([+-][0-9][0-9]:[0-9][0-9]|Z$)/);

    if (null === offsetLookup) {
      return timezoneUTC;
    }

    const dateTimezoneOffset = offsetLookup[0];
    if (isoUTCIdentifier === dateTimezoneOffset) {
      return timezoneUTC;
    }

    return dateTimezoneOffset;
  }

  static yearFromISO(date: string): number {
    return parseInt(date.slice(0, 4));
  }

  static getUserTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}
