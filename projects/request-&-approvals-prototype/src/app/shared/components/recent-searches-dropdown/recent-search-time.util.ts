export interface RecentSearchTimeLabel {
  count?: number;
  /** Translation key; when absent, `text` is already formatted. */
  key?: string;
  text?: string;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function recentSearchTimeLabel(searchedAt: number, now: number, locale: string): RecentSearchTimeLabel {
  const elapsed = Math.max(now - searchedAt, 0);
  if (elapsed < MINUTE) {
    return { key: 'common.recentSearches.justNow' };
  }
  if (elapsed < HOUR) {
    return { count: Math.floor(elapsed / MINUTE), key: 'common.timeAgo.minutes' };
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return { count: hours, key: hours === 1 ? 'common.timeAgo.hourSingular' : 'common.timeAgo.hourPlural' };
  }
  if (elapsed < 7 * DAY) {
    const days = Math.floor(elapsed / DAY);
    return { count: days, key: days === 1 ? 'common.timeAgo.daySingular' : 'common.timeAgo.dayPlural' };
  }
  return { text: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(searchedAt) };
}
