import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

import moment from 'moment-timezone';

import { getTimeFormatForLocale } from '../../../../shared/utils/time-format.util';

/**
 * A date pipe that automatically detects 12h vs 24h time format based on locale
 * Uses Intl.DateTimeFormat to determine the appropriate time format for each locale
 *
 * Same API as DatePipe with automatic time format detection
 */
@Pipe({
  name: 'ossMomentDate',
  standalone: true,
})
export class OssMomentDatePipe extends DatePipe implements PipeTransform {
  static readonly defaultTimezone = 'Europe/London';
  // @ts-ignore
  transform(
    value: string | Date,
    format: string = 'mediumDate',
    timezone: string = OssMomentDatePipe.defaultTimezone,
    locale?: string,
  ): string | null {
    if (format.includes('HH:mma')) {
      format = format.replace('HH:mma', getTimeFormatForLocale(locale || 'en'));
    }

    let validTimezone: string = timezone;
    if (!timezone || !moment.tz.zone(timezone)) {
      validTimezone = OssMomentDatePipe.defaultTimezone;
    }

    // Guard against values that are not dates (such as the 'products' cart group key)
    const parsedValue = moment(value);
    if (!parsedValue.isValid()) {
      return null;
    }
    const timezoneOffset = parsedValue.tz(validTimezone).format('Z');
    return super.transform(value, format, timezoneOffset, locale);
  }
}
