import { DestroyRef, type Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { type FztDateSelectorTranslations } from '@fz/ticketing-ui';
import { TranslateService } from '@ngx-translate/core';
import { map, type Observable } from 'rxjs';

/**
 * `loadMoreAriaLabel` / `toggleRangeAriaLabel` are deliberately absent: no Phrase key exists
 * for them yet, so the library's English defaults stand until the keys land. The two party counter
 * aria labels are read without parameters, so their `{{member}}` placeholder reaches the library,
 * which fills it per member.
 */
export function resolveFztDateSelectorTranslations(translate: TranslateService): FztDateSelectorTranslations {
  return {
    afternoon: translate.instant('boxOffice.afternoon'),
    afternoonHours: translate.instant('boxOffice.afternoonHours'),
    clearPartyMembersLabel: translate.instant('boxOffice.partyMembers.clear'),
    decreasePartyMemberAriaLabel: translate.instant('boxOffice.partyMembers.decreaseMember'),
    evening: translate.instant('boxOffice.evening'),
    eveningHours: translate.instant('boxOffice.eveningHours'),
    increasePartyMemberAriaLabel: translate.instant('boxOffice.partyMembers.increaseMember'),
    morning: translate.instant('boxOffice.morning'),
    morningHours: translate.instant('boxOffice.morningHours'),
    night: translate.instant('boxOffice.night'),
    nightHours: translate.instant('boxOffice.nightHours'),
    noSessionsAvailable: translate.instant('boxOffice.noSessionsAvailable'),
    now: translate.instant('boxOffice.partyMembers.now'),
    selectADate: translate.instant('boxOffice.partyMembers.handheld.selectADate'),
    selectPartyMembersLabel: translate.instant('boxOffice.partyMembers.selectPartyMembers'),
    selectTheDateLabel: translate.instant('boxOffice.partyMembers.selectDate'),
    sellingTicketsFor: translate.instant('boxOffice.partyMembers.handheld.sellingTicketsFor'),
    showAvailabilityFromLabel: translate.instant('reservations.showAvailabilityFrom'),
    today: translate.instant('boxOffice.partyMembers.handheld.today'),
    tomorrow: translate.instant('boxOffice.partyMembers.handheld.tomorrow'),
  };
}

/** `useFactory` for the `FZT_DATE_SELECTOR_TRANSLATIONS` multi provider registered by `providePointOfSale()`. */
export function fztDateSelectorTranslationsFactory(
  translate: TranslateService,
  destroyRef: DestroyRef,
): Signal<FztDateSelectorTranslations> {
  const translations$: Observable<FztDateSelectorTranslations> = translate.onLangChange.pipe(
    map(() => resolveFztDateSelectorTranslations(translate)),
    takeUntilDestroyed(destroyRef),
  );

  return toSignal(translations$, { initialValue: resolveFztDateSelectorTranslations(translate) });
}
