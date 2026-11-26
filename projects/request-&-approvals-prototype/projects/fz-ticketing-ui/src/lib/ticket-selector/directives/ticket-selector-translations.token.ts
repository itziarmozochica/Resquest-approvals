import { InjectionToken, type Signal } from '@angular/core';

import type { FztTicketSelectorTranslations } from '../models/ticket-selector-translations.model';

/** English copy, verbatim from the `oneStopShop.*` / `boxOffice.*` / `common.*` keys of the host app's `en.json`. */
export const DEFAULT_FZT_TICKET_SELECTOR_TRANSLATIONS: Required<FztTicketSelectorTranslations> = {
  addOns: 'Add-ons',
  available: 'available',
  breadcrumbBackAriaLabel: 'Back',
  breadcrumbHomeAriaLabel: 'Home',
  hiddenTicketBadge: 'Hidden',
  hiddenTicketsSection: 'Hidden ticket types: not visible to the public',
  memberDiscountLabel: 'Member benefit',
  multiDayUntil: 'Until {{end}}',
  originalPriceAriaLabel: 'Original price',
  outOfStock: 'Out of stock',
  pageDotAriaLabel: 'Go to page {page}',
  partyNoActivitiesDescription: 'Please select another time slot.',
  partyNoActivitiesTitle: 'No activities available',
  partyNoTimeSlotsLeft: 'No time slots left.',
  partySelectMembersCta: 'Select party members',
  partySelectMembersDescription: 'To see the availability, please select the Party members first.',
  partySelectMembersHandheldDescription: "Choose who's coming to see the available activities.",
  partySelectMembersHandheldTitle: 'Who is coming?',
  partySelectMembersTitle: 'Select Party Members',
  seating: 'Seating map',
  taxesIncluded: 'Taxes included',
  ticketsAndAddOns: 'Tickets & Add-Ons',
  today: 'today',
  tomorrow: 'tomorrow',
  unavailable: 'Unavailable',
  yesterday: 'yesterday',
};

/**
 * Provide a `Signal<FztTicketSelectorTranslations>` with any subset of keys, `multi: true`.
 * Merged with priority to the lowest level — see `FztTicketSelectorTranslationsDirective`.
 */
export const FZT_TICKET_SELECTOR_TRANSLATIONS = new InjectionToken<Signal<FztTicketSelectorTranslations>>(
  'FZT_TICKET_SELECTOR_TRANSLATIONS',
);
