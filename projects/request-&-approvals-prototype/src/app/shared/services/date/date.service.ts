import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { MomentDatePipe } from '../../pipes/moment-date.pipe';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  static readonly DEFAULT_FORMAT = 'mediumDate';
  static readonly DEFAULT_LOCALE = 'en-US';
  static readonly DEFAULT_TIMEZONE = 'utc';
  static readonly ISO_FORMAT = 'yyyy-MM-dd';
  static readonly MS_ONE_HOUR = 60000;
  static readonly MS_ONE_MONTH = 2592000000;
  static readonly MS_ONE_WEEK = 604800000;
  #translateService = inject(TranslateService);

  currentDateInTimezone(timezone: string): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
  }

  dateWithFormat(date?: Date, format?: string, timezone?: string): string | null {
    return this.#formatDate(date, this.#translateService.currentLang, format, timezone);
  }

  isDateRangeThisMonth(fromDate: Date, toDate: Date): boolean {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getMonth() === 12 ? 31 : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
    );
    const isFromThisMonth =
      fromDate.getDate() === firstDayOfMonth.getDate() &&
      fromDate.getMonth() === firstDayOfMonth.getMonth() &&
      fromDate.getFullYear() === firstDayOfMonth.getFullYear();
    const isToThisMonth =
      toDate.getDate() === lastDayOfMonth.getDate() &&
      toDate.getMonth() === lastDayOfMonth.getMonth() &&
      toDate.getFullYear() === lastDayOfMonth.getFullYear();

    return isFromThisMonth && isToThisMonth;
  }

  isDateRangeThisWeek(fromDate: Date, toDate: Date): boolean {
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    const isFromThisWeek =
      fromDate.getDate() === startOfWeek.getDate() &&
      fromDate.getMonth() === startOfWeek.getMonth() &&
      fromDate.getFullYear() === startOfWeek.getFullYear();
    const isToThisWeek =
      toDate.getDate() === endOfWeek.getDate() &&
      toDate.getMonth() === endOfWeek.getMonth() &&
      toDate.getFullYear() === endOfWeek.getFullYear();

    return isFromThisWeek && isToThisWeek;
  }

  isDateRangeThreeMonths(fromDate: Date, toDate: Date): boolean {
    const today = new Date();
    const threeMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
    const isFromThreeMonths =
      fromDate.getDate() === today.getDate() && fromDate.getMonth() === today.getMonth() && fromDate.getFullYear() === today.getFullYear();
    const isToThreeMonths =
      toDate.getDate() === threeMonthsFromNow.getDate() &&
      toDate.getMonth() === threeMonthsFromNow.getMonth() &&
      toDate.getFullYear() === threeMonthsFromNow.getFullYear();

    return isFromThreeMonths && isToThreeMonths;
  }

  isDateRangeToday(fromDate: Date, toDate: Date): boolean {
    const isFromToday =
      fromDate.getDate() === new Date().getDate() &&
      fromDate.getMonth() === new Date().getMonth() &&
      fromDate.getFullYear() === new Date().getFullYear();
    const isToToday =
      toDate.getDate() === new Date().getDate() &&
      toDate.getMonth() === new Date().getMonth() &&
      toDate.getFullYear() === new Date().getFullYear();

    return isFromToday && isToToday;
  }

  toISODateFormat(date?: Date): string | null {
    return this.#formatDate(date, DateService.DEFAULT_LOCALE, DateService.ISO_FORMAT, DateService.DEFAULT_TIMEZONE);
  }

  #formatDate(date?: Date, locale?: string, format?: string, timezone?: string): string | null {
    const datePipe = new MomentDatePipe(locale || DateService.DEFAULT_LOCALE);

    return datePipe.transform(date || Date(), format || DateService.DEFAULT_FORMAT, timezone || DateService.DEFAULT_TIMEZONE);
  }
}
