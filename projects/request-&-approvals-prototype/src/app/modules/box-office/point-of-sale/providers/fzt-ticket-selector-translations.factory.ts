import { DestroyRef, type Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { type FztTicketSelectorTranslations } from '@fz/ticketing-ui';
import { TranslateService } from '@ngx-translate/core';
import { map, type Observable } from 'rxjs';

/**
 * `breadcrumbBackAriaLabel` / `breadcrumbHomeAriaLabel` / `pageDotAriaLabel` are deliberately absent:
 * the legacy breadcrumbs and page dots carried no aria labels, so no Phrase key exists for them and
 * the library's English defaults stand until the keys land.
 */
export function resolveFztTicketSelectorTranslations(translate: TranslateService): FztTicketSelectorTranslations {
  return {
    addOns: translate.instant('oneStopShop.tabs.addOns'),
    available: (translate.instant('common.available') as string).toLowerCase(),
    hiddenTicketBadge: translate.instant('boxOffice.hiddenTicketBadge'),
    hiddenTicketsSection: translate.instant('boxOffice.hiddenTicketsSection'),
    memberDiscountLabel: translate.instant('boxOffice.memberships.discounts.label'),
    multiDayUntil: translate.instant('boxOffice.multiDayUntil'),
    originalPriceAriaLabel: translate.instant('boxOffice.memberships.discounts.originalPrice'),
    outOfStock: translate.instant('oneStopShop.tile.outOfStock'),
    partyNoActivitiesDescription: translate.instant('boxOffice.partyMembers.noActivitiesEmptyState.description'),
    partyNoActivitiesTitle: translate.instant('boxOffice.partyMembers.noActivitiesEmptyState.title'),
    partyNoTimeSlotsLeft: translate.instant('boxOffice.partyMembers.noTimeSlotsLeft'),
    partySelectMembersCta: translate.instant('boxOffice.partyMembers.handheld.selectPartyMembersEmptyState.cta'),
    partySelectMembersDescription: translate.instant('boxOffice.partyMembers.selectPartyMembersEmptyState.description'),
    partySelectMembersHandheldDescription: translate.instant('boxOffice.partyMembers.handheld.selectPartyMembersEmptyState.description'),
    partySelectMembersHandheldTitle: translate.instant('boxOffice.partyMembers.handheld.selectPartyMembersEmptyState.title'),
    partySelectMembersTitle: translate.instant('boxOffice.partyMembers.selectPartyMembersEmptyState.title'),
    seating: translate.instant('oneStopShop.tabs.seating'),
    taxesIncluded: translate.instant('boxOffice.taxesIncluded'),
    ticketsAndAddOns: translate.instant('oneStopShop.tabs.ticketsAndAddOns'),
    today: translate.instant('boxOffice.multiDayRelativeDay.today'),
    tomorrow: translate.instant('boxOffice.multiDayRelativeDay.tomorrow'),
    unavailable: translate.instant('oneStopShop.tile.unavailable'),
    yesterday: translate.instant('boxOffice.multiDayRelativeDay.yesterday'),
  };
}

/** `useFactory` for the `FZT_TICKET_SELECTOR_TRANSLATIONS` multi provider registered by `providePointOfSale()`. */
export function fztTicketSelectorTranslationsFactory(
  translate: TranslateService,
  destroyRef: DestroyRef,
): Signal<FztTicketSelectorTranslations> {
  const translations$: Observable<FztTicketSelectorTranslations> = translate.onLangChange.pipe(
    map(() => resolveFztTicketSelectorTranslations(translate)),
    takeUntilDestroyed(destroyRef),
  );

  return toSignal(translations$, { initialValue: resolveFztTicketSelectorTranslations(translate) });
}
