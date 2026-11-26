import { inject, Pipe, PipeTransform } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

/**
 * Formats a `Date` as a localized relative time ("2 hours ago", "in 3 days") using
 * `Intl.RelativeTimeFormat`. Returns an empty string for an invalid date: a malformed backend
 * timestamp yields `NaN`, and `Intl.RelativeTimeFormat.format(NaN)` throws a `RangeError`, so the
 * guard keeps a bad value from crashing the render.
 */
@Pipe({ name: 'relativeTime', standalone: true })
export class RelativeTimePipe implements PipeTransform {
  readonly #translate = inject(TranslateService);

  transform(date: Date): string {
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const diff = date.getTime() - Date.now();
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat(this.#translate.currentLang ?? 'en', { numeric: 'auto' });

    if (abs < 60_000) return rtf.format(Math.round(diff / 1000), 'second');
    if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
    if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
    if (abs < 2_592_000_000) return rtf.format(Math.round(diff / 86_400_000), 'day');
    if (abs < 31_536_000_000) return rtf.format(Math.round(diff / 2_592_000_000), 'month');
    return rtf.format(Math.round(diff / 31_536_000_000), 'year');
  }
}
