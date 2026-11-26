/**
 * Returns the Angular DatePipe-style time format string for a locale (12h or 24h).
 * Uses Intl.DateTimeFormat to detect whether the locale uses day period (AM/PM).
 */
export function getTimeFormatForLocale(locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
  const hasDayPeriod = formatter.formatToParts(new Date()).some(part => part.type === 'dayPeriod');
  return hasDayPeriod ? 'h:mm a' : 'HH:mm';
}
