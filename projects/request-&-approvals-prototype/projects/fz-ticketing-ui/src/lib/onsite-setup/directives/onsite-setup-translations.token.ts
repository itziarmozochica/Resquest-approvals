import { InjectionToken, type Signal } from '@angular/core';

import type { FztOnsiteSetupTranslations } from '../models/onsite-setup-translations.model';

/** English copy, verbatim from the `oneStopShop.onsiteSetupModal.*` and `oneStopShop.search.close` keys of the host app's `en.json`. */
export const DEFAULT_FZT_ONSITE_SETUP_TRANSLATIONS: Required<FztOnsiteSetupTranslations> = {
  activeShiftMessage: 'You have an opened shift, to change the onsite setup, please close the active shift first',
  closeSearch: 'Close search',
  greetingsSubtitle: "Please select where you're working from today.",
  greetingsTitle: 'Hello {{userName}},',
  recent: 'Recent',
  search: 'Search',
  searchVenue: 'Search venues',
  searchVenuePlaceholder: 'Write the venue name',
  selectOnsiteSetup: 'And now, select your setup',
  selectVenue: 'First, let’s select the venue',
  title: 'Select your setup',
};

/**
 * Provide a `Signal<FztOnsiteSetupTranslations>` with any subset of keys, `multi: true`.
 * Merged with priority to the lowest level — see `FztOnsiteSetupTranslationsDirective`.
 */
export const FZT_ONSITE_SETUP_TRANSLATIONS = new InjectionToken<Signal<FztOnsiteSetupTranslations>>('FZT_ONSITE_SETUP_TRANSLATIONS');
