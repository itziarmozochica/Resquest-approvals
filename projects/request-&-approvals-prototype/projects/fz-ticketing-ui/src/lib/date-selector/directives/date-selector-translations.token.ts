import { InjectionToken, type Signal } from '@angular/core';

import type { FztDateSelectorTranslations } from '../models/date-selector-translations.model';

export const DEFAULT_FZT_DATE_SELECTOR_TRANSLATIONS: Required<FztDateSelectorTranslations> = {
  afternoon: 'Afternoon',
  afternoonHours: '15:00 to 18:59',
  clearPartyMembersLabel: 'Clear',
  decreasePartyMemberAriaLabel: 'Remove one {{member}}',
  evening: 'Evening',
  eveningHours: '19:00 to 21:59',
  increasePartyMemberAriaLabel: 'Add one {{member}}',
  loadMoreAriaLabel: 'Load more dates',
  morning: 'Morning',
  morningHours: '7:00 to 14:59',
  night: 'Night',
  nightHours: '22:00 to 6:59',
  noSessionsAvailable: "This event doesn't have any sessions available",
  now: 'Now',
  selectADate: 'Select a date',
  selectPartyMembersLabel: 'Select the party members:',
  selectTheDateLabel: 'Select the date:',
  sellingTicketsFor: 'Selling tickets for:',
  showAvailabilityFromLabel: 'Show availability from...',
  today: 'Today',
  toggleRangeAriaLabel: 'Toggle time range',
  tomorrow: 'Tomorrow',
};

/**
 * Provide a `Signal<FztDateSelectorTranslations>` with any subset of keys, `multi: true`.
 * Merged with priority to the lowest level — see `FztDateSelectorTranslationsDirective`.
 */
export const FZT_DATE_SELECTOR_TRANSLATIONS = new InjectionToken<Signal<FztDateSelectorTranslations>>('FZT_DATE_SELECTOR_TRANSLATIONS');
