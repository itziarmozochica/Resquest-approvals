import { InjectionToken, type Signal } from '@angular/core';

import type { IgntTableTranslations } from './ignt-table-translations';

/** Default copy for table UI. Used when no provider overrides. */
export const DEFAULT_TABLE_TRANSLATIONS: Required<IgntTableTranslations> = {
  clearAllLabel: 'Clear all',
  emptyMessage: 'No data',
  filterActiveButtonLabel: (count: number) => `Filters | ${count} active`,
  filterLabel: 'Filters',
  interactiveRowAriaLabel: (num: number) => `Row ${num}`,
  paginationOf: ({ from, to, total }) => `${from} - ${to} of ${total}`,
  searchHelperText: '',
  searchLabel: 'Search by',
  seeLess: 'See less',
  seeMore: 'See more',
  sortColumnAriaLabel: ({ column, direction }) => `Sort by ${column}, ${direction}`,
};

/**
 * Injection token for table translations. Provide a `Signal<IgntTableTranslations>` with any subset of keys.
 * When defined at multiple levels (use multi: true), literals are merged with priority to the lowest level (closest to the table).
 */
export const IGNT_TABLE_TRANSLATIONS = new InjectionToken<Signal<IgntTableTranslations>>('IGNT_TABLE_TRANSLATIONS');
