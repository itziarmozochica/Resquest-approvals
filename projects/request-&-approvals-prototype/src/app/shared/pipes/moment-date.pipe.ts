import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

import moment from 'moment-timezone';

/**
 * A moment timezone pipe to support parsing based on time zone abbreviations
 * covers all cases of offset variation due to daylight saving.
 *
 * Same API as DatePipe with additional timezone abbreviation support
 * Official date pipe dropped support for abbreviations names from Angular V5
 */
@Pipe({
  name: 'momentDate',
  standalone: false,
})
export class MomentDatePipe extends DatePipe implements PipeTransform {
  static readonly defaultTimezone = 'Europe/London';
  // @ts-ignore
  transform(value: string | Date, format = 'mediumDate', timezone = MomentDatePipe.defaultTimezone, locale?: string): string | null {
    // Guard against invalid timezone values (undefined, null, empty, or invalid timezone strings like "-")
    let validTimezone: string = timezone;
    if (!timezone || !moment.tz.zone(timezone)) {
      validTimezone = MomentDatePipe.defaultTimezone;
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
