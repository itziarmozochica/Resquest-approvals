import { Pipe, type PipeTransform } from '@angular/core';

import { calendarDayToUtcMs, relativeCalendarDay, toCalendarDay, type CalendarDay } from '@fz/ticketing';

import type { ResolvedFztTicketSelectorTranslations } from '../models/ticket-selector-translations.model';
import type { FztMultiDayRange } from '../models/ticket-selector-vm.model';

const monthFormatters = new Map<string, Intl.DateTimeFormat>();

@Pipe({ name: 'fztMultiDayRange' })
export class FztMultiDayRangePipe implements PipeTransform {
  transform(range: FztMultiDayRange | null, translations: ResolvedFztTicketSelectorTranslations): string | null {
    if (range === null) {
      return null;
    }

    const today = toCalendarDay(Date.now(), range.timeZone);
    const end = toCalendarDay(range.endsAt, range.timeZone);

    if (today === null || end === null) {
      return null;
    }

    return translations.multiDayUntil.replace('{{end}}', labelFor(end, today, range.locale, translations));
  }
}

function labelFor(day: CalendarDay, today: CalendarDay, locale: string, translations: ResolvedFztTicketSelectorTranslations): string {
  const relativeDay = relativeCalendarDay(day, today);

  return relativeDay === null ? formatDayLabel(day, locale) : translations[relativeDay];
}

/** "27 Aug 2027": day, the locale's short month, year. */
function formatDayLabel(day: CalendarDay, locale: string): string {
  return `${day.day} ${getMonthFormatter(locale).format(calendarDayToUtcMs(day))} ${day.year}`;
}

function getMonthFormatter(locale: string): Intl.DateTimeFormat {
  let formatter = monthFormatters.get(locale);

  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locale.length > 0 ? locale : undefined, { month: 'short', timeZone: 'UTC' });
    monthFormatters.set(locale, formatter);
  }

  return formatter;
}
